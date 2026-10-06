const { Timestamp } = require('firebase-admin/firestore');

// Converte Timestamps do Firestore em texto ISO para a resposta JSON.
function paraJson(valor) {
  if (valor instanceof Timestamp) return valor.toDate().toISOString();
  if (Array.isArray(valor)) return valor.map(paraJson);
  if (valor && typeof valor === 'object') {
    return Object.fromEntries(Object.entries(valor).map(([chave, v]) => [chave, paraJson(v)]));
  }
  return valor;
}

function docParaJson(snap) {
  return { id: snap.id, ...paraJson(snap.data()) };
}

module.exports = { paraJson, docParaJson };
