const request = require('supertest');
const app = require('../src/app');

describe('GET /api/health', () => {
  it('responde 200 com status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });

  it('responde 404 para rota inexistente', async () => {
    const res = await request(app).get('/api/nao-existe');

    expect(res.status).toBe(404);
  });
});
