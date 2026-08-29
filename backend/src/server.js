const config = require('./config');
const { createApp } = require('./app');
const { ModelService } = require('./model-service');

const modelService = new ModelService(config.modelPath);
const app = createApp({ modelService });

const server = app.listen(config.port, () => {
  console.log(`Dog emotion API listening on http://localhost:${config.port}`);
});

modelService
  .load()
  .then(() => console.log(`Model loaded from ${config.modelPath}`))
  .catch((error) => console.error(`Model could not be loaded: ${error.message}`));

function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close((error) => {
    process.exit(error ? 1 : 0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
