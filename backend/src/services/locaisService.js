const { Timestamp } = require('firebase-admin/firestore');
const { db } = require('../config/firebase');
const { naoEncontrado } = require('../utils/erros');
const { docParaJson } = require('../utils/serializar');

const locais = () => db.collection('locais');

async function listar() {
  const snap = await locais().orderBy('nome').get();
  return snap.docs.filter((doc) => !doc.data().excluidoEm).map(docParaJson);
}

async function criar({ nome, tipo }) {
  const ref = await locais().add({ nome, tipo, ativo: true, criadoEm: Timestamp.now() });
  return docParaJson(await ref.get());
}

async function atualizar(id, dados) {
  const ref = locais().doc(id);
  const snap = await ref.get();
  if (!snap.exists) throw naoEncontrado('LOCAL_NAO_ENCONTRADO', 'Local não encontrado.');
  await ref.update(dados);
  return docParaJson(await ref.get());
}

module.exports = { listar, criar, atualizar };
