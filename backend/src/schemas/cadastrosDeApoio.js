const { z, sigla } = require('./comum');

const nome = (campo) =>
  z.string({ error: `Informe o nome ${campo}.` }).trim().min(2, `Informe o nome ${campo}.`).max(60);

const camposNaoEditaveis = {
  error: (issue) =>
    issue.code === 'unrecognized_keys' ? `Estes campos não podem ser alterados: ${issue.keys.join(', ')}.` : undefined,
};

const criarCategoria = z.object({ sigla, nome: nome('da categoria') });

const atualizarCategoria = z.strictObject(
  { nome: nome('da categoria').optional(), ativa: z.boolean().optional() },
  camposNaoEditaveis,
);

const tipoDeLocal = z.enum(['almoxarifado', 'obra', 'setor'], {
  error: 'Escolha o tipo: almoxarifado, obra ou setor.',
});

const criarLocal = z.object({ nome: nome('do local'), tipo: tipoDeLocal });

const atualizarLocal = z.strictObject(
  { nome: nome('do local').optional(), tipo: tipoDeLocal.optional(), ativo: z.boolean().optional() },
  camposNaoEditaveis,
);

module.exports = { criarCategoria, atualizarCategoria, criarLocal, atualizarLocal, camposNaoEditaveis };
