const { auth } = require('../config/firebase');
const usuariosService = require('../services/usuariosService');
const { ErroApi } = require('../utils/erros');

// Confere o token do Firebase Authentication (cabeçalho Authorization: Bearer <token>)
// e carrega o cadastro do usuário em `usuarios/{uid}`.
async function autenticar(req, res, next) {
  const cabecalho = req.get('Authorization') ?? '';
  const token = cabecalho.startsWith('Bearer ') ? cabecalho.slice(7) : null;
  if (!token) throw new ErroApi(401, 'NAO_AUTENTICADO', 'Faça login para continuar.');

  let decodificado;
  try {
    decodificado = await auth().verifyIdToken(token);
  } catch {
    throw new ErroApi(401, 'SESSAO_INVALIDA', 'Sua sessão expirou. Entre de novo.');
  }

  const usuario = await usuariosService.buscarParaLogin(decodificado);
  if (!usuario) {
    throw new ErroApi(403, 'SEM_CADASTRO', 'Seu login existe, mas você não está cadastrado no FERRUM. Peça acesso ao administrador.');
  }
  if (!usuario.ativo) {
    throw new ErroApi(403, 'USUARIO_DESATIVADO', 'Seu acesso ao FERRUM foi desativado. Fale com o administrador.');
  }

  req.usuario = { uid: usuario.id, nome: usuario.nome, email: usuario.email, perfil: usuario.perfil };
  next();
}

function exigirPerfil(...perfis) {
  return (req, res, next) => {
    if (!perfis.includes(req.usuario?.perfil)) {
      throw new ErroApi(403, 'SEM_PERMISSAO', 'Seu perfil não tem permissão para esta ação.');
    }
    next();
  };
}

module.exports = { autenticar, exigirPerfil };
