const { z } = require('./comum');

const opcao = (valores, mensagem) => z.enum(valores, { error: mensagem });

// Cada campo é opcional: a tela manda só o que a pessoa mudou.
const atualizarPreferencias = z
  .strictObject(
    {
      tema: opcao(['escuro', 'claro', 'sistema'], 'Escolha um tema válido.').optional(),
      acento: opcao(['verde', 'vermelho', 'azul', 'rosa'], 'Escolha uma cor principal válida.').optional(),
      fundo: opcao(['padrao', 'grafite', 'azul', 'verde', 'cinza', 'creme'], 'Escolha um fundo válido.').optional(),
      icones: opcao(['acento', 'neutro', 'nenhum'], 'Escolha uma opção válida para os ícones.').optional(),
      menu: opcao(['esquerda', 'direita', 'topo', 'base'], 'Escolha uma posição válida para o menu.').optional(),
    },
    { error: 'Há uma opção de aparência que não existe.' },
  )
  .refine((dados) => Object.keys(dados).length > 0, 'Informe ao menos uma opção.');

module.exports = { atualizarPreferencias };
