const { emProducao } = require('../config/firebase');
const { ErroApi } = require('../utils/erros');

// Usuário fixo enquanto o login (fatia 4) não existe. Só funciona fora da
// nuvem e com LOGIN_DESATIVADO=true; em produção esta linha nunca é usada.
const ADMIN_DE_TESTE = { uid: 'admin-de-teste', nome: 'Administrador (teste)', perfil: 'admin' };

function autenticar(req, res, next) {
  if (!emProducao && process.env.LOGIN_DESATIVADO === 'true') {
    req.usuario = ADMIN_DE_TESTE;
    return next();
  }
  throw new ErroApi(401, 'NAO_AUTENTICADO', 'Faça login para continuar.');
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
