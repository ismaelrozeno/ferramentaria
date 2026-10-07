const { Timestamp } = require('firebase-admin/firestore');
const { db } = require('../config/firebase');
const { conflito, naoEncontrado } = require('../utils/erros');
const { docParaJson } = require('../utils/serializar');

const categorias = () => db.collection('categorias');

async function listar() {
  const snap = await categorias().orderBy('sigla').get();
  return snap.docs.filter((doc) => !doc.data().excluidoEm).map(docParaJson);
}

async function criar({ sigla, nome }) {
  const ref = categorias().doc(sigla);
  const categoria = { sigla, nome, ativa: true, criadaEm: Timestamp.now() };
  try {
    await ref.create(categoria);
  } catch (err) {
    // 6 = ALREADY_EXISTS
    if (err.code === 6) throw conflito('CATEGORIA_JA_EXISTE', `Já existe uma categoria com a sigla ${sigla}.`);
    throw err;
  }
  return docParaJson(await ref.get());
}

async function atualizar(sigla, dados) {
  const ref = categorias().doc(sigla);
  const snap = await ref.get();
  if (!snap.exists) throw naoEncontrado('CATEGORIA_NAO_ENCONTRADA', `Categoria ${sigla} não encontrada.`);
  await ref.update(dados);
  return docParaJson(await ref.get());
}

module.exports = { listar, criar, atualizar };
