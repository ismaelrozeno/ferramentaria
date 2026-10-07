const { api, cliente, criarUsuario, prepararBanco } = require('./ajuda');

beforeEach(prepararBanco);

describe('Preferências de aparência', () => {
  it('salva e devolve as preferências em /me', async () => {
    const res = await api().patch('/api/me/preferencias').send({ tema: 'claro', acento: 'rosa' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ tema: 'claro', acento: 'rosa' });
    expect((await api().get('/api/me')).body.preferencias).toEqual({ tema: 'claro', acento: 'rosa' });
  });

  it('mudar uma opção não apaga as outras', async () => {
    await api().patch('/api/me/preferencias').send({ tema: 'claro', acento: 'azul' });
    const res = await api().patch('/api/me/preferencias').send({ menu: 'base' });

    expect(res.body).toEqual({ tema: 'claro', acento: 'azul', menu: 'base' });
  });

  it('sem preferências salvas, /me devolve objeto vazio', async () => {
    expect((await api().get('/api/me')).body.preferencias).toEqual({});
  });

  it('recusa opção inexistente, campo desconhecido e corpo vazio', async () => {
    expect((await api().patch('/api/me/preferencias').send({ acento: 'laranja' })).status).toBe(400);
    expect((await api().patch('/api/me/preferencias').send({ perfil: 'admin' })).status).toBe(400);
    expect((await api().patch('/api/me/preferencias').send({})).status).toBe(400);
  });

  it('cada pessoa tem as suas, e almoxarife também pode mudar', async () => {
    const almox = await criarUsuario('almoxarife');
    await api().patch('/api/me/preferencias').send({ tema: 'claro' });
    const res = await cliente(almox.token).patch('/api/me/preferencias').send({ acento: 'vermelho' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ acento: 'vermelho' });
    expect((await api().get('/api/me')).body.preferencias).toEqual({ tema: 'claro' });
  });

  it('exige login', async () => {
    expect((await cliente(null).patch('/api/me/preferencias').send({ tema: 'claro' })).status).toBe(401);
  });
});
