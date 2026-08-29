const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// On Windows, tfjs-node's installer can leave tensorflow.dll in deps/lib rather
// than beside the native addon. Add that directory to the DLL search path.
if (process.platform === 'win32') {
  const tfjsPackageRoot = path.dirname(
    require.resolve('@tensorflow/tfjs-node/package.json'),
  );
  process.env.PATH = `${path.join(tfjsPackageRoot, 'deps', 'lib')};${process.env.PATH || ''}`;
}

const tf = require('@tensorflow/tfjs-node');

// image_dataset_from_directory assigns indices in alphanumeric directory order.
const CLASS_NAMES = Object.freeze(['angry', 'happy', 'relaxed', 'sad']);

class ModelService {
  constructor(modelPath) {
    this.modelPath = modelPath;
    this.model = null;
    this.loadingPromise = null;
    this.loadError = null;
  }

  get status() {
    if (this.model) return 'ready';
    if (this.loadingPromise) return 'loading';
    if (this.loadError) return 'error';
    return 'not_loaded';
  }

  async load() {
    if (this.model) return this.model;
    if (this.loadingPromise) return this.loadingPromise;

    this.loadingPromise = this.#loadModel();

    try {
      this.model = await this.loadingPromise;
      this.loadError = null;
      return this.model;
    } catch (error) {
      this.loadError = error;
      throw error;
    } finally {
      this.loadingPromise = null;
    }
  }

  async #loadModel() {
    if (!fs.existsSync(this.modelPath)) {
      throw new Error(
        `TensorFlow.js model not found at ${this.modelPath}. Convert the Keras model first.`,
      );
    }

    const modelUrl = pathToFileURL(this.modelPath).href;
    const model = await tf.loadLayersModel(modelUrl);

    // Warm up TensorFlow once so the first real request is not unusually slow.
    const warmupInput = tf.zeros([1, 224, 224, 3]);
    const warmupOutput = model.predict(warmupInput);
    await warmupOutput.data();
    tf.dispose([warmupInput, warmupOutput]);

    return model;
  }

  async predict(imageBuffer) {
    const model = await this.load();

    let image;
    let input;
    let output;

    try {
      image = tf.node.decodeImage(imageBuffer, 3);
      input = tf.tidy(() => {
        const resizedRgb = tf.image
          .resizeBilinear(image, [224, 224], true)
          .toFloat();
        const bgr = tf.reverse(resizedRgb, [-1]);
        const channelMeans = tf.tensor1d([103.939, 116.779, 123.68]);
        return bgr.sub(channelMeans).expandDims(0);
      });

      // The deployment model excludes Keras 3 preprocessing operations that
      // TensorFlow.js cannot deserialize, so ResNet50 preprocessing happens here.
      output = model.predict(input);
      const scores = Array.from(await output.data());

      if (scores.length !== CLASS_NAMES.length) {
        throw new Error(
          `Expected ${CLASS_NAMES.length} model outputs, received ${scores.length}.`,
        );
      }

      const probabilities = CLASS_NAMES.map((label, index) => ({
        label,
        probability: scores[index],
      })).sort((a, b) => b.probability - a.probability);

      return {
        prediction: probabilities[0].label,
        confidence: probabilities[0].probability,
        probabilities,
      };
    } catch (error) {
      if (/decode|image|jpeg|png|gif|bmp/i.test(error.message)) {
        const invalidImageError = new Error('The uploaded file is not a valid image.');
        invalidImageError.statusCode = 400;
        throw invalidImageError;
      }
      throw error;
    } finally {
      tf.dispose([image, input, output].filter(Boolean));
    }
  }
}

module.exports = { CLASS_NAMES, ModelService };
