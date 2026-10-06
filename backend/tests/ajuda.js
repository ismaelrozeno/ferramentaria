const request = require('supertest');
const app = require('../src/app');

async function limparBanco() {
  const host = process.env.FIRESTORE_EMULATOR_HOST;
  const projeto = process.env.GCLOUD_PROJECT;
  const res = await fetch(`http://${host}/emulator/v1/projects/${projeto}/databases/(default)/documents`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error(`Não foi possível limpar o emulador (${res.status}). Ele está rodando?`);
}

const api = () => request(app);

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

module.exports = { api, limparBanco, criarCategoria, ferramentaValida, consumoValido };
