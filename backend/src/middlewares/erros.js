const { z } = require('zod');
const { ErroApi } = require('../utils/erros');

function rotaNaoEncontrada(req, res) {
  res.status(404).json({
    erro: 'ROTA_NAO_ENCONTRADA',
    mensagem: `A rota ${req.method} ${req.originalUrl} não existe.`,
  });
}

// eslint-disable-next-line no-unused-vars -- o Express reconhece o tratador pelos 4 parâmetros
function tratarErros(err, req, res, next) {
  if (err instanceof ErroApi) {
    return res.status(err.status).json({ erro: err.codigo, mensagem: err.message });
  }

  if (err instanceof z.ZodError) {
    const campos = err.issues.map((issue) => ({
      campo: issue.path.join('.'),
      mensagem: issue.message,
    }));
    return res.status(400).json({
      erro: 'DADOS_INVALIDOS',
      mensagem: campos.map((c) => c.mensagem).join(' '),
      campos,
    });
  }

  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ erro: 'JSON_INVALIDO', mensagem: 'O corpo da requisição não é um JSON válido.' });
  }

  console.error(err);
  return res.status(500).json({
    erro: 'ERRO_INTERNO',
    mensagem: 'Erro inesperado no servidor. Tente de novo; se continuar, avise o administrador.',
  });
}

module.exports = { rotaNaoEncontrada, tratarErros };
