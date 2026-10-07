const { Timestamp } = require('firebase-admin/firestore');
const { auth, db } = require('../config/firebase');
const { conflito, naoEncontrado } = require('../utils/erros');
const { docParaJson } = require('../utils/serializar');

const usuarios = () => db.collection('usuarios');

/**
 * Usuário do Ferrum para quem acabou de apresentar um token válido.
 * Exceção única: o UID em ADMIN_INICIAL_UID vira administrador no primeiro
 * acesso, para criar o primeiro admin em produção sem acesso ao banco.
 */
async function buscarParaLogin(token) {
  const ref = usuarios().doc(token.uid);
  const snap = await ref.get();
  if (snap.exists) return docParaJson(snap);

  if (process.env.ADMIN_INICIAL_UID && token.uid === process.env.ADMIN_INICIAL_UID) {
    await ref.set({
      nome: token.name || token.email,
      email: token.email,
      perfil: 'admin',
      ativo: true,
      criadoEm: Timestamp.now(),
    });
    return docParaJson(await ref.get());
  }

  return null;
}

async function listar() {
  const snap = await usuarios().orderBy('nome').get();
  return snap.docs.map(docParaJson);
}

async function criar({ nome, email, perfil, senha }) {
  let conta;
  try {
    conta = await auth().createUser({ email, password: senha, displayName: nome });
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      throw conflito('EMAIL_EM_USO', `Já existe uma conta com o e-mail ${email}.`);
    }
    throw err;
  }

  try {
    await usuarios().doc(conta.uid).set({ nome, email, perfil, ativo: true, criadoEm: Timestamp.now() });
  } catch (err) {
    // Sem o cadastro no banco, a conta de login não serve para nada: desfaz.
    await auth().deleteUser(conta.uid);
    throw err;
  }
  return docParaJson(await usuarios().doc(conta.uid).get());
}

async function atualizar(uid, dados, quemAltera) {
  const ref = usuarios().doc(uid);
  const snap = await ref.get();
  if (!snap.exists) throw naoEncontrado('USUARIO_NAO_ENCONTRADO', 'Usuário não encontrado.');

  const removeProprioAcesso = uid === quemAltera.uid && (dados.ativo === false || (dados.perfil && dados.perfil !== 'admin'));
  if (removeProprioAcesso) {
    throw conflito('ALTERACAO_PROPRIA', 'Você não pode desativar nem tirar o perfil de administrador da sua própria conta.');
  }

  await ref.update(dados);
  if (dados.ativo !== undefined) {
    await auth().updateUser(uid, { disabled: !dados.ativo });
    if (!dados.ativo) await auth().revokeRefreshTokens(uid);
  }
  if (dados.nome) await auth().updateUser(uid, { displayName: dados.nome });

  return docParaJson(await ref.get());
}

// Mescla com o que já estava salvo: mudar só o tema não apaga a cor escolhida.
async function atualizarPreferencias(uid, dados) {
  await usuarios().doc(uid).set({ preferencias: dados }, { merge: true });
  return (await usuarios().doc(uid).get()).data().preferencias;
}

module.exports = { buscarParaLogin, listar, criar, atualizar, atualizarPreferencias };
