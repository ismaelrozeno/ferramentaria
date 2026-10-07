// Regras de pontos do ranking. Para mudar valores, é só editar aqui.
const XP = {
  noPrazo: 10, // devolveu dentro do prazo (ou sem prazo definido)
  atrasada: 3, // devolveu, mas depois do prazo
  bonusSequencia: 5, // bônus a cada N devoluções seguidas no prazo
  aCadaSequencia: 5,
};

// A liga vem do XP acumulado.
const LIGAS = [
  { id: 'bronze', nome: 'Bronze', minimo: 0 },
  { id: 'prata', nome: 'Prata', minimo: 200 },
  { id: 'ouro', nome: 'Ouro', minimo: 500 },
  { id: 'diamante', nome: 'Diamante', minimo: 1000 },
];

function ligaPorXp(xp) {
  return [...LIGAS].reverse().find((liga) => xp >= liga.minimo) ?? LIGAS[0];
}

// Segunda-feira da semana (horário de São Paulo), no formato AAAA-MM-DD.
function semanaDe(data = new Date()) {
  const hoje = data.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const base = new Date(`${hoje}T12:00:00Z`);
  const diasDesdeSegunda = (base.getUTCDay() + 6) % 7;
  base.setUTCDate(base.getUTCDate() - diasDesdeSegunda);
  return base.toISOString().slice(0, 10);
}

// Devolve o novo estado do colaborador e quantos pontos essa devolução rendeu.
// `noPrazo`: true (no prazo), false (atrasada) ou null (sem prazo, conta como no prazo).
function aplicarDevolucao(colaborador, noPrazo, semana) {
  const estado = {
    xp: colaborador.xp ?? 0,
    xpSemana: colaborador.semanaId === semana ? (colaborador.xpSemana ?? 0) : 0,
    semanaId: semana,
    sequencia: colaborador.sequencia ?? 0,
    melhorSequencia: colaborador.melhorSequencia ?? 0,
    devolucoesNoPrazo: colaborador.devolucoesNoPrazo ?? 0,
    devolucoesAtrasadas: colaborador.devolucoesAtrasadas ?? 0,
  };

  let ganho;
  if (noPrazo === false) {
    estado.sequencia = 0;
    estado.devolucoesAtrasadas += 1;
    ganho = XP.atrasada;
  } else {
    estado.sequencia += 1;
    estado.devolucoesNoPrazo += 1;
    ganho = XP.noPrazo + (estado.sequencia % XP.aCadaSequencia === 0 ? XP.bonusSequencia : 0);
  }

  estado.xp += ganho;
  estado.xpSemana += ganho;
  estado.melhorSequencia = Math.max(estado.melhorSequencia, estado.sequencia);
  return { ganho, estado };
}

module.exports = { XP, LIGAS, ligaPorXp, semanaDe, aplicarDevolucao };
