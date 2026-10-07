const { api, prepararBanco, criarCategoria, ferramentaValida, consumoValido } = require('./ajuda');

beforeEach(async () => {
  await prepararBanco();
  await criarCategoria('ELE', 'Elétricas');
});

describe('Cadastro de ferramenta', () => {
  it('gera o código FER-ELE-0001 e entra com saldo 1, disponível', async () => {
    const res = await api().post('/api/itens').send(ferramentaValida());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      codigo: 'FER-ELE-0001',
      tipo: 'ferramenta',
      saldo: 1,
      custoMedio: 45990,
      ferramenta: { status: 'disponivel', origem: 'propria', valor: 45990, marca: 'Bosch' },
    });
  });

  it('registra a entrada inicial no histórico (o saldo nunca é digitado)', async () => {
    const criado = await api().post('/api/itens').send(ferramentaValida());

    expect(criado.body.historico).toHaveLength(1);
    expect(criado.body.historico[0]).toMatchObject({
      tipo: 'entrada',
      quantidade: 1,
      custoUnitario: 45990,
      usuarioNome: 'Administrador (teste)',
    });
  });

  it('numera em sequência dentro da categoria', async () => {
    await api().post('/api/itens').send(ferramentaValida());
    const segunda = await api().post('/api/itens').send(ferramentaValida({ nome: 'Esmerilhadeira' }));

    expect(segunda.body.codigo).toBe('FER-ELE-0002');
  });

  it('nunca repete código em cadastros simultâneos', async () => {
    const respostas = await Promise.all(
      Array.from({ length: 5 }, (_, i) => api().post('/api/itens').send(ferramentaValida({ nome: `Ferramenta ${i}` }))),
    );
    const codigos = respostas.map((r) => r.body.codigo).sort();

    expect(respostas.every((r) => r.status === 201)).toBe(true);
    expect(codigos).toEqual(['FER-ELE-0001', 'FER-ELE-0002', 'FER-ELE-0003', 'FER-ELE-0004', 'FER-ELE-0005']);
  }, 20000);

  it('exige fornecedor e fim do contrato para ferramenta alocada', async () => {
    const res = await api().post('/api/itens').send(ferramentaValida({ origem: 'alocada' }));

    expect(res.status).toBe(400);
    expect(res.body.mensagem).toMatch(/fornecedor/);
  });

  it('aceita ferramenta alocada completa e registra entrada de alocada', async () => {
    const res = await api()
      .post('/api/itens')
      .send(ferramentaValida({ origem: 'alocada', fornecedor: 'Loc Máquinas', fimContratoLocacao: '2026-12-31' }));

    expect(res.status).toBe(201);
    expect(res.body.ferramenta.fimContratoLocacao).toBe('2026-12-31');
    expect(res.body.historico[0].tipo).toBe('entradaAlocada');
  });

  it('recusa categoria inexistente ou desativada', async () => {
    const inexistente = await api().post('/api/itens').send(ferramentaValida({ categoriaId: 'XYZ' }));
    expect(inexistente.status).toBe(400);
    expect(inexistente.body.erro).toBe('CATEGORIA_INVALIDA');

    await api().patch('/api/categorias/ELE').send({ ativa: false });
    const desativada = await api().post('/api/itens').send(ferramentaValida());
    expect(desativada.status).toBe(400);
    expect(desativada.body.mensagem).toMatch(/desativada/);
  });

  it('recusa valor em reais com centavos quebrados', async () => {
    const res = await api().post('/api/itens').send(ferramentaValida({ valor: 459.9 }));

    expect(res.status).toBe(400);
    expect(res.body.mensagem).toMatch(/centavos/);
  });
});

describe('Cadastro de material de consumo', () => {
  it('usa prefixo CON com contador próprio e começa com saldo 0', async () => {
    await api().post('/api/itens').send(ferramentaValida());
    const res = await api().post('/api/itens').send(consumoValido());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ codigo: 'CON-ELE-0001', saldo: 0, unidade: 'un', ferramenta: null });
    expect(res.body.historico).toHaveLength(0);
  });
});

describe('Catálogo', () => {
  beforeEach(async () => {
    await api().post('/api/itens').send(ferramentaValida({ nome: 'Furadeira de impacto' }));
    await api().post('/api/itens').send(ferramentaValida({ nome: 'Esmerilhadeira angular', origem: 'alocada', fornecedor: 'Loc', fimContratoLocacao: '2026-12-31' }));
    await api().post('/api/itens').send(consumoValido());
  });

  it('lista tudo em ordem de código', async () => {
    const res = await api().get('/api/itens');

    expect(res.body.map((i) => i.codigo)).toEqual(['CON-ELE-0001', 'FER-ELE-0001', 'FER-ELE-0002']);
  });

  it('busca por nome sem acento e por código', async () => {
    const porNome = await api().get('/api/itens').query({ busca: 'ESMERILHADEIRA' });
    const porCodigo = await api().get('/api/itens').query({ busca: 'fer-ele-0001' });

    expect(porNome.body.map((i) => i.nome)).toEqual(['Esmerilhadeira angular']);
    expect(porCodigo.body.map((i) => i.nome)).toEqual(['Furadeira de impacto']);
  });

  it('filtra por tipo e por origem', async () => {
    const consumo = await api().get('/api/itens').query({ tipo: 'consumo' });
    const alocadas = await api().get('/api/itens').query({ origem: 'alocada' });

    expect(consumo.body).toHaveLength(1);
    expect(alocadas.body.map((i) => i.codigo)).toEqual(['FER-ELE-0002']);
  });

  it('encontra o item pelo código lido no código de barras', async () => {
    const res = await api().get('/api/itens/codigo/fer-ele-0002');

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Esmerilhadeira angular');
  });

  it('responde 404 para código inexistente', async () => {
    const res = await api().get('/api/itens/codigo/FER-ELE-9999');

    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('ITEM_NAO_ENCONTRADO');
  });
});

describe('Edição e desativação', () => {
  it('edita dados cadastrais e atualiza o custo da ferramenta', async () => {
    const criado = await api().post('/api/itens').send(ferramentaValida());
    const res = await api().patch(`/api/itens/${criado.body.id}`).send({ nome: 'Furadeira Bosch', valor: 50000 });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ nome: 'Furadeira Bosch', custoMedio: 50000, ferramenta: { valor: 50000 } });
  });

  it('nunca deixa editar o saldo ou o código', async () => {
    const criado = await api().post('/api/itens').send(ferramentaValida());
    const res = await api().patch(`/api/itens/${criado.body.id}`).send({ saldo: 10, codigo: 'FER-ELE-9999' });

    expect(res.status).toBe(400);
    expect(res.body.mensagem).toMatch(/não podem ser alterados: saldo, codigo/);
  });

  it('desativa e tira o item do catálogo', async () => {
    const criado = await api().post('/api/itens').send(ferramentaValida());
    const res = await api().delete(`/api/itens/${criado.body.id}`);
    const catalogo = await api().get('/api/itens');

    expect(res.status).toBe(204);
    expect(catalogo.body).toHaveLength(0);
  });
});
