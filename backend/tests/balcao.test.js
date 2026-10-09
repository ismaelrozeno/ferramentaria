const { db } = require('../src/config/firebase');
const { api, cliente, criarUsuario, prepararBanco, criarCategoria, ferramentaValida, consumoValido } = require('./ajuda');

const maria = { matricula: '1001', nome: 'Maria Souza', equipe: 'Elétrica' };
const justificativa = 'Leitor de digital com defeito';

let furadeira;
let serra;
let disco;

async function criarItem(dados) {
  const res = await api().post('/api/itens').send(dados);
  if (res.status !== 201) throw new Error(JSON.stringify(res.body));
  return res.body;
}

beforeEach(async () => {
  await prepararBanco();
  await criarCategoria('ELE', 'Elétricas');
  await api().post('/api/colaboradores').send(maria);
  furadeira = await criarItem(ferramentaValida());
  serra = await criarItem(ferramentaValida({ nome: 'Serra circular' }));
  disco = await criarItem(consumoValido());
  await db.collection('itens').doc(disco.id).update({ saldo: 20 });
});

const retirar = (extra = {}, cli = api()) =>
  cli.post('/api/balcao/retiradas').send({
    matricula: '1001',
    justificativa,
    itens: [{ codigo: furadeira.codigo }],
    ...extra,
  });

const saldoDe = async (id) => (await db.collection('itens').doc(id).get()).data().saldo;
const statusDe = async (id) => (await db.collection('ferramentas').doc(id).get()).data();

describe('Retirada no balcão', () => {
  it('retira ferramenta e consumo juntos, deixando a ferramenta em uso com a pessoa', async () => {
    const res = await retirar({
      prazoDevolucao: '2099-12-31',
      itens: [{ codigo: furadeira.codigo }, { codigo: disco.codigo, quantidade: 4 }],
    });

    expect(res.status).toBe(201);
    expect(res.body.colaborador).toEqual({ matricula: '1001', nome: 'Maria Souza' });
    expect(res.body.itens).toHaveLength(2);

    expect(await statusDe(furadeira.id)).toMatchObject({
      status: 'em_uso',
      colaboradorId: '1001',
      colaboradorNome: 'Maria Souza',
      prazoDevolucao: '2099-12-31',
    });
    expect(await saldoDe(disco.id)).toBe(16);
  });

  it('registra uma movimentação por item, com a justificativa e a operação em comum', async () => {
    const res = await retirar({ itens: [{ codigo: furadeira.codigo }, { codigo: disco.codigo, quantidade: 2 }] });
    const movs = await db.collection('movimentacoes').where('operacaoId', '==', res.body.operacaoId).get();

    expect(movs.size).toBe(2);
    movs.docs.forEach((doc) =>
      expect(doc.data()).toMatchObject({ tipo: 'retirada', colaboradorId: '1001', identificacao: 'matricula', justificativa }),
    );
  });

  it('aceita código em minúsculas e matrícula em minúsculas', async () => {
    const res = await retirar({ matricula: ' 1001 ', itens: [{ codigo: furadeira.codigo.toLowerCase() }] });
    expect(res.status).toBe(201);
  });

  it('é tudo ou nada: se um item não pode sair, nenhum sai', async () => {
    const res = await retirar({ itens: [{ codigo: furadeira.codigo }, { codigo: disco.codigo, quantidade: 21 }] });

    expect(res.status).toBe(409);
    expect(res.body.mensagem).toMatch(/Nada foi retirado/);
    expect(res.body.mensagem).toMatch(/saldo 20, pedido 21/);
    expect((await statusDe(furadeira.id)).status).toBe('disponivel');
    expect(await saldoDe(disco.id)).toBe(20);
  });

  it('não entrega ferramenta que já está em uso, dizendo com quem ela está', async () => {
    await retirar();
    await api().post('/api/colaboradores').send({ matricula: '1002', nome: 'João Lima' });
    const res = await retirar({ matricula: '1002' });

    expect(res.status).toBe(409);
    expect(res.body.mensagem).toMatch(/em uso por Maria Souza/);
  });

  it('lista todos os problemas de uma vez, inclusive código inexistente', async () => {
    const res = await retirar({ itens: [{ codigo: 'FER-ELE-9999' }, { codigo: disco.codigo, quantidade: 99 }] });

    expect(res.status).toBe(409);
    expect(res.body.mensagem).toMatch(/FER-ELE-9999: código não encontrado/);
    expect(res.body.mensagem).toMatch(/saldo 20, pedido 99/);
  });

  it('não deixa sair ferramenta em manutenção', async () => {
    await db.collection('ferramentas').doc(serra.id).update({ status: 'manutencao' });
    const res = await retirar({ itens: [{ codigo: serra.codigo }] });

    expect(res.status).toBe(409);
    expect(res.body.mensagem).toMatch(/em manutenção/);
  });

  it('deixa sair ferramenta parada (só está sem uso)', async () => {
    await db.collection('ferramentas').doc(serra.id).update({ status: 'parada' });
    const res = await retirar({ itens: [{ codigo: serra.codigo }] });

    expect(res.status).toBe(201);
    expect((await statusDe(serra.id)).status).toBe('em_uso');
  });

  it('ferramenta sai uma por vez', async () => {
    const res = await retirar({ itens: [{ codigo: furadeira.codigo, quantidade: 2 }] });
    expect(res.status).toBe(409);
    expect(res.body.mensagem).toMatch(/uma por vez/);
  });

  it('recusa colaborador inexistente (404) e desativado (409)', async () => {
    const inexistente = await retirar({ matricula: '9999' });
    expect(inexistente.status).toBe(404);

    await api().patch('/api/colaboradores/1001').send({ ativo: false });
    const desativado = await retirar();
    expect(desativado.status).toBe(409);
    expect(desativado.body.erro).toBe('COLABORADOR_DESATIVADO');
  });

  it('recusa item desativado', async () => {
    await api().delete(`/api/itens/${furadeira.id}`);
    const res = await retirar();
    expect(res.status).toBe(409);
    expect(res.body.mensagem).toMatch(/desativado/);
  });

  it('valida os dados: justificativa curta, lista vazia, código repetido, prazo no passado', async () => {
    expect((await retirar({ justificativa: 'a' })).status).toBe(400);
    expect((await retirar({ itens: [] })).status).toBe(400);
    expect((await retirar({ itens: [{ codigo: furadeira.codigo }, { codigo: furadeira.codigo }] })).status).toBe(400);
    expect((await retirar({ prazoDevolucao: '2000-01-01' })).status).toBe(400);
  });

  it('almoxarife também pode operar o balcão; sem login não', async () => {
    const almox = await criarUsuario('almoxarife');
    expect((await retirar({}, cliente(almox.token))).status).toBe(201);
    expect((await retirar({}, cliente(null))).status).toBe(401);
  });
});

describe('Devolução no balcão', () => {
  it('devolve a ferramenta: volta a ficar disponível e sem responsável', async () => {
    await retirar({ prazoDevolucao: '2099-12-31' });
    const res = await api().post('/api/balcao/devolucoes').send({ codigos: [furadeira.codigo], devolvidoPorMatricula: '1001', justificativa: 'Leitor com defeito' });

    expect(res.status).toBe(201);
    expect(res.body.itens[0]).toMatchObject({ codigo: furadeira.codigo, responsavel: 'Maria Souza', noPrazo: true });
    expect(await statusDe(furadeira.id)).toMatchObject({
      status: 'disponivel',
      colaboradorId: null,
      colaboradorNome: null,
      prazoDevolucao: null,
    });
  });

  it('registra a devolução em nome de quem retirou, mesmo se outra pessoa devolver', async () => {
    await retirar();
    await api().post('/api/colaboradores').send({ matricula: '1002', nome: 'João Lima' });
    const res = await api()
      .post('/api/balcao/devolucoes')
      .send({
        codigos: [furadeira.codigo],
        devolvidoPorMatricula: '1002',
        justificativa: 'Leitor com defeito',
        observacao: 'Maria saiu mais cedo',
      });
    const mov = (await db.collection('movimentacoes').where('operacaoId', '==', res.body.operacaoId).get()).docs[0].data();

    expect(mov).toMatchObject({
      tipo: 'devolucao',
      colaboradorId: '1001',
      devolvidoPorId: '1002',
      devolvidoPorNome: 'João Lima',
      identificacao: 'matricula',
      justificativa: 'Leitor com defeito',
      observacao: 'Maria saiu mais cedo',
    });
  });

  it('marca atraso quando passou do prazo', async () => {
    await retirar({ prazoDevolucao: '2099-12-31' });
    await db.collection('ferramentas').doc(furadeira.id).update({ prazoDevolucao: '2000-01-01' });
    const res = await api().post('/api/balcao/devolucoes').send({ codigos: [furadeira.codigo], devolvidoPorMatricula: '1001', justificativa: 'Leitor com defeito' });

    expect(res.body.itens[0].noPrazo).toBe(false);
  });

  it('noPrazo fica nulo quando a retirada não tinha prazo', async () => {
    await retirar();
    const res = await api().post('/api/balcao/devolucoes').send({ codigos: [furadeira.codigo], devolvidoPorMatricula: '1001', justificativa: 'Leitor com defeito' });
    expect(res.body.itens[0].noPrazo).toBeNull();
  });

  it('recusa ferramenta que não está em uso, consumo e código inexistente, sem devolver nada', async () => {
    await retirar();
    const res = await api()
      .post('/api/balcao/devolucoes')
      .send({ codigos: [furadeira.codigo, serra.codigo, disco.codigo, 'FER-ELE-9999'], devolvidoPorMatricula: '1001', justificativa: 'Leitor com defeito' });

    expect(res.status).toBe(409);
    expect(res.body.mensagem).toMatch(/Nada foi devolvido/);
    expect(res.body.mensagem).toMatch(/não está em uso/);
    expect(res.body.mensagem).toMatch(/material de consumo/);
    expect(res.body.mensagem).toMatch(/não encontrado/);
    expect((await statusDe(furadeira.id)).status).toBe('em_uso');
  });

  it('devolve várias de uma vez', async () => {
    await retirar({ itens: [{ codigo: furadeira.codigo }, { codigo: serra.codigo }] });
    const res = await api().post('/api/balcao/devolucoes').send({ codigos: [furadeira.codigo, serra.codigo], devolvidoPorMatricula: '1001', justificativa: 'Leitor com defeito' });

    expect(res.status).toBe(201);
    expect(res.body.itens).toHaveLength(2);
  });
});

describe('Consulta do colaborador e últimas operações', () => {
  it('mostra o colaborador com as ferramentas que estão com ele', async () => {
    await retirar({ prazoDevolucao: '2099-12-31', itens: [{ codigo: furadeira.codigo }, { codigo: serra.codigo }] });
    const res = await api().get('/api/colaboradores/1001');

    expect(res.status).toBe(200);
    expect(res.body.nome).toBe('Maria Souza');
    expect(res.body.ferramentasEmUso.map((f) => f.codigo)).toEqual([furadeira.codigo, serra.codigo].sort());
    expect(res.body.ferramentasEmUso[0]).toMatchObject({ prazoDevolucao: '2099-12-31' });
    expect(res.body.ferramentasEmUso[0].nome).toBeTruthy();
  });

  it('colaborador sem nada em uso volta lista vazia; matrícula inexistente dá 404', async () => {
    expect((await api().get('/api/colaboradores/1001')).body.ferramentasEmUso).toEqual([]);
    expect((await api().get('/api/colaboradores/zzz')).status).toBe(404);
  });

  it('lista as últimas operações, da mais nova para a mais antiga', async () => {
    await retirar();
    await api().post('/api/balcao/devolucoes').send({ codigos: [furadeira.codigo], devolvidoPorMatricula: '1001', justificativa: 'Leitor com defeito' });
    const res = await api().get('/api/balcao/ultimas');

    expect(res.status).toBe(200);
    expect(res.body.map((m) => m.tipo)).toEqual(['devolucao', 'retirada']);
    expect(res.body[0]).toMatchObject({ itemCodigo: furadeira.codigo, colaboradorNome: 'Maria Souza' });
  });
});

describe('Identificação pela digital', () => {
  const cadastrar = (matricula = '1001', biometriaId = 'DIGITAL-MARIA') =>
    api().put(`/api/colaboradores/${matricula}/biometria`).send({ biometriaId });

  it('cadastra a digital do colaborador', async () => {
    const res = await cadastrar();
    expect(res.status).toBe(200);
    expect(res.body.biometriaId).toBe('DIGITAL-MARIA');
  });

  it('não deixa a mesma digital em duas pessoas, mas permite recadastrar a própria', async () => {
    await cadastrar();
    await api().post('/api/colaboradores').send({ matricula: '1002', nome: 'João Lima' });

    const repetida = await cadastrar('1002');
    expect(repetida.status).toBe(409);
    expect(repetida.body.mensagem).toMatch(/Maria Souza/);
    expect((await cadastrar('1001')).status).toBe(200);
  });

  it('só administrador cadastra digital; matrícula inexistente dá 404', async () => {
    const almox = await criarUsuario('almoxarife');
    const res = await cliente(almox.token).put('/api/colaboradores/1001/biometria').send({ biometriaId: 'X' });
    expect(res.status).toBe(403);
    expect((await cadastrar('9999')).status).toBe(404);
    expect((await api().put('/api/colaboradores/1001/biometria').send({})).status).toBe(400);
  });

  it('identifica o colaborador pela digital, com as ferramentas que estão com ele', async () => {
    await cadastrar();
    await retirar();
    const res = await api().post('/api/balcao/identificacao').send({ biometriaId: 'DIGITAL-MARIA' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ matricula: '1001', nome: 'Maria Souza' });
    expect(res.body.ferramentasEmUso).toHaveLength(1);
  });

  it('digital desconhecida volta 404 com orientação', async () => {
    const res = await api().post('/api/balcao/identificacao').send({ biometriaId: 'NINGUEM' });
    expect(res.status).toBe(404);
    expect(res.body.erro).toBe('DIGITAL_NAO_RECONHECIDA');
  });

  it('retira pela digital sem justificativa e registra a identificação como biometria', async () => {
    await cadastrar();
    const res = await api()
      .post('/api/balcao/retiradas')
      .send({ biometriaId: 'DIGITAL-MARIA', itens: [{ codigo: furadeira.codigo }] });

    expect(res.status).toBe(201);
    expect(res.body.colaborador.matricula).toBe('1001');
    const mov = (await db.collection('movimentacoes').where('operacaoId', '==', res.body.operacaoId).get()).docs[0].data();
    expect(mov).toMatchObject({ identificacao: 'biometria', justificativa: null, colaboradorId: '1001' });
  });

  it('retirada pela digital recusa digital desconhecida e colaborador desativado', async () => {
    await cadastrar();
    const desconhecida = await api()
      .post('/api/balcao/retiradas')
      .send({ biometriaId: 'NINGUEM', itens: [{ codigo: furadeira.codigo }] });
    expect(desconhecida.status).toBe(404);

    await api().patch('/api/colaboradores/1001').send({ ativo: false });
    const desativado = await api()
      .post('/api/balcao/retiradas')
      .send({ biometriaId: 'DIGITAL-MARIA', itens: [{ codigo: furadeira.codigo }] });
    expect(desativado.status).toBe(409);
  });

  it('sem digital nem matrícula a retirada é recusada', async () => {
    const res = await api().post('/api/balcao/retiradas').send({ itens: [{ codigo: furadeira.codigo }] });
    expect(res.status).toBe(400);
  });
});

describe('Quem devolve', () => {
  const cadastrarDigital = (matricula, biometriaId) => api().put(`/api/colaboradores/${matricula}/biometria`).send({ biometriaId });

  it('identifica quem devolveu pela digital, sem justificativa', async () => {
    await retirar();
    await api().post('/api/colaboradores').send({ matricula: '1002', nome: 'João Lima' });
    await cadastrarDigital('1002', 'DIGITAL-JOAO');

    const res = await api()
      .post('/api/balcao/devolucoes')
      .send({ codigos: [furadeira.codigo], devolvidoPorBiometriaId: 'DIGITAL-JOAO' });
    const mov = (await db.collection('movimentacoes').where('operacaoId', '==', res.body.operacaoId).get()).docs[0].data();

    expect(res.status).toBe(201);
    expect(mov).toMatchObject({ colaboradorId: '1001', devolvidoPorId: '1002', identificacao: 'biometria', justificativa: null });
  });

  it('quem devolve pela matrícula precisa explicar por que não foi pela digital', async () => {
    await retirar();
    const res = await api().post('/api/balcao/devolucoes').send({ codigos: [furadeira.codigo], devolvidoPorMatricula: '1001' });

    expect(res.status).toBe(400);
    expect(res.body.mensagem).toMatch(/digital não foi usada/);
    expect((await statusDe(furadeira.id)).status).toBe('em_uso');
  });

  it('digital desconhecida de quem devolve recusa a devolução inteira', async () => {
    await retirar();
    const res = await api().post('/api/balcao/devolucoes').send({ codigos: [furadeira.codigo], devolvidoPorBiometriaId: 'NINGUEM' });

    expect(res.status).toBe(404);
    expect((await statusDe(furadeira.id)).status).toBe('em_uso');
  });
});

describe('Assinatura (a digital é a assinatura de retirada e de recebimento)', () => {
  const cadastrarDigital = (matricula, biometriaId) => api().put(`/api/colaboradores/${matricula}/biometria`).send({ biometriaId });
  const movimentos = async (operacaoId) => (await db.collection('movimentacoes').where('operacaoId', '==', operacaoId).get()).docs.map((d) => d.data());

  it('a retirada pela digital guarda a assinatura de retirada', async () => {
    await cadastrarDigital('1001', 'DIGITAL-MARIA');
    const res = await api()
      .post('/api/balcao/retiradas')
      .send({ biometriaId: 'DIGITAL-MARIA', itens: [{ codigo: furadeira.codigo }, { codigo: disco.codigo, quantidade: 2 }] });

    const movs = await movimentos(res.body.operacaoId);
    expect(movs).toHaveLength(2);
    movs.forEach((m) =>
      expect(m.assinatura).toEqual({ tipo: 'retirada', metodo: 'biometria', matricula: '1001', nome: 'Maria Souza', justificativa: null }),
    );
  });

  it('sem digital, a assinatura de retirada guarda o motivo', async () => {
    const res = await retirar();
    const [mov] = await movimentos(res.body.operacaoId);

    expect(mov.assinatura).toEqual({
      tipo: 'retirada',
      metodo: 'justificativa',
      matricula: '1001',
      nome: 'Maria Souza',
      justificativa,
    });
  });

  it('qualquer pessoa assina o recebimento de ferramenta que está no nome de outra', async () => {
    await retirar();
    await api().post('/api/colaboradores').send({ matricula: '1002', nome: 'João Lima' });
    await cadastrarDigital('1002', 'DIGITAL-JOAO');

    const res = await api()
      .post('/api/balcao/devolucoes')
      .send({ codigos: [furadeira.codigo], devolvidoPorBiometriaId: 'DIGITAL-JOAO' });
    const [mov] = await movimentos(res.body.operacaoId);

    expect(res.status).toBe(201);
    expect(mov.colaboradorId).toBe('1001');
    expect(mov.assinatura).toEqual({ tipo: 'recebimento', metodo: 'biometria', matricula: '1002', nome: 'João Lima', justificativa: null });
  });

  it('toda devolução precisa de assinatura: sem digital nem nome é recusada e nada muda', async () => {
    await retirar();
    const res = await api().post('/api/balcao/devolucoes').send({ codigos: [furadeira.codigo] });

    expect(res.status).toBe(400);
    expect(res.body.mensagem).toMatch(/assina o recebimento/);
    expect((await statusDe(furadeira.id)).status).toBe('em_uso');
  });

  it('o recebimento sem digital guarda o motivo na assinatura', async () => {
    await retirar();
    const res = await api()
      .post('/api/balcao/devolucoes')
      .send({ codigos: [furadeira.codigo], devolvidoPorMatricula: '1001', justificativa: 'Digital não reconhecida' });
    const [mov] = await movimentos(res.body.operacaoId);

    expect(mov.assinatura).toMatchObject({ tipo: 'recebimento', metodo: 'justificativa', justificativa: 'Digital não reconhecida' });
  });
});
