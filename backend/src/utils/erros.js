// Erro de regra de negócio ou de requisição, com status HTTP e código fixo.
// Formato da resposta: { erro: 'SALDO_INSUFICIENTE', mensagem: 'Saldo atual 2, saída pedida 5.' }
class ErroApi extends Error {
  constructor(status, codigo, mensagem) {
    super(mensagem);
    this.status = status;
    this.codigo = codigo;
  }
}

const dadoInvalido = (codigo, mensagem) => new ErroApi(400, codigo, mensagem);
const naoEncontrado = (codigo, mensagem) => new ErroApi(404, codigo, mensagem);
const conflito = (codigo, mensagem) => new ErroApi(409, codigo, mensagem);

module.exports = { ErroApi, dadoInvalido, naoEncontrado, conflito };
