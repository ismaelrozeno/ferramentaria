const preferencias = require('../schemas/preferencias');
const schemas = require('../schemas/usuarios');
const usuariosService = require('../services/usuariosService');

async function listar(req, res) {
  res.json(await usuariosService.listar());
}

async function criar(req, res) {
  const dados = schemas.criarUsuario.parse(req.body);
  res.status(201).json(await usuariosService.criar(dados));
}

async function atualizar(req, res) {
  const dados = schemas.atualizarUsuario.parse(req.body);
  res.json(await usuariosService.atualizar(req.params.uid, dados, req.usuario));
}

async function atualizarPreferencias(req, res) {
  const dados = preferencias.atualizarPreferencias.parse(req.body);
  res.json(await usuariosService.atualizarPreferencias(req.usuario.uid, dados));
}

module.exports = { listar, criar, atualizar, atualizarPreferencias };
