// Cria categorias e locais de exemplo no emulador (nunca em produção).
// Uso: npm run exemplo   (com o emulador rodando)
const { emProducao } = require('../src/config/firebase');
const categoriasService = require('../src/services/categoriasService');
const locaisService = require('../src/services/locaisService');
const usuariosService = require('../src/services/usuariosService');

const categorias = [
  { sigla: 'ELE', nome: 'Elétricas' },
  { sigla: 'MAN', nome: 'Manuais' },
  { sigla: 'MED', nome: 'Medição' },
];

const locais = [
  { nome: 'Almoxarifado central', tipo: 'almoxarifado' },
  { nome: 'Obra exemplo', tipo: 'obra' },
];

// Contas só do emulador, para entrar no sistema durante o desenvolvimento.
const usuarios = [
  { nome: 'Admin de teste', email: 'admin@ferrum.local', perfil: 'admin', senha: 'ferrum123' },
  { nome: 'Almoxarife de teste', email: 'almoxarife@ferrum.local', perfil: 'almoxarife', senha: 'ferrum123' },
];

async function main() {
  if (emProducao) throw new Error('Este script só roda no emulador.');

  for (const categoria of categorias) {
    try {
      await categoriasService.criar(categoria);
      console.log(`Categoria ${categoria.sigla} criada`);
    } catch (err) {
      if (err.codigo !== 'CATEGORIA_JA_EXISTE') throw err;
      console.log(`Categoria ${categoria.sigla} já existia`);
    }
  }

  const existentes = (await locaisService.listar()).map((local) => local.nome);
  for (const local of locais.filter((l) => !existentes.includes(l.nome))) {
    await locaisService.criar(local);
    console.log(`Local "${local.nome}" criado`);
  }

  for (const usuario of usuarios) {
    try {
      await usuariosService.criar(usuario);
      console.log(`Usuário ${usuario.email} criado (senha: ${usuario.senha})`);
    } catch (err) {
      if (err.codigo !== 'EMAIL_EM_USO') throw err;
      console.log(`Usuário ${usuario.email} já existia (senha: ${usuario.senha})`);
    }
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
