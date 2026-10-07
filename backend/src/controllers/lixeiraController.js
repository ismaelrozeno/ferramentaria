const schemas = require('../schemas/configuracoes');
const configuracoesService = require('../services/configuracoesService');
const lixeiraService = require('../services/lixeiraService');

async function listar(req, res) {
  res.json(await lixeiraService.listar());
}

async function excluir(req, res) {
  res.json(await lixeiraService.excluir(req.params.tipo, req.params.id, req.usuario));
}

async function restaurar(req, res) {
  res.json(await lixeiraService.restaurar(req.params.tipo, req.params.id));
}

async function apagarDeVez(req, res) {
  res.json(await lixeiraService.apagarDeVez(req.params.tipo, req.params.id, req.usuario));
}

async function obterConfiguracoes(req, res) {
  res.json(await configuracoesService.obter());
}

async function atualizarConfiguracoes(req, res) {
  const dados = schemas.atualizarConfiguracoes.parse(req.body);
  res.json(await configuracoesService.atualizar(dados));
}

module.exports = { listar, excluir, restaurar, apagarDeVez, obterConfiguracoes, atualizarConfiguracoes };
