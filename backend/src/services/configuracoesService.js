const { db } = require('../config/firebase');

// Configurações do sistema inteiro (não confundir com as preferências de cada usuário).
const PADRAO = { lixeiraAtiva: true };

const documento = () => db.collection('configuracoes').doc('sistema');

async function obter() {
  const snap = await documento().get();
  return { ...PADRAO, ...(snap.exists ? snap.data() : {}) };
}

async function atualizar(dados) {
  await documento().set(dados, { merge: true });
  return obter();
}

module.exports = { obter, atualizar };
