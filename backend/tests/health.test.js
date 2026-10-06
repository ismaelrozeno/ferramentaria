const request = require('supertest');
const app = require('../src/app');
const { api, prepararBanco } = require('./ajuda');

describe('GET /api/health', () => {
  it('responde 200 com status ok', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(new Date(res.body.timestamp).toString()).not.toBe('Invalid Date');
  });
});

describe('Rota inexistente', () => {
  it('sem login responde 401, sem revelar quais rotas existem', async () => {
    const res = await request(app).get('/api/nao-existe');

    expect(res.status).toBe(401);
  });

  it('com login responde 404', async () => {
    await prepararBanco();
    const res = await api().get('/api/nao-existe');

    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('ROTA_NAO_ENCONTRADA');
  });
});
