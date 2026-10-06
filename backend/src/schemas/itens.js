const { z, sigla, textoOpcional, dataOpcional, centavos, quantidadeEstoque } = require('./comum');
const { camposNaoEditaveis } = require('./cadastrosDeApoio');

const nome = z.string({ error: 'Informe o nome do item.' }).trim().min(2, 'Informe o nome do item.').max(120);

const comuns = {
  nome,
  categoriaId: sigla,
  localId: textoOpcional(60),
};

const criarFerramenta = z.object({
  tipo: z.literal('ferramenta'),
  ...comuns,
  marca: textoOpcional(60),
  modelo: textoOpcional(60),
  numeroSerie: textoOpcional(60),
  valor: centavos,
  dataAquisicao: dataOpcional,
  origem: z.enum(['propria', 'alocada'], { error: 'Escolha a origem: própria ou alocada.' }),
  fornecedor: textoOpcional(120),
  fimContratoLocacao: dataOpcional,
});

const criarConsumo = z.object({
  tipo: z.literal('consumo'),
  ...comuns,
  unidade: z.enum(['un', 'm', 'kg', 'cx', 'l', 'par'], { error: 'Escolha a unidade: un, m, kg, cx, l ou par.' }),
  estoqueMinimo: quantidadeEstoque.default(0),
  pontoPedido: quantidadeEstoque.default(0),
  estoqueMaximo: quantidadeEstoque.default(0),
});

const criarItem = z.discriminatedUnion('tipo', [criarFerramenta, criarConsumo], {
  error: 'Escolha o tipo do item: ferramenta ou consumo.',
});

// Saldo, código, tipo e categoria nunca são editados (o saldo só muda por movimentação).
const atualizarItem = z.strictObject(
  {
    nome: nome.optional(),
    localId: textoOpcional(60),
    marca: textoOpcional(60),
    modelo: textoOpcional(60),
    numeroSerie: textoOpcional(60),
    valor: centavos.optional(),
    dataAquisicao: dataOpcional,
    fornecedor: textoOpcional(120),
    fimContratoLocacao: dataOpcional,
    estoqueMinimo: quantidadeEstoque.optional(),
    pontoPedido: quantidadeEstoque.optional(),
    estoqueMaximo: quantidadeEstoque.optional(),
  },
  camposNaoEditaveis,
);

const filtrosDoCatalogo = z.object({
  busca: z.string().trim().optional(),
  tipo: z.enum(['ferramenta', 'consumo']).optional(),
  status: z.enum(['disponivel', 'em_uso', 'parada', 'manutencao']).optional(),
  categoriaId: z.string().trim().toUpperCase().optional(),
  origem: z.enum(['propria', 'alocada']).optional(),
});

module.exports = { criarItem, atualizarItem, filtrosDoCatalogo };
