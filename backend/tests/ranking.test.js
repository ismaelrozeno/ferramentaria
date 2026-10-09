const request = require('supertest');
const app = require('../src/app');
const { db } = require('../src/config/firebase');
const { aplicarDevolucao, ligaPorXp, semanaDe } = require('../src/services/pontuacao');
const { nomeReduzido } = require('../src/services/rankingService');
const { api, prepararBanco, criarCategoria, ferramentaValida } = require('./ajuda');

let ferramentas;

beforeEach(async () => {
  await prepararBanco();
  await criarCategoria('ELE', 'Elétricas');
  await api().post('/api/colaboradores').send({ matricula: '1001', nome: 'Maria Souza Lima', equipe: 'Elétrica' });
  await api().post('/api/colaboradores').send({ matricula: '1002', nome: 'João Pereira' });
  ferramentas = [];
  for (let i = 1; i <= 6; i += 1) {
    ferramentas.push((await api().post('/api/itens').send(ferramentaValida({ nome: `Furadeira ${i}` }))).body);
  }
});

const ciclo = async (matricula, ferramenta, { atrasada = false } = {}) => {
  await api()
    .post('/api/balcao/retiradas')
    .send({ matricula, justificativa: 'Leitor com defeito', prazoDevolucao: '2099-12-31', itens: [{ codigo: ferramenta.codigo }] });
  if (atrasada) await db.collection('ferramentas').doc(ferramenta.id).update({ prazoDevolucao: '2000-01-01' });
  return api()
    .post('/api/balcao/devolucoes')
    .send({ codigos: [ferramenta.codigo], devolvidoPorMatricula: matricula, justificativa: 'Leitor com defeito' });
};

const colaborador = async (matricula) => (await db.collection('colaboradores').doc(matricula).get()).data();

describe('Regras de pontos', () => {
  it('devolução no prazo vale 10, atrasada vale 3 e zera a sequência', () => {
    const noPrazo = aplicarDevolucao({}, true, '2026-10-05');
    expect(noPrazo.ganho).toBe(10);
    expect(noPrazo.estado).toMatchObject({ xp: 10, xpSemana: 10, sequencia: 1 });

    const atrasada = aplicarDevolucao(noPrazo.estado, false, '2026-10-05');
    expect(atrasada.ganho).toBe(3);
    expect(atrasada.estado).toMatchObject({ xp: 13, sequencia: 0, melhorSequencia: 1, devolucoesAtrasadas: 1 });
  });

  it('sem prazo conta como no prazo; a cada 5 seguidas há bônus de 5', () => {
    let estado = {};
    const ganhos = [];
    for (let i = 0; i < 5; i += 1) {
      const r = aplicarDevolucao(estado, null, '2026-10-05');
      estado = r.estado;
      ganhos.push(r.ganho);
    }
    expect(ganhos).toEqual([10, 10, 10, 10, 15]);
  });

  it('semana nova zera os pontos da semana, mas mantém o total', () => {
    const { estado } = aplicarDevolucao({ xp: 50, xpSemana: 50, semanaId: '2026-09-28' }, true, '2026-10-05');
    expect(estado).toMatchObject({ xp: 60, xpSemana: 10, semanaId: '2026-10-05' });
  });

  it('a semana começa na segunda-feira e as ligas seguem o XP total', () => {
    expect(semanaDe(new Date('2026-10-07T15:00:00Z'))).toBe('2026-10-05');
    expect(semanaDe(new Date('2026-10-11T15:00:00Z'))).toBe('2026-10-05');
    expect(ligaPorXp(0).id).toBe('bronze');
    expect(ligaPorXp(200).id).toBe('prata');
    expect(ligaPorXp(999).id).toBe('ouro');
    expect(ligaPorXp(1000).id).toBe('diamante');
  });

  it('abrevia o nome para o painel público', () => {
    expect(nomeReduzido('Maria Souza Lima')).toBe('Maria L.');
    expect(nomeReduzido('João')).toBe('João');
  });
});

describe('Pontos pela devolução', () => {
  it('quem devolve no prazo ganha XP e sequência, e a devolução informa os pontos', async () => {
    const res = await ciclo('1001', ferramentas[0]);

    expect(res.body.itens[0]).toMatchObject({ noPrazo: true, xp: 10 });
    expect(await colaborador('1001')).toMatchObject({ xp: 10, xpSemana: 10, sequencia: 1, devolucoesNoPrazo: 1 });
  });

  it('devolução atrasada rende menos e quebra a sequência', async () => {
    await ciclo('1001', ferramentas[0]);
    const res = await ciclo('1001', ferramentas[1], { atrasada: true });

    expect(res.body.itens[0]).toMatchObject({ noPrazo: false, xp: 3 });
    expect(await colaborador('1001')).toMatchObject({ xp: 13, sequencia: 0, melhorSequencia: 1, devolucoesAtrasadas: 1 });
  });

  it('os pontos vão para quem retirou, mesmo se outra pessoa devolver', async () => {
    await api()
      .post('/api/balcao/retiradas')
      .send({ matricula: '1001', justificativa: 'Leitor com defeito', itens: [{ codigo: ferramentas[0].codigo }] });
    await api().post('/api/balcao/devolucoes').send({ codigos: [ferramentas[0].codigo], devolvidoPorMatricula: '1002', justificativa: 'Leitor com defeito' });

    expect((await colaborador('1001')).xp).toBe(10);
    expect((await colaborador('1002')).xp).toBe(0);
  });

  it('várias ferramentas do mesmo colaborador somam numa devolução só', async () => {
    await api()
      .post('/api/balcao/retiradas')
      .send({
        matricula: '1001',
        justificativa: 'Leitor com defeito',
        itens: [{ codigo: ferramentas[0].codigo }, { codigo: ferramentas[1].codigo }],
      });
    const res = await api().post('/api/balcao/devolucoes').send({
      codigos: [ferramentas[0].codigo, ferramentas[1].codigo],
      devolvidoPorMatricula: '1001',
      justificativa: 'Leitor com defeito',
    });

    expect(res.body.itens.map((i) => i.xp)).toEqual([10, 10]);
    expect(await colaborador('1001')).toMatchObject({ xp: 20, sequencia: 2 });
  });

  it('guarda os pontos na movimentação da devolução', async () => {
    const res = await ciclo('1001', ferramentas[0]);
    const mov = (await db.collection('movimentacoes').where('operacaoId', '==', res.body.operacaoId).get()).docs[0].data();
    expect(mov.xp).toBe(10);
  });
});

describe('Ranking', () => {
  beforeEach(async () => {
    await ciclo('1001', ferramentas[0]);
    await ciclo('1001', ferramentas[1]);
    await ciclo('1002', ferramentas[2]);
  });

  it('ordena por pontos e mostra liga e sequência (logado)', async () => {
    const res = await api().get('/api/ranking');

    expect(res.status).toBe(200);
    expect(res.body.geral.map((p) => [p.posicao, p.nome, p.xp])).toEqual([
      [1, 'Maria Souza Lima', 20],
      [2, 'João Pereira', 10],
    ]);
    expect(res.body.geral[0]).toMatchObject({ liga: 'bronze', sequencia: 2, equipe: 'Elétrica' });
    expect(res.body.daSemana.map((p) => p.xpSemana)).toEqual([20, 10]);
  });

  it('o ranking da semana ignora pontos de semanas passadas', async () => {
    await db.collection('colaboradores').doc('1002').update({ semanaId: '2020-01-06', xpSemana: 500 });
    const res = await api().get('/api/ranking');

    expect(res.body.daSemana.map((p) => p.nome)).toEqual(['Maria Souza Lima']);
    expect(res.body.geral).toHaveLength(2);
  });

  it('quem nunca pontuou e quem está desativado ficam de fora', async () => {
    await api().post('/api/colaboradores').send({ matricula: '1003', nome: 'Sem Pontos' });
    await api().patch('/api/colaboradores/1002').send({ ativo: false });
    const res = await api().get('/api/ranking');

    expect(res.body.geral.map((p) => p.nome)).toEqual(['Maria Souza Lima']);
  });

  it('exige login', async () => {
    expect((await request(app).get('/api/ranking')).status).toBe(401);
  });
});

describe('Painel público', () => {
  it('abre sem login, com nomes abreviados e sem matrícula', async () => {
    await ciclo('1001', ferramentas[0]);
    const res = await request(app).get('/api/painel');

    expect(res.status).toBe(200);
    expect(res.body.geral[0]).toMatchObject({ posicao: 1, nome: 'Maria L.', xp: 10 });
    expect(JSON.stringify(res.body)).not.toMatch(/1001|Souza/);
  });

  it('mostra só os 10 primeiros', async () => {
    for (let i = 0; i < 12; i += 1) {
      await db.collection('colaboradores').doc(`P${i}`).set({ matricula: `P${i}`, nome: `Pessoa ${i}`, ativo: true, xp: 10 + i });
    }
    const res = await request(app).get('/api/painel');
    expect(res.body.geral).toHaveLength(10);
    expect(res.body.geral[0].xp).toBe(21);
  });
});
