const { db } = require('../config/firebase');
const { LIGAS, XP, ligaPorXp, semanaDe } = require('./pontuacao');

// O painel público é consultado de tempos em tempos por telas fixas; guardar o resultado
// por alguns segundos evita ler todos os colaboradores a cada consulta.
const validadeMs = () => Number(process.env.PAINEL_CACHE_MS ?? 30000);
let guardado = null;

// "Maria Souza Lima" vira "Maria L.": o painel não precisa de login, então não mostra o nome inteiro.
function nomeReduzido(nome) {
  const partes = String(nome).trim().split(/\s+/);
  return partes.length < 2 ? partes[0] : `${partes[0]} ${partes.at(-1)[0].toUpperCase()}.`;
}

async function carregar() {
  if (guardado && Date.now() - guardado.em < validadeMs()) return guardado.dados;

  const semana = semanaDe();
  const snap = await db.collection('colaboradores').where('ativo', '==', true).get();
  const pessoas = snap.docs
    .filter((doc) => !doc.data().excluidoEm)
    .map((doc) => {
    const c = doc.data();
    const xp = c.xp ?? 0;
    const liga = ligaPorXp(xp);
    return {
      nome: c.nome,
      equipe: c.equipe ?? '',
      xp,
      xpSemana: c.semanaId === semana ? (c.xpSemana ?? 0) : 0,
      sequencia: c.sequencia ?? 0,
      melhorSequencia: c.melhorSequencia ?? 0,
      liga: liga.id,
      ligaNome: liga.nome,
    };
  });

  const dados = { semana, pessoas, atualizadoEm: new Date().toISOString() };
  guardado = { em: Date.now(), dados };
  return dados;
}

const ordenar = (lista, campo) =>
  lista.sort((a, b) => b[campo] - a[campo] || b.sequencia - a.sequencia || a.nome.localeCompare(b.nome, 'pt-BR'));

const comPosicao = (lista) => lista.map((pessoa, i) => ({ posicao: i + 1, ...pessoa }));

// `publico`: nomes reduzidos. Só entra no ranking quem já pontuou.
async function montar({ publico, limite }) {
  const { semana, pessoas, atualizadoEm } = await carregar();
  const forma = (pessoa) => (publico ? { ...pessoa, nome: nomeReduzido(pessoa.nome) } : pessoa);

  const geral = ordenar(
    pessoas.filter((p) => p.xp > 0),
    'xp',
  ).slice(0, limite);
  const daSemana = ordenar(
    pessoas.filter((p) => p.xpSemana > 0),
    'xpSemana',
  ).slice(0, limite);

  return {
    semana,
    atualizadoEm,
    ligas: LIGAS,
    regras: XP,
    geral: comPosicao(geral.map(forma)),
    daSemana: comPosicao(daSemana.map(forma)),
  };
}

const ranking = () => montar({ publico: false, limite: 50 });
const painel = () => montar({ publico: true, limite: 10 });

module.exports = { ranking, painel, nomeReduzido };
