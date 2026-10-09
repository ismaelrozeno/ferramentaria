const { z, dataOpcional, textoOpcional } = require('./comum');
const { matricula, biometriaId } = require('./colaboradores');

const codigo = z.string({ error: 'Informe o código do item.' }).trim().toUpperCase().min(3, 'Informe o código do item.').max(30);

const semRepetidos = (lista, chave = (x) => x) => new Set(lista.map(chave)).size === lista.length;

const retirada = z
  .object({
  biometriaId: biometriaId.optional(),
  matricula: matricula.optional(),
  justificativa: z.string().trim().max(200).optional(),
  prazoDevolucao: dataOpcional,
  itens: z
    .array(
      z.object({
        codigo,
        quantidade: z
          .number({ error: 'Informe a quantidade (número inteiro).' })
          .int('Informe a quantidade (número inteiro).')
          .min(1, 'A quantidade mínima é 1.')
          .max(9999)
          .default(1),
      }),
      { error: 'Informe os itens da retirada.' },
    )
    .min(1, 'Informe ao menos um item.')
    .max(30, 'Máximo de 30 itens por retirada.')
    .refine((itens) => semRepetidos(itens, (i) => i.codigo), 'Há códigos repetidos na lista.'),
  })
  .superRefine((dados, ctx) => {
    if (dados.biometriaId) return;
    if (!dados.matricula) {
      ctx.addIssue({ code: 'custom', path: ['matricula'], message: 'Identifique o colaborador pela digital ou pela matrícula.' });
    } else if ((dados.justificativa ?? '').length < 5) {
      ctx.addIssue({ code: 'custom', path: ['justificativa'], message: 'Informe por que a digital não foi usada (mínimo 5 letras).' });
    }
  });

const identificacao = z.object({ biometriaId });

const devolucao = z
  .object({
  codigos: z
    .array(codigo, { error: 'Informe os códigos das ferramentas.' })
    .min(1, 'Informe ao menos uma ferramenta.')
    .max(30, 'Máximo de 30 ferramentas por devolução.')
    .refine((codigos) => semRepetidos(codigos), 'Há códigos repetidos na lista.'),
  devolvidoPorBiometriaId: biometriaId.optional(),
  devolvidoPorMatricula: z
    .union([matricula, z.literal('')])
    .optional()
    .transform((valor) => valor || undefined),
  justificativa: z.string().trim().max(200).optional(),
  observacao: textoOpcional(200),
  })
  .superRefine((dados, ctx) => {
    // Toda devolução leva a assinatura de recebimento de quem a entrega: digital ou, sem ela, nome + motivo.
    if (!dados.devolvidoPorBiometriaId && !dados.devolvidoPorMatricula) {
      ctx.addIssue({ code: 'custom', path: ['devolvidoPorBiometriaId'], message: 'Informe quem assina o recebimento (digital ou nome).' });
    } else if (dados.devolvidoPorMatricula && !dados.devolvidoPorBiometriaId && (dados.justificativa ?? '').length < 5) {
      ctx.addIssue({ code: 'custom', path: ['justificativa'], message: 'Informe por que a digital não foi usada (mínimo 5 letras).' });
    }
  });

module.exports = { retirada, devolucao, identificacao };
