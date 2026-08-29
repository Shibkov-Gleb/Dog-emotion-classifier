const path = require('node:path');

require('dotenv').config();

const backendRoot = path.resolve(__dirname, '..');

function parsePositiveNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

module.exports = {
  port: parsePositiveNumber(process.env.PORT, 4000),
  modelPath: path.resolve(
    backendRoot,
    process.env.MODEL_PATH || '../ml-training/saved_models/tfjs/model.json',
  ),
  maxImageSizeBytes:
    parsePositiveNumber(process.env.MAX_IMAGE_SIZE_MB, 10) * 1024 * 1024,
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
};
