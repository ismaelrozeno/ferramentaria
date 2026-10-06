const schemas = require('../schemas/cadastrosDeApoio');
const categoriasService = require('../services/categoriasService');
const locaisService = require('../services/locaisService');

async function listarCategorias(req, res) {
  res.json(await categoriasService.listar());
}

async function criarCategoria(req, res) {
  const dados = schemas.criarCategoria.parse(req.body);
  res.status(201).json(await categoriasService.criar(dados));
}

async function atualizarCategoria(req, res) {
  const dados = schemas.atualizarCategoria.parse(req.body);
  res.json(await categoriasService.atualizar(req.params.sigla.toUpperCase(), dados));
}

async function listarLocais(req, res) {
  res.json(await locaisService.listar());
}

async function criarLocal(req, res) {
  const dados = schemas.criarLocal.parse(req.body);
  res.status(201).json(await locaisService.criar(dados));
}

async function atualizarLocal(req, res) {
  const dados = schemas.atualizarLocal.parse(req.body);
  res.json(await locaisService.atualizar(req.params.id, dados));
}

module.exports = {
  listarCategorias,
  criarCategoria,
  atualizarCategoria,
  listarLocais,
  criarLocal,
  atualizarLocal,
};
