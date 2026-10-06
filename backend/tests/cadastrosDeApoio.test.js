const { api, limparBanco } = require('./ajuda');

beforeEach(limparBanco);

describe('Categorias', () => {
  it('cria categoria com a sigla em maiúsculas', async () => {
    const res = await api().post('/api/categorias').send({ sigla: 'ele', nome: 'Elétricas' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ id: 'ELE', sigla: 'ELE', nome: 'Elétricas', ativa: true });
  });

  it('recusa sigla que não tem 3 letras', async () => {
    const res = await api().post('/api/categorias').send({ sigla: 'EL1', nome: 'Elétricas' });

    expect(res.status).toBe(400);
    expect(res.body.erro).toBe('DADOS_INVALIDOS');
    expect(res.body.mensagem).toMatch(/3 letras/);
  });

  it('recusa sigla repetida', async () => {
    await api().post('/api/categorias').send({ sigla: 'ELE', nome: 'Elétricas' });
    const res = await api().post('/api/categorias').send({ sigla: 'ELE', nome: 'Outra' });

    expect(res.status).toBe(409);
    expect(res.body.erro).toBe('CATEGORIA_JA_EXISTE');
  });

  it('lista em ordem de sigla e permite desativar', async () => {
    await api().post('/api/categorias').send({ sigla: 'MED', nome: 'Medição' });
    await api().post('/api/categorias').send({ sigla: 'ELE', nome: 'Elétricas' });
    await api().patch('/api/categorias/MED').send({ ativa: false });

    const res = await api().get('/api/categorias');

    expect(res.body.map((c) => c.sigla)).toEqual(['ELE', 'MED']);
    expect(res.body[1].ativa).toBe(false);
  });

  it('não deixa mudar a sigla pela edição', async () => {
    await api().post('/api/categorias').send({ sigla: 'ELE', nome: 'Elétricas' });
    const res = await api().patch('/api/categorias/ELE').send({ sigla: 'XYZ' });

    expect(res.status).toBe(400);
    expect(res.body.mensagem).toMatch(/sigla/);
  });
});

describe('Locais', () => {
  it('cria, lista e desativa um local', async () => {
    const criado = await api().post('/api/locais').send({ nome: 'Almoxarifado central', tipo: 'almoxarifado' });
    expect(criado.status).toBe(201);

    await api().patch(`/api/locais/${criado.body.id}`).send({ ativo: false });
    const res = await api().get('/api/locais');

    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ nome: 'Almoxarifado central', ativo: false });
  });

  it('recusa tipo de local desconhecido', async () => {
    const res = await api().post('/api/locais').send({ nome: 'Pátio', tipo: 'garagem' });

    expect(res.status).toBe(400);
    expect(res.body.mensagem).toMatch(/almoxarifado, obra ou setor/);
  });
});
