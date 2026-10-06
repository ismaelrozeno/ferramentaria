const schemas = require('../schemas/itens');
const itensService = require('../services/itensService');

async function listar(req, res) {
  const filtros = schemas.filtrosDoCatalogo.parse(req.query);
  res.json(await itensService.listar(filtros));
}

async function buscar(req, res) {
  res.json(await itensService.buscar(req.params.id));
}

async function buscarPorCodigo(req, res) {
  res.json(await itensService.buscarPorCodigo(req.params.codigo));
}

async function criar(req, res) {
  const dados = schemas.criarItem.parse(req.body);
  res.status(201).json(await itensService.criar(dados, req.usuario));
}

async function atualizar(req, res) {
  const dados = schemas.atualizarItem.parse(req.body);
  res.json(await itensService.atualizar(req.params.id, dados));
}

async function desativar(req, res) {
  await itensService.desativar(req.params.id);
  res.status(204).end();
}

module.exports = { listar, buscar, buscarPorCodigo, criar, atualizar, desativar };
