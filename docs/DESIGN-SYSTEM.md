# Design system do Ferrum

Guia visual do Ferrum (Issell Informática). Vale para quem desenha telas novas (Figma) e para quem escreve o código.
A fonte da verdade é o CSS em `frontend/src/styles/`: se este documento e o código discordarem, o código vence e este arquivo deve ser corrigido.

| Arquivo | O que tem |
|---|---|
| `tokens.css` | Todas as cores, espaços, raios e fontes (variáveis CSS), com os temas e presets |
| `global.css` | Base: tipografia, foco, links, movimento reduzido |
| `layout.css` | Menu, barra do celular, área de conteúdo, cabeçalho de página, botão Voltar |
| `componentes.css` | Cartão, seção, indicadores, passos, botões primário e secundário |
| `telas.css` | Campos, tabelas, etiquetas, avisos, confirmação, esqueleto, ranking e o específico de cada tela |
| `fundo.css` | Fundo animado (painel perfurado com ferramentas penduradas) |

---

## 1. Princípios

1. **Escuro e verde por padrão.** O visual de fábrica é fundo quase preto com verde. O resto (claro, outras cores) é preferência de cada usuário.
2. **Leitura antes de enfeite.** Texto sempre claro sobre o escuro: **nunca cinza escuro**, **mínimo 14 px**. Todo texto passa WCAG AA (4,5:1).
3. **Cor só por token.** Nada de cor solta no CSS de tela: use `var(--...)`. É isso que faz os temas funcionarem.
4. **Hover = fundo na cor principal com texto preto.** Vale para botões secundários, links do menu e botão Voltar.
5. **Ação perigosa sempre pergunta.** Excluir, desativar e sair passam pela janela de confirmação (`Confirmacao.jsx`).
6. **Português simples na interface.** Frases curtas, sem jargão técnico. Erros dizem o que fazer (ex.: "Erro 502 no servidor.").
7. **Celular é primeira classe.** Toda tela é conferida em ~380 px de largura.

---

## 2. Cores

### Como funcionam

As cores mudam por atributos no `<html>`, trocados em **Configurações**:

| Atributo | Valores | Padrão |
|---|---|---|
| `data-tema` | `escuro`, `claro` (a opção "Automático" segue o aparelho) | `escuro` |
| `data-acento` | `verde`, `vermelho`, `azul`, `rosa` | `verde` |
| `data-fundo` | escuro: `padrao`, `grafite`, `azul`, `verde` · claro: `padrao`, `cinza`, `creme` | `padrao` |
| `data-icones` | `acento`, `neutro`, `nenhum` | `acento` |
| `data-menu` | `esquerda`, `direita`, `topo`, `base` | `esquerda` |

Um script em `frontend/index.html` aplica esses atributos antes da página carregar, para não piscar o tema errado.

### Neutros (tema escuro, fundo padrão)

| Token | Valor | Uso |
|---|---|---|
| `--bg` | `#0a0a0a` | Fundo da página e dos campos |
| `--surface` | `#141414` | Cartões, menu, janelas |
| `--border` | `#262626` | Bordas comuns, divisórias de tabela |
| `--border-forte` | `#3a3a3a` | Borda de campos de formulário |
| `--text` | `#f5f5f5` | Texto principal |
| `--text-muted` | `#d4d4d4` | Texto secundário (descrições, rótulos). Continua claro de propósito |
| `--placeholder` | `#8a8a8a` | Só exemplo dentro de campo vazio |
| `--esqueleto-brilho` | `#1f1f1f` | Brilho do carregamento |
| `--furos` | `rgba(255,255,255,.045)` | Furinhos do painel do fundo |

### Neutros (tema claro)

| Token | Valor |
|---|---|
| `--bg` | `#f4f4f5` |
| `--surface` | `#ffffff` |
| `--border` | `#d4d4d8` |
| `--border-forte` | `#a1a1aa` |
| `--text` | `#18181b` |
| `--text-muted` | `#3f3f46` |
| `--placeholder` | `#71717a` |

### Cor principal

Cada cor tem papéis diferentes. **Não troque um pelo outro.**

| Token | Papel |
|---|---|
| `--primary` | **Só preenchimento**: fundo de botão primário, hover, marcador do menu ativo, barra de progresso |
| `--primary-soft` | Hover do botão primário, bordas de destaque |
| `--primary-rgb` | Mesma cor em canais, para transparências: `rgb(var(--primary-rgb) / 0.1)` |
| `--accent` | Cor para **texto e ícones** sobre o fundo (links, código do item, foco) |
| `--on-primary` | Texto sobre `--primary`: sempre `#0a0a0a` (preto) |

| Preset | `--primary` | `--accent` no escuro | `--accent` no claro |
|---|---|---|---|
| Verde (padrão) | `#22c55e` | `#4ade80` | `#166534` |
| Vermelho | `#ef4444` | `#f87171` | `#b91c1c` |
| Azul | `#3b82f6` | `#60a5fa` | `#1d4ed8` |
| Rosa | `#ec4899` | `#f472b6` | `#be185d` |

### Fundos alternativos

| Tema | Preset | `--bg` | `--surface` |
|---|---|---|---|
| Escuro | Preto (padrão) | `#0a0a0a` | `#141414` |
| Escuro | Grafite | `#18181b` | `#222226` |
| Escuro | Azul-noite | `#0b1220` | `#121b2e` |
| Escuro | Verde-escuro | `#07120c` | `#0d1b13` |
| Claro | Claro (padrão) | `#f4f4f5` | `#ffffff` |
| Claro | Cinza | `#e4e4e7` | `#f4f4f5` |
| Claro | Creme | `#f6f1e7` | `#fffaf0` |

### Estados e ligas

| Token | Escuro | Claro | Uso |
|---|---|---|---|
| `--warning` | `#facc15` | `#854d0e` | Ferramenta parada, em manutenção, indicador de alerta |
| `--danger` | `#ef4444` | `#b91c1c` | Erros, excluir, desativado |
| `--bronze` | `#d97706` | `#b45309` | Liga Bronze |
| `--prata` | `#d4d4d4` | `#52525b` | Liga Prata |
| `--ouro` | `#facc15` | `#a16207` | Liga Ouro |
| `--diamante` | `#38bdf8` | `#0369a1` | Liga Diamante |

### Regra para criar cor nova

Todo preset novo precisa passar **4,5:1** como texto em **todos** os fundos do seu tema (a última verificação passou 308 de 308 combinações). Se não passar, ajuste o tom ou não entra.

---

## 3. Tipografia

- **Fonte:** Inter (Google Fonts, pesos 400, 500 e 600). Reserva: `system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`.
- **Corpo:** 15 px, altura de linha 1,5.
- **Mínimo absoluto:** 14 px para qualquer texto lido. Só as etiquetas pequenas (13 px, negrito) e a etiqueta de impressão ficam abaixo.

| Elemento | Tamanho | Peso | Observação |
|---|---|---|---|
| `h1` (título da página) | 26 px | 600 | `letter-spacing: -0.01em` |
| `h2` (título de cartão/seção) | 18 px | 600 | |
| `h3` | 15 px | 600 | |
| Texto | 15 px | 400 | |
| Texto de apoio (`.texto-apoio`) | 14 px | 400 | cor `--text-muted` |
| Rótulo de campo | 14 px | 500 | |
| Botão | 15 px (pequeno: 14 px) | 600 | |
| Número de indicador | 28 px (celular 26 px) | 600 | números tabulares |
| Marca no menu | 17 px | 600 | |

**Números** (códigos, matrículas, quantidades, datas em tabela) usam a classe `.numero` (`font-variant-numeric: tabular-nums`), para os dígitos ficarem alinhados.

---

## 4. Espaço, raio e medidas

| Token | Valor | | Token | Valor |
|---|---|---|---|---|
| `--space-1` | 4 px | | `--radius-sm` | 8 px (botões, campos, avisos) |
| `--space-2` | 8 px | | `--radius` | 12 px (cartões, janelas) |
| `--space-3` | 12 px | | Pílula | 999 px (etiquetas, selos) |
| `--space-4` | 16 px | | | |
| `--space-5` | 24 px | | `--sidebar-width` | 248 px |
| `--space-6` | 32 px | | `--barra-altura` | 64 px |
| `--space-7` | 48 px | | Conteúdo máximo | 1200 px |

- Padding de cartão: 24 px (celular 16 px).
- Entre cartões empilhados: 24 px.
- Cabeçalho da página até o conteúdo: 32 px.
- Altura de campo: 42 px.

### Pontos de quebra

| Largura | O que muda |
|---|---|
| ≤ 1100 px | Filtros do catálogo em 2 colunas |
| ≤ 900 px | Menu vira gaveta com barra no topo; posição do menu deixa de existir |
| ≤ 760 px | Lista de colaboradores vira cartões |
| ≤ 700 px | Tabelas do catálogo viram cartões |
| ≤ 640 px | Cartões mais compactos; indicadores em linha |

---

## 5. Ícones

- **Próprios**, em `components/Icone.jsx`: traço, 24×24, `stroke-width` 1,75, cantos redondos, cor herdada do texto (`currentColor`).
- Disponíveis: `painel`, `ferramenta`, `balcao`, `ranking`, `colaboradores`, `cadastros`, `usuarios`, `lixeira`, `configuracoes` e os de interface (`olho`, `olhoFechado`, `voltar`, `menu`, `fechar`).
- Ícone novo segue o mesmo estilo (traço, sem preenchimento). Não misture biblioteca de ícones de outro estilo.

---

## 6. Componentes

### Botões

| Classe | Aparência | Quando usar |
|---|---|---|
| `.botao.botao-primario` | Fundo `--primary`, texto preto. Hover: `--primary-soft` | A ação principal da tela (uma por área) |
| `.botao.botao-secundario` | Transparente, borda `--border`, texto `--text`. Hover: fundo `--primary`, texto preto | Ações de apoio (Cancelar, Desativar, Baixar modelo) |
| `.botao.botao-perigo` | Transparente, borda `--danger`. Hover: fundo `--danger`, texto preto | Excluir, apagar |
| `.botao-perigo-cheio` | Fundo `--danger` | Botão de confirmar dentro da janela de perigo |
| `.botao-pequeno` | padding 6×12 px, 14 px | Ações em linha de tabela e lista |
| `.botao-voltar` | Pequeno, com seta | Topo de toda página interna (automático no layout) |

Regras:
- Raio 8 px, peso 600, transição de 150 ms.
- Entre botões lado a lado: **12 px de espaço** (`--space-3`).
- Em listas, botões com texto que muda (Desativar/Reativar, Cadastrar/Refazer digital) têm **largura mínima fixa** para não desalinhar.
- Ação em andamento troca o texto ("Salvando…", "Importando…") e desabilita o botão.

### Campos (`.campo`)

- O rótulo fica em cima (14 px, peso 500); o campo tem 42 px de altura, borda `--border-forte` e fundo `--bg`.
- Foco: borda `--accent` + anel `rgb(var(--primary-rgb) / .25)` de 3 px.
- Placeholder é só um exemplo (`--placeholder`), nunca substitui o rótulo.
- Layouts: `.grade-campos` (grade que se adapta, 240 px mínimo por coluna), `.form-linha` (campos e botão na mesma linha), `.campo-largo` (ocupa a linha toda).
- Escolha entre poucas opções grandes: `.escolha-tipo` com `.opcao` (cartão de rádio com título e explicação).

### Cartão e seção

- `.card`: fundo `--surface`, borda `--border`, raio 12 px, padding 24 px.
- `.secao-cadastro`: cartão com título `h2` + texto de apoio + conteúdo, com 16 px entre os blocos.
- `.cabecalho-pagina`: `h1` + uma frase de explicação (`--text-muted`). Com botão ao lado: `.cabecalho-com-acao`.
- `.trilha`: caminho de navegação ("Catálogo / FER-ELE-0001"), links em `--accent`.

### Tabelas

- `.tabela`: 15 px, cabeçalho 14 px peso 600, linhas separadas por `--border`, sem listras.
- `.tabela-clicavel`: a linha inteira abre o item; hover com `rgb(var(--primary-rgb) / .08)`.
- `.celula-acao`: alinhada à direita, botões sem quebrar linha.
- Linha desativada: `data-inativo="true"` deixa o texto em `--text-muted` (e o nome riscado nas listas de pessoas).
- **No celular, a tabela vira cartões** (cada linha um bloco, com rótulo acima de cada valor).
- Tabela larga dentro de cartão: envolver em `.tabela-rolavel` para rolar de lado.

### Etiquetas (`.etiqueta-status`)

Pílula, 13 px, peso 600, borda de 1 px.

| `data-status` | Visual | Texto |
|---|---|---|
| `disponivel` | Borda e texto `--accent`, fundo `primary` a 15% | Disponível / Cadastrada |
| `em_uso` | Borda e texto `--text` | Em uso |
| `parada` | `--warning` com fundo amarelo suave | Parada |
| `manutencao` | Borda e texto `--warning` | Em manutenção |
| `pendente` | Borda `--border-forte`, texto `--text-muted` | Pendente |
| (`.etiqueta-desativado`) | Borda e texto `--danger` | Desativado |

Selos de liga (`.selo-liga[data-liga]`): pílula com borda e texto na cor da liga, 14 px.

### Mensagens

| Classe | Visual | Uso |
|---|---|---|
| `.aviso-sucesso` | Borda `--primary`, fundo `primary` a 10% | Deu certo (com `role="status"`) |
| `.aviso-com-acao` | Igual, com botão à direita | Sucesso que sugere o próximo passo |
| `.proximo-passo` | Faixa no pé da página com botão primário | Guiar o próximo passo de um fluxo |
| `.mensagem-erro` | Borda `--danger`, fundo vermelho a 10%, texto `--text` | Erro (com `role="alert"`) |
| `.estado-vazio` | Borda tracejada, texto `--text-muted` | Lista vazia: diga o que fazer ("Adicione a primeira acima.") |
| `.estado-vazio-grande` | Cartão com título e botão | Tela inteira vazia |
| `.zona-perigo` | Caixa com borda vermelha a 50%, no fim da página | Desativar/Excluir o registro aberto |

### Janela de confirmação (`Confirmacao.jsx`)

- Até 440 px de largura, fundo `--surface`, raio 12 px, fundo da tela escurecido (preto 70% + desfoque de 2 px).
- Estrutura: título na forma de pergunta ("Desativar FER-ELE-0001?"), uma frase dizendo a consequência e os botões **Cancelar** (secundário) e confirmar (com o verbo da ação, nunca "OK").
- `perigo` deixa o botão de confirmar vermelho.
- Abre por cima de tudo (`createPortal`), com animação de 160 ms.

### Carregando

- **Esqueleto** (`Esqueleto.jsx`, `.esqueleto-linha`): faixas de 44 px com brilho passando, no lugar do conteúdo que ainda vai chegar. Preferido em listas e cartões.
- **Spinner** (`.spinner`): só dentro de botão ou em espera curta; `.spinner-grande` (40 px) para tela inteira.
- **Barra de progresso** (`.barra-progresso`): 3 px no topo, cor principal, aparece em toda navegação e chamada à API.

### Menu

- Lateral fixa de 248 px, fundo `--surface`. Grupos separados por uma linha.
- Link: 15 px, peso 500, `--text-muted`. **Ativo**: texto `--text`, fundo `primary` a 10%, barrinha de 3 px na cor principal à esquerda e ícone em `--accent`. **Hover**: fundo `--primary`, texto e ícone pretos.
- No pé: nome e perfil do usuário, botão Sair (com confirmação) e o ponto de situação da API (verde = ok, vermelho = erro).
- Em telas largas pode ficar à esquerda, à direita, em cima ou embaixo. **No celular é sempre gaveta**, aberta pelo botão da barra do topo.

---

## 7. Fundo animado (marca visual)

- Painel perfurado: furinhos a cada 28 px (`--furos`).
- Ferramentas penduradas em ganchos, só em traço (`--fundo-icones`, opacidade 13% no escuro e 20% no claro), balançando devagar (±3°).
- Um brilho suave da cor principal no canto de cima, "respirando" em 12 s.
- No celular algumas ferramentas somem e a opacidade cai 25%. "Sem ícones" mostra só o painel liso.
- Fica atrás de tudo e não recebe clique.

---

## 8. Movimento

| O quê | Duração |
|---|---|
| Hover de botão e link | 120–150 ms |
| Página entrando (sobe 6 px e aparece) | 180 ms |
| Janela de confirmação | 160 ms |
| Cartão de login | 300 ms |
| Brilho do esqueleto | 1,4 s em loop |
| Fundo (balanço e brilho) | contínuo e lento |

Com **"reduzir movimento"** ligado no aparelho, todas as animações e transições são desligadas (o spinner só fica mais lento).

---

## 9. Acessibilidade

- Contraste AA em todo texto, em todos os temas, cores e fundos.
- Foco visível: contorno de 2 px em `--accent`, afastado 2 px.
- Link "Pular para o conteúdo" aparece ao apertar Tab.
- Avisos usam `role="status"` (sucesso) e `role="alert"` (erro).
- Botão só com ícone tem `aria-label`. Coluna de ações de tabela tem `aria-label="Ações"`.
- Nunca use só a cor para dar informação: a etiqueta sempre tem texto ("Desativado", "Pendente").

---

## 10. Escrita na interface

- Português do Brasil, frases curtas, voz direta ("Cadastre a primeira categoria.").
- Botões com verbo + objeto: "Cadastrar colaborador", "Importar 310 colaboradores", "Continuar cadastro do item →".
- Erros dizem o que aconteceu e o que fazer. Código de erro técnico fica visível quando ajuda o suporte ("Erro 502 no servidor.").
- O nome do sistema é **Ferrum** (caixa mista). Rodapé: "© ano Issell Informática. Todos os direitos reservados."
- Evite palavras que dependem do aparelho ("computador", "clique aqui"): o sistema também é usado no celular.

---

## 11. Exceções conhecidas

- **Etiqueta de código de barras** (`EtiquetaCodigoDeBarras.jsx`, `.etiqueta-impressao`): sempre preto no branco, em qualquer tema, porque é para imprimir e ler com leitor.
- Alguns vermelhos translúcidos (`.mensagem-erro`, `.zona-perigo`) ainda usam `rgba(239, 68, 68, …)` fixo, em vez de token. Se criar um tom de perigo por tema, troque por token.
