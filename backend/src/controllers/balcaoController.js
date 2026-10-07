const schemas = require('../schemas/balcao');
const balcaoService = require('../services/balcaoService');
const colaboradoresService = require('../services/colaboradoresService');

async function retirar(req, res) {
  const dados = schemas.retirada.parse(req.body);
  res.status(201).json(await balcaoService.retirar(dados, req.usuario));
}

async function identificar(req, res) {
  const { biometriaId } = schemas.identificacao.parse(req.body);
  res.json(await colaboradoresService.buscarPorBiometria(biometriaId));
}

async function devolver(req, res) {
  const dados = schemas.devolucao.parse(req.body);
  res.status(201).json(await balcaoService.devolver(dados, req.usuario));
}

async function ultimas(req, res) {
  res.json(await balcaoService.ultimas());
}

module.exports = { identificar, retirar, devolver, ultimas };
