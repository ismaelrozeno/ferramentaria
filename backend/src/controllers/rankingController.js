const rankingService = require('../services/rankingService');

async function ranking(req, res) {
  res.json(await rankingService.ranking());
}

async function painel(req, res) {
  res.json(await rankingService.painel());
}

module.exports = { ranking, painel };
