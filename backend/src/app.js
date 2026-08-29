const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const multer = require('multer');

const config = require('./config');

const allowedImageTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/gif',
]);

function createApp(options = {}) {
  // Load the native TensorFlow binding only when the real service is needed.
  // This keeps API tests lightweight when a fake service is injected.
  const modelService = options.modelService || new (require('./model-service').ModelService)(config.modelPath);
  const app = express();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: config.maxImageSizeBytes, files: 1 },
    fileFilter: (_request, file, callback) => {
      if (!allowedImageTypes.has(file.mimetype)) {
        const error = new Error('Only JPEG, PNG, WebP, BMP, or GIF images are allowed.');
        error.statusCode = 400;
        callback(error);
        return;
      }
      callback(null, true);
    },
  });

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_request, response) => {
    const status = modelService.status;
    response.status(status === 'error' ? 503 : 200).json({
      status: status === 'ready' ? 'ok' : 'starting',
      model: status,
    });
  });

  app.post('/api/predict', upload.single('image'), async (request, response, next) => {
    if (!request.file) {
      response.status(400).json({ error: 'Upload an image using the "image" form field.' });
      return;
    }

    try {
      const result = await modelService.predict(request.file.buffer);
      response.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.use((_request, response) => {
    response.status(404).json({ error: 'Route not found.' });
  });

  app.use((error, _request, response, _next) => {
    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      response.status(413).json({ error: 'The uploaded image is too large.' });
      return;
    }

    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error(error);
    response.status(statusCode).json({
      error: statusCode >= 500 ? 'Prediction failed.' : error.message,
    });
  });

  return app;
}

module.exports = { createApp };
