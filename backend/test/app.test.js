const test = require('node:test');
const assert = require('node:assert/strict');

const request = require('supertest');

const { createApp } = require('../src/app');

const fakeModelService = {
  status: 'ready',
  async predict() {
    return {
      prediction: 'happy',
      confidence: 0.8,
      probabilities: [
        { label: 'happy', probability: 0.8 },
        { label: 'relaxed', probability: 0.1 },
        { label: 'sad', probability: 0.06 },
        { label: 'angry', probability: 0.04 },
      ],
    };
  },
};

test('GET /api/health reports model status', async () => {
  const response = await request(createApp({ modelService: fakeModelService }))
    .get('/api/health')
    .expect(200);

  assert.deepEqual(response.body, { status: 'ok', model: 'ready' });
});

test('POST /api/predict requires an image', async () => {
  const response = await request(createApp({ modelService: fakeModelService }))
    .post('/api/predict')
    .expect(400);

  assert.match(response.body.error, /image/i);
});

test('POST /api/predict returns a prediction', async () => {
  const response = await request(createApp({ modelService: fakeModelService }))
    .post('/api/predict')
    .attach('image', Buffer.from('fake-image'), {
      filename: 'dog.jpg',
      contentType: 'image/jpeg',
    })
    .expect(200);

  assert.equal(response.body.prediction, 'happy');
  assert.equal(response.body.probabilities.length, 4);
});

test('POST /api/predict rejects unsupported file types', async () => {
  const response = await request(createApp({ modelService: fakeModelService }))
    .post('/api/predict')
    .attach('image', Buffer.from('hello'), {
      filename: 'dog.txt',
      contentType: 'text/plain',
    })
    .expect(400);

  assert.match(response.body.error, /JPEG/);
});
