const { z } = require('./comum');
const { camposNaoEditaveis } = require('./cadastrosDeApoio');

const perfil = z.enum(['admin', 'almoxarife'], { error: 'Escolha o perfil: administrador ou almoxarife.' });
const nome = z.string({ error: 'Informe o nome.' }).trim().min(2, 'Informe o nome.').max(80);

const criarUsuario = z.object({
  nome,
  email: z.email({ error: 'Informe um e-mail válido.' }).trim().toLowerCase(),
  perfil,
  senha: z.string({ error: 'Informe a senha inicial.' }).min(8, 'A senha inicial precisa ter pelo menos 8 caracteres.'),
});

const atualizarUsuario = z.strictObject(
  { nome: nome.optional(), perfil: perfil.optional(), ativo: z.boolean().optional() },
  camposNaoEditaveis,
);

module.exports = { criarUsuario, atualizarUsuario };
