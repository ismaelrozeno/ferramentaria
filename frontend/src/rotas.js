// Páginas do sistema, na ordem do menu lateral.
// `pronta: false` = a página ainda não foi construída (mostra "Em construção").
// `perfis` = só esses perfis veem o item no menu (sem `perfis`: todos).
export const gruposDoMenu = [
  {
    nome: 'Operação',
    rotas: [
      { caminho: '/', titulo: 'Dashboard', icone: 'painel', pronta: true },
      {
        caminho: '/catalogo',
        titulo: 'Catálogo',
        pronta: true,
        icone: 'ferramenta',
        descricao: 'Lista de ferramentas e materiais, com busca por código ou nome e filtros por status, categoria e origem.',
      },
      {
        caminho: '/balcao',
        titulo: 'Balcão',
        pronta: true,
        icone: 'balcao',
        descricao: 'Retirada e devolução com leitor de código de barras e confirmação pela digital do colaborador.',
      },
      {
        caminho: '/ranking',
        titulo: 'Ranking',
        pronta: true,
        icone: 'ranking',
        descricao: 'Pontos, sequências e ligas semanais dos colaboradores.',
      },
    ],
  },
  {
    nome: 'Cadastros',
    rotas: [
      {
        caminho: '/colaboradores',
        titulo: 'Colaboradores',
        pronta: true,
        icone: 'colaboradores',
        descricao: 'Quem retira ferramentas no balcão: matrícula, equipe e cadastro da digital.',
      },
      {
        caminho: '/cadastros',
        titulo: 'Categorias e locais',
        pronta: true,
        icone: 'cadastros',
        descricao: 'Categorias com sigla de 3 letras (usadas no código FER-ELE-0001) e locais: almoxarifados, obras e setores.',
      },
      {
        caminho: '/usuarios',
        titulo: 'Usuários',
        pronta: true,
        perfis: ['admin'],
        icone: 'usuarios',
        descricao: 'Contas de administradores e almoxarifes que entram no sistema.',
      },
      {
        caminho: '/lixeira',
        titulo: 'Lixeira',
        pronta: true,
        perfis: ['admin'],
        exigeLixeira: true,
        icone: 'lixeira',
        descricao: 'Itens, colaboradores, categorias, locais e usuários excluídos: restaurar ou apagar de vez.',
      },
      {
        caminho: '/configuracoes',
        titulo: 'Configurações',
        pronta: true,
        icone: 'configuracoes',
        descricao: 'Aparência, posição do menu e senha da sua conta.',
      },
    ],
  },
]

export const todasAsRotas = gruposDoMenu.flatMap((grupo) => grupo.rotas)
