const { z } = require('./comum');

const atualizarConfiguracoes = z
  .strictObject(
    { lixeiraAtiva: z.boolean({ error: 'Informe se a lixeira fica ligada ou desligada.' }).optional() },
    { error: 'Há uma configuração que não existe.' },
  )
  .refine((dados) => Object.keys(dados).length > 0, 'Informe ao menos uma configuração.');

module.exports = { atualizarConfiguracoes };
