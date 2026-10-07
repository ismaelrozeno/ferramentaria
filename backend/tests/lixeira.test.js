const request = require('supertest');
const app = require('../src/app');
const { auth, db } = require('../src/config/firebase');
const { api, cliente, criarUsuario, prepararBanco, criarCategoria, ferramentaValida, consumoValido } = require('./ajuda');

let furadeira;
let disco;

const criarItem = async (dados) => {
  const res = await api().post('/api/itens').send(dados);
  if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  return res.body;
};

const excluir = (tipo, id, cli = api()) => cli.post(`/api/lixeira/${tipo}/${id}/excluir`).send();
const restaurar = (tipo, id) => api().post(`/api/lixeira/${tipo}/${id}/restaurar`).send();
const apagar = (tipo, id) => api().delete(`/api/lixeira/${tipo}/${id}`);
const existe = async (colecao, id) => (await db.collection(colecao).doc(id).get()).exists;
const desligarLixeira = () => api().patch('/api/configuracoes').send({ lixeiraAtiva: false });

beforeEach(async () => {
  await prepararBanco();
  await criarCategoria('ELE', 'Elétricas');
  await api().post('/api/colaboradores').send({ matricula: '1001', nome: 'Maria Souza', equipe: 'Elétrica' });
  furadeira = await criarItem(ferramentaValida());
  disco = await criarItem(consumoValido());
});

describe('Configurações do sistema', () => {
  it('a lixeira vem ligada; só o administrador desliga', async () => {
    expect((await api().get('/api/configuracoes')).body).toEqual({ lixeiraAtiva: true });

    const almox = await criarUsuario('almoxarife');
    expect((await cliente(almox.token).get('/api/configuracoes')).status).toBe(200);
    expect((await cliente(almox.token).patch('/api/configuracoes').send({ lixeiraAtiva: false })).status).toBe(403);

    const res = await desligarLixeira();
    expect(res.body).toEqual({ lixeiraAtiva: false });
    expect((await api().get('/api/configuracoes')).body.lixeiraAtiva).toBe(false);
  });

  it('recusa configuração inexistente ou valor inválido', async () => {
    expect((await api().patch('/api/configuracoes').send({ outra: 1 })).status).toBe(400);
    expect((await api().patch('/api/configuracoes').send({ lixeiraAtiva: 'sim' })).status).toBe(400);
    expect((await api().patch('/api/configuracoes').send({})).status).toBe(400);
  });
});

describe('Lixeira de itens', () => {
  it('envia para a lixeira: some do catálogo, do detalhe e da busca por código, e aparece na lixeira', async () => {
    const res = await excluir('itens', furadeira.id);

    expect(res.body).toMatchObject({ resultado: 'lixeira', tipo: 'itens', id: furadeira.id });
    expect((await api().get('/api/itens')).body.map((i) => i.id)).toEqual([disco.id]);
    expect((await api().get(`/api/itens/${furadeira.id}`)).status).toBe(404);
    expect((await api().get(`/api/itens/codigo/${furadeira.codigo}`)).status).toBe(404);

    const lixeira = (await api().get('/api/lixeira')).body;
    expect(lixeira.itens).toHaveLength(1);
    expect(lixeira.itens[0]).toMatchObject({ id: furadeira.id, rotulo: expect.stringContaining(furadeira.codigo), excluidoPorNome: 'Administrador (teste)' });
  });

  it('restaura e o item volta ao catálogo', async () => {
    await excluir('itens', furadeira.id);
    const res = await restaurar('itens', furadeira.id);

    expect(res.body.resultado).toBe('restaurado');
    expect((await api().get('/api/itens')).body).toHaveLength(2);
    expect((await api().get('/api/lixeira')).body.itens).toEqual([]);
  });

  it('apaga de vez: some o cadastro, o histórico continua e o código nunca se repete', async () => {
    await excluir('itens', furadeira.id);
    const res = await apagar('itens', furadeira.id);

    expect(res.body.resultado).toBe('apagado');
    expect(await existe('itens', furadeira.id)).toBe(false);
    expect(await existe('ferramentas', furadeira.id)).toBe(false);

    const movs = await db.collection('movimentacoes').where('itemId', '==', furadeira.id).get();
    expect(movs.size).toBeGreaterThan(0);
    expect(movs.docs[0].data()).toMatchObject({ itemCodigo: furadeira.codigo, itemNome: 'Furadeira de impacto' });

    const novo = await criarItem(ferramentaValida({ nome: 'Outra' }));
    expect(novo.codigo).not.toBe(furadeira.codigo);
  });

  it('não apaga de vez o que não está na lixeira', async () => {
    const res = await apagar('itens', furadeira.id);
    expect(res.status).toBe(409);
    expect(res.body.erro).toBe('NAO_ESTA_NA_LIXEIRA');
    expect(await existe('itens', furadeira.id)).toBe(true);
  });

  it('não repete a exclusão nem restaura quem não está na lixeira', async () => {
    await excluir('itens', furadeira.id);
    expect((await excluir('itens', furadeira.id)).body.erro).toBe('JA_NA_LIXEIRA');
    expect((await restaurar('itens', disco.id)).body.erro).toBe('FORA_DA_LIXEIRA');
  });

  it('bloqueia ferramenta em uso e consumo com saldo', async () => {
    await api()
      .post('/api/colaboradores')
      .send({ matricula: '1002', nome: 'João Lima' });
    await api()
      .post('/api/balcao/retiradas')
      .send({ matricula: '1002', justificativa: 'Leitor com defeito', itens: [{ codigo: furadeira.codigo }] });
    await db.collection('itens').doc(disco.id).update({ saldo: 5 });

    const emUso = await excluir('itens', furadeira.id);
    const comSaldo = await excluir('itens', disco.id);

    expect(emUso.status).toBe(409);
    expect(emUso.body.erro).toBe('ITEM_EM_USO');
    expect(comSaldo.status).toBe(409);
    expect(comSaldo.body.erro).toBe('ITEM_COM_SALDO');
  });

  it('com a lixeira desligada, Excluir apaga direto', async () => {
    await desligarLixeira();
    const res = await excluir('itens', disco.id);

    expect(res.body.resultado).toBe('apagado');
    expect(await existe('itens', disco.id)).toBe(false);
    expect((await api().get('/api/lixeira')).body.itens).toEqual([]);
  });

  it('o balcão trata item da lixeira como inexistente', async () => {
    await excluir('itens', furadeira.id);
    const res = await api()
      .post('/api/balcao/retiradas')
      .send({ matricula: '1001', justificativa: 'Leitor com defeito', itens: [{ codigo: furadeira.codigo }] });

    expect(res.status).toBe(409);
    expect(res.body.mensagem).toMatch(/código não encontrado/);
  });

  it('só administrador usa a lixeira; sem login não; tipo desconhecido dá 404', async () => {
    const almox = await criarUsuario('almoxarife');
    expect((await excluir('itens', furadeira.id, cliente(almox.token))).status).toBe(403);
    expect((await cliente(almox.token).get('/api/lixeira')).status).toBe(403);
    expect((await request(app).get('/api/lixeira')).status).toBe(401);
    expect((await excluir('foguetes', 'x')).status).toBe(404);
    expect((await excluir('itens', 'naoexiste')).status).toBe(404);
  });
});

describe('Lixeira de colaboradores', () => {
  it('some das listas, da busca e do ranking; restaura inteiro', async () => {
    await api().post('/api/colaboradores/1001/biometria'.replace('/biometria', '')).send().catch(() => {});
    await api().put('/api/colaboradores/1001/biometria').send({ biometriaId: 'DIG-1' });
    await db.collection('colaboradores').doc('1001').update({ xp: 50, xpSemana: 50 });

    await excluir('colaboradores', '1001');

    expect((await api().get('/api/colaboradores')).body).toEqual([]);
    expect((await api().get('/api/colaboradores/1001')).status).toBe(404);
    expect((await api().post('/api/balcao/identificacao').send({ biometriaId: 'DIG-1' })).status).toBe(404);
    expect((await api().get('/api/ranking')).body.geral).toEqual([]);

    await restaurar('colaboradores', '1001');
    expect((await api().get('/api/colaboradores/1001')).status).toBe(200);
    expect((await api().get('/api/ranking')).body.geral).toHaveLength(1);
  });

  it('o balcão recusa colaborador da lixeira', async () => {
    await excluir('colaboradores', '1001');
    const res = await api()
      .post('/api/balcao/retiradas')
      .send({ matricula: '1001', justificativa: 'Leitor com defeito', itens: [{ codigo: furadeira.codigo }] });
    expect(res.status).toBe(404);
  });

  it('bloqueia quem está com ferramenta', async () => {
    await api()
      .post('/api/balcao/retiradas')
      .send({ matricula: '1001', justificativa: 'Leitor com defeito', itens: [{ codigo: furadeira.codigo }] });
    const res = await excluir('colaboradores', '1001');

    expect(res.status).toBe(409);
    expect(res.body.erro).toBe('COLABORADOR_COM_FERRAMENTA');
  });

  it('cadastro e importação avisam que a matrícula está na lixeira', async () => {
    await excluir('colaboradores', '1001');

    const criar = await api().post('/api/colaboradores').send({ matricula: '1001', nome: 'Outra Pessoa' });
    expect(criar.status).toBe(409);
    expect(criar.body.mensagem).toMatch(/lixeira/);

    const importar = await api()
      .post('/api/colaboradores/importacao')
      .send({ linhas: [{ linha: 2, matricula: '1001', nome: 'Maria Souza' }] });
    expect(importar.body.erros[0].mensagem).toMatch(/lixeira/);
    expect(importar.body.criados + importar.body.atualizados).toBe(0);
  });

  it('apaga de vez e o histórico da devolução continua com o nome', async () => {
    await api()
      .post('/api/balcao/retiradas')
      .send({ matricula: '1001', justificativa: 'Leitor com defeito', itens: [{ codigo: furadeira.codigo }] });
    await api().post('/api/balcao/devolucoes').send({ codigos: [furadeira.codigo] });

    await excluir('colaboradores', '1001');
    await apagar('colaboradores', '1001');

    expect(await existe('colaboradores', '1001')).toBe(false);
    const movs = await db.collection('movimentacoes').where('tipo', '==', 'devolucao').get();
    expect(movs.docs[0].data().colaboradorNome).toBe('Maria Souza');
  });

  it('aceita a matrícula em minúsculas', async () => {
    await api().post('/api/colaboradores').send({ matricula: 'ab-1', nome: 'Com Letras' });
    expect((await excluir('colaboradores', 'ab-1')).body.id).toBe('AB-1');
  });
});

describe('Lixeira de categorias e locais', () => {
  it('categoria com item ativo não sai; sem itens vai para a lixeira e não aceita item novo', async () => {
    expect((await excluir('categorias', 'ELE')).body.erro).toBe('CATEGORIA_EM_USO');

    await criarCategoria('MAN', 'Manuais');
    expect((await excluir('categorias', 'MAN')).body.resultado).toBe('lixeira');
    expect((await api().get('/api/categorias')).body.map((c) => c.sigla)).toEqual(['ELE']);

    const novo = await api().post('/api/itens').send(ferramentaValida({ categoriaId: 'MAN' }));
    expect(novo.status).toBe(400);
  });

  it('só apaga de vez a categoria sem nenhum item, nem na lixeira', async () => {
    await excluir('itens', disco.id);
    await excluir('itens', furadeira.id);
    expect((await excluir('categorias', 'ELE')).body.resultado).toBe('lixeira');

    const bloqueada = await apagar('categorias', 'ELE');
    expect(bloqueada.status).toBe(409);
    expect(bloqueada.body.erro).toBe('CATEGORIA_COM_ITENS');

    await apagar('itens', disco.id);
    await apagar('itens', furadeira.id);
    expect((await apagar('categorias', 'ELE')).body.resultado).toBe('apagado');
    expect(await existe('categorias', 'ELE')).toBe(false);
  });

  it('não restaura item enquanto a categoria dele está na lixeira', async () => {
    await excluir('itens', disco.id);
    await excluir('itens', furadeira.id);
    await excluir('categorias', 'ELE');

    const res = await restaurar('itens', disco.id);
    expect(res.status).toBe(409);
    expect(res.body.erro).toBe('CATEGORIA_NA_LIXEIRA');

    await restaurar('categorias', 'ELE');
    expect((await restaurar('itens', disco.id)).body.resultado).toBe('restaurado');
  });

  it('local em uso não sai; local livre vai para a lixeira, volta e é apagado', async () => {
    const local = (await api().post('/api/locais').send({ nome: 'Galpão', tipo: 'almoxarifado' })).body;
    const livre = (await api().post('/api/locais').send({ nome: 'Obra velha', tipo: 'obra' })).body;
    await criarItem(consumoValido({ nome: 'Fita', localId: local.id }));

    expect((await excluir('locais', local.id)).body.erro).toBe('LOCAL_EM_USO');
    expect((await excluir('locais', livre.id)).body.resultado).toBe('lixeira');
    expect((await api().get('/api/locais')).body.map((l) => l.id)).toEqual([local.id]);

    await restaurar('locais', livre.id);
    await excluir('locais', livre.id);
    expect((await apagar('locais', livre.id)).body.resultado).toBe('apagado');
  });
});

describe('Lixeira de usuários', () => {
  it('não deixa excluir a própria conta', async () => {
    const res = await excluir('usuarios', (await api().get('/api/me')).body.uid);
    expect(res.status).toBe(409);
    expect(res.body.erro).toBe('USUARIO_PROPRIO');
  });

  it('o usuário na lixeira perde o acesso, some da lista e volta ao restaurar', async () => {
    const almox = await criarUsuario('almoxarife');
    await excluir('usuarios', almox.uid);

    expect([401, 403]).toContain((await cliente(almox.token).get('/api/me')).status);
    expect((await api().get('/api/usuarios')).body.map((u) => u.id)).not.toContain(almox.uid);
    expect((await auth().getUser(almox.uid)).disabled).toBe(true);

    await restaurar('usuarios', almox.uid);
    expect((await auth().getUser(almox.uid)).disabled).toBe(false);
    expect((await api().get('/api/usuarios')).body.map((u) => u.id)).toContain(almox.uid);
  });

  it('restaurar não reativa quem estava desativado antes', async () => {
    const almox = await criarUsuario('almoxarife');
    await api().patch(`/api/usuarios/${almox.uid}`).send({ ativo: false });
    await excluir('usuarios', almox.uid);
    await restaurar('usuarios', almox.uid);

    expect((await auth().getUser(almox.uid)).disabled).toBe(true);
  });

  it('apagar de vez remove também a conta de login', async () => {
    const almox = await criarUsuario('almoxarife');
    await excluir('usuarios', almox.uid);
    await apagar('usuarios', almox.uid);

    expect(await existe('usuarios', almox.uid)).toBe(false);
    await expect(auth().getUser(almox.uid)).rejects.toMatchObject({ code: 'auth/user-not-found' });
  });
});
