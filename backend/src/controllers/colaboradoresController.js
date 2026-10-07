const schemas = require('../schemas/colaboradores');
const colaboradoresService = require('../services/colaboradoresService');

async function listar(req, res) {
  res.json(await colaboradoresService.listar());
}

async function buscar(req, res) {
  res.json(await colaboradoresService.buscar(req.params.matricula.toUpperCase()));
}

async function cadastrarBiometria(req, res) {
  const { biometriaId } = schemas.cadastrarBiometria.parse(req.body);
  res.json(await colaboradoresService.cadastrarBiometria(req.params.matricula.toUpperCase(), biometriaId));
}

async function criar(req, res) {
  const dados = schemas.criarColaborador.parse(req.body);
  res.status(201).json(await colaboradoresService.criar(dados));
}

async function atualizar(req, res) {
  const dados = schemas.atualizarColaborador.parse(req.body);
  res.json(await colaboradoresService.atualizar(req.params.matricula.toUpperCase(), dados));
}

// Cada linha é validada sozinha: as boas entram, as ruins voltam no relatório com o número da linha.
async function importar(req, res) {
  const { linhas } = schemas.importarColaboradores.parse(req.body);
  const validas = [];
  const erros = [];

  linhas.forEach((bruta, indice) => {
    const linha = Number.isInteger(bruta?.linha) ? bruta.linha : indice + 1;
    const resultado = schemas.criarColaborador.safeParse(bruta);
    if (resultado.success) {
      validas.push({ linha, ...resultado.data });
    } else {
      erros.push({ linha, mensagem: resultado.error.issues.map((problema) => problema.message).join(' ') });
    }
  });

  const relatorio = await colaboradoresService.importar(validas);
  relatorio.erros = [...erros, ...relatorio.erros].sort((a, b) => a.linha - b.linha);
  res.json(relatorio);
}

module.exports = { listar, buscar, cadastrarBiometria, criar, atualizar, importar };
