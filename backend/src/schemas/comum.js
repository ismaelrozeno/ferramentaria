const { z } = require('zod');

z.config(z.locales.pt());

const sigla = z
  .string({ error: 'Informe a sigla da categoria.' })
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'A sigla deve ter 3 letras, sem acento (ex.: ELE).');

// Texto opcional: string vazia vinda de formulário vira "não informado".
const textoOpcional = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((valor) => valor || undefined);

const dataOpcional = z
  .union([z.iso.date({ error: 'Use uma data no formato AAAA-MM-DD.' }), z.literal('')])
  .optional()
  .transform((valor) => valor || undefined);

const centavos = z
  .number({ error: 'Informe o valor em centavos (número inteiro).' })
  .int('Informe o valor em centavos (número inteiro).')
  .min(0, 'O valor não pode ser negativo.');

const quantidadeEstoque = z.number().int().min(0, 'Use um número igual ou maior que zero.');

module.exports = { z, sigla, textoOpcional, dataOpcional, centavos, quantidadeEstoque };
