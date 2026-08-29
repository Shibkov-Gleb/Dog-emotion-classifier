# Dog emotion classifier API

Express API that runs the trained Keras model through TensorFlow.js for Node.

## 1. Convert the Keras model

TensorFlow.js cannot load `.keras` or `.h5` files directly. From a Python
environment with TensorFlow and `tensorflowjs` installed, run this from the
repository root:

```bash
pip install tensorflowjs
tensorflowjs_converter \
  --input_format=keras \
  ml-training/saved_models/dog_emotion_resnet50.h5 \
  ml-training/saved_models/tfjs
```

The output directory should contain `model.json` and one or more `.bin` weight
files. Do not rename or separate those files. Docker Compose performs this step
automatically with its `model-converter` service.

## 2. Run the API

```bash
cd backend
copy .env.example .env
npm install
npm run dev
```

The default frontend origin is `http://localhost:3000`. Change `CORS_ORIGIN`
in `.env` if the Next.js app uses another origin.

## API

### `GET /api/health`

Returns API and model-loading state.

### `POST /api/predict`

Send `multipart/form-data` with an image in the `image` field:

```bash
curl -X POST http://localhost:4000/api/predict \
  -F "image=@dog.jpg"
```

Example response:

```json
{
  "prediction": "happy",
  "confidence": 0.91,
  "probabilities": [
    { "label": "happy", "probability": 0.91 },
    { "label": "relaxed", "probability": 0.05 },
    { "label": "sad", "probability": 0.03 },
    { "label": "angry", "probability": 0.01 }
  ]
}
```

The label order is `angry`, `happy`, `relaxed`, `sad`, matching Keras's
alphabetical directory ordering. If the training directory names differed,
update `CLASS_NAMES` in `src/model-service.js` before using predictions.
