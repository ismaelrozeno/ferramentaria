// Cria categorias e locais de exemplo no emulador (nunca em produção).
// Uso: npm run exemplo   (com o emulador rodando)
const { emProducao } = require('../src/config/firebase');
const categoriasService = require('../src/services/categoriasService');
const locaisService = require('../src/services/locaisService');

const categorias = [
  { sigla: 'ELE', nome: 'Elétricas' },
  { sigla: 'MAN', nome: 'Manuais' },
  { sigla: 'MED', nome: 'Medição' },
];

const locais = [
  { nome: 'Almoxarifado central', tipo: 'almoxarifado' },
  { nome: 'Obra exemplo', tipo: 'obra' },
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
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
