const { initializeApp, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Nas Cloud Functions o Google define K_SERVICE / FUNCTION_TARGET.
const emProducao = Boolean(process.env.K_SERVICE || process.env.FUNCTION_TARGET);
const projeto = process.env.GCLOUD_PROJECT || 'ferramentaria-68f52';

if (!emProducao) {
  // Fora da nuvem, sempre o emulador: o banco real nunca é tocado por engano.
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080';
  process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099';
  process.env.GCLOUD_PROJECT ??= projeto;
}

if (!getApps().length) {
  initializeApp({ projectId: projeto });
}

const db = getFirestore();
db.settings({ ignoreUndefinedProperties: true });

// Carregado só quando usado (login, fatia 4): o módulo de Auth puxa dependências
// que o Jest não carrega no topo do arquivo.
function auth() {
  return require('firebase-admin/auth').getAuth();
}

module.exports = { db, auth, emProducao };
