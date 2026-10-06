const request = require('supertest');
const { Timestamp } = require('firebase-admin/firestore');
const app = require('../src/app');
const { db } = require('../src/config/firebase');

const projeto = () => process.env.GCLOUD_PROJECT;
const estado = { tokenAdmin: null, uidAdmin: null };
let contador = 0;

async function limparBanco() {
  const firestore = process.env.FIRESTORE_EMULATOR_HOST;
  const autenticacao = process.env.FIREBASE_AUTH_EMULATOR_HOST;
  const respostas = await Promise.all([
    fetch(`http://${firestore}/emulator/v1/projects/${projeto()}/databases/(default)/documents`, { method: 'DELETE' }),
    fetch(`http://${autenticacao}/emulator/v1/projects/${projeto()}/accounts`, { method: 'DELETE' }),
  ]);
  if (respostas.some((r) => !r.ok)) throw new Error('Não foi possível limpar o emulador. Ele está rodando?');
}

// Cria uma conta no emulador de login e devolve o token, como o navegador faria.
async function criarConta(email, senha = 'senha-de-teste') {
  const res = await fetch(
    `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=chave-de-teste`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: senha, returnSecureToken: true }),
    },
  );
  const dados = await res.json();
  if (!res.ok) throw new Error(`Falha ao criar conta: ${JSON.stringify(dados)}`);
  return { uid: dados.localId, token: dados.idToken };
}

// Conta de login + cadastro em `usuarios` com o perfil pedido.
async function criarUsuario(perfil = 'admin', extra = {}) {
  contador += 1;
  const email = `${perfil}-${contador}@teste.local`;
  const conta = await criarConta(email);
  await db
    .collection('usuarios')
    .doc(conta.uid)
    .set({ nome: `${perfil} ${contador}`, email, perfil, ativo: true, criadoEm: Timestamp.now(), ...extra });
  return { ...conta, email };
}

async function prepararBanco() {
  await limparBanco();
  const admin = await criarUsuario('admin', { nome: 'Administrador (teste)' });
  estado.tokenAdmin = admin.token;
  estado.uidAdmin = admin.uid;
}

// Requisições com o token informado (ou sem token, se for null).
function cliente(token) {
  const comToken = (req) => (token ? req.set('Authorization', `Bearer ${token}`) : req);
  return {
    get: (url) => comToken(request(app).get(url)),
    post: (url) => comToken(request(app).post(url)),
    patch: (url) => comToken(request(app).patch(url)),
    delete: (url) => comToken(request(app).delete(url)),
  };
}

// Atalho: requisições como o administrador criado em prepararBanco().
const api = () => cliente(estado.tokenAdmin);

async function criarCategoria(sigla = 'ELE', nome = 'Elétricas') {
  const res = await api().post('/api/categorias').send({ sigla, nome });
  if (res.status !== 201) throw new Error(`Falha ao criar categoria: ${JSON.stringify(res.body)}`);
  return res.body;
}

const ferramentaValida = (extra = {}) => ({
  tipo: 'ferramenta',
  nome: 'Furadeira de impacto',
  categoriaId: 'ELE',
  marca: 'Bosch',
  modelo: 'GSB 550',
  numeroSerie: 'SN-123',
  valor: 45990,
  origem: 'propria',
  ...extra,
});

const consumoValido = (extra = {}) => ({
  tipo: 'consumo',
  nome: 'Disco de corte 4 1/2"',
  categoriaId: 'ELE',
  unidade: 'un',
  estoqueMinimo: 10,
  pontoPedido: 20,
  estoqueMaximo: 100,
  ...extra,
});

module.exports = {
  estado,
  api,
  cliente,
  limparBanco,
  prepararBanco,
  criarConta,
  criarUsuario,
  criarCategoria,
  ferramentaValida,
  consumoValido,
};
