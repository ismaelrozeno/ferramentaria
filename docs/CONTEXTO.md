# Ferrum: contexto do projeto

Resumo para quem continuar o desenvolvimento (pessoa ou assistente de IA). Atualizado em 06/10/2026.
Leia inteiro antes de mudar o código: as regras abaixo foram combinadas com o dono do projeto.

## O que é

Ferrum é um sistema web de gestão de ferramentaria e almoxarifado: cadastro de ferramentas e
materiais, retirada e devolução no balcão (código de barras + digital), estoque, dashboard, BI e
ranking gamificado dos colaboradores. Direitos: **Issell Informática**. Responsável: Ismael.

| O quê | Onde |
|---|---|
| Sistema no ar | https://ferramentaria-68f52.web.app |
| Repositório | https://github.com/ismaelrozeno/ferramentaria |
| Projeto Firebase | `ferramentaria-68f52` (plano Blaze, crédito da empresa), região `southamerica-east1` |
| Especificação funcional (parte 1) | PDF com o Ismael (versão 2: colaborador sem login, biometria, Code 128, painel sem login) |
| Especificação técnica (parte 2) | https://claude.ai/code/artifact/c7a46901-a1c0-4ea5-95c8-e9ac953bcd22 (**desatualizada** em alguns pontos, ver "Pendências") |
| Senhas e contas | arquivo local `ACESSOS.local.md`, **fora do Git** (está no `.gitignore`); nunca colocar senhas no repositório |

## Como o Ismael gosta de trabalhar

- **Uma funcionalidade por vez, completa** (fatia vertical): rota na API → teste automático → tela → teste
  da integração → só então a próxima.
- Fazer, testar de verdade e **mostrar o resultado** (prints da tela no computador e no celular).
- Quando ele diz **"publica"**: commit + push no GitHub + `npx firebase deploy` (o que tiver mudado) e conferir o site no ar.
- Explicações em português simples, sem jargão desnecessário.

## Arquitetura (regras inegociáveis)

O Ismael já ficou preso ao Firebase num projeto antigo. Por isso o banco precisa ser **trocável**:

1. **O navegador nunca acessa o banco.** O React fala só com a API (`/api`). O SDK do Firebase no
   navegador é usado **só para login** (Authentication).
2. **Só `backend/src/services/` acessa o banco.** Rotas e controllers não sabem qual banco é.
3. **Toda gravação é validada com zod** (`backend/src/schemas/`), com mensagens em português.
4. **Coleções planas**, uma por entidade, ligadas por ID, sem subcoleções.
5. **O saldo só muda por movimentação** registrada (nunca editado); erros se corrigem com estorno.
6. **Dinheiro em centavos** (número inteiro). Datas sem hora como texto `AAAA-MM-DD`; momentos como Timestamp.
7. Nada some sem passar pela lixeira: desativar é `ativo: false`; excluir envia para a lixeira (`excluidoEm`, restaurável). Só o admin apaga de vez, sempre com pop-up. Apagar de vez remove o cadastro, mas as `movimentacoes` ficam (guardam código e nome do momento) e os contadores de código nunca voltam atrás. Com a lixeira desligada (`configuracoes/sistema.lixeiraAtiva`), Excluir apaga direto. Qualquer lista nova deve ignorar registros com `excluidoEm`.
8. `firestore.rules` **nega tudo**: só a API (firebase-admin) acessa.

```
Navegador (React) ──HTTPS + token──> API Express (Cloud Function "api") ──> Firestore
        └── login ──> Firebase Authentication
Firebase Hosting serve o front e encaminha /api/** para a função.
```

## Stack

- **Front** (`frontend/`): React 19 + Vite, React Router, TanStack Query, Firebase SDK (só login), JsBarcode
  (etiqueta Code 128), ESLint. CSS puro com variáveis (`styles/tokens.css`), sem Tailwind.
- **API** (`backend/`): Node (local 24, nuvem 22), Express 5 em CommonJS, firebase-admin, firebase-functions,
  zod 4, helmet. Camadas: `routes → controllers → services`. Entrada da função: `backend/index.js`.
- **Testes**: Jest + Supertest contra o emulador do Firebase.

## Perfis e acesso

| Perfil | Login | Pode |
|---|---|---|
| Administrador | sim | tudo: cadastros, usuários, desativações |
| Almoxarife | sim | consultar, operar o balcão (retirada/devolução, quando existir) |
| Colaborador | **não** | identifica-se no balcão por digital (ou matrícula + justificativa) |

A API confere o token e o perfil em toda rota (`middlewares/autenticacao.js`); o front também esconde
o que o perfil não pode fazer. Cadastro do usuário fica em `usuarios/{uid}`.

## Identidade visual (preferências do Ismael)

- Nome **Ferrum** (caixa mista, não "FERRUM"). Logo em `frontend/src/assets/logo.png` (original em `docs/marca/`).
- Tema escuro com verde: tokens em `frontend/src/styles/tokens.css`.
- **Sem texto cinza escuro**: `--text-muted` é `#D4D4D4`; texto mínimo de 14 px.
- **Hover = fundo verde (`--primary`) com texto preto (`--bg`)** em botões e itens do menu.
- Fundo animado de ferramentaria (`components/FundoOficina.jsx`): faz parte da identidade, manter.
- Ações destrutivas e "Sair" pedem confirmação com `components/Confirmacao.jsx` (nunca `window.confirm`).
- Botão **Voltar** no topo de todas as páginas, menos no Dashboard (`components/BotaoVoltar.jsx`).
- Rodapé: "© <ano> Issell Informática. Todos os direitos reservados." (no celular, quebra após o ponto).
- Tudo responsivo; no celular o catálogo vira cartões.

## Como rodar, testar e publicar

```bash
npm install && npm --prefix backend install && npm --prefix frontend install   # uma vez
npm run dev        # emulador (auth + firestore) + API :3001 + front :5173
npm run exemplo    # cria categorias ELE/MAN/MED, locais e contas de teste no emulador
npm test           # testes da API num emulador separado (portas 8180/9199); pode rodar com o dev ligado
npx firebase deploy --only functions,hosting,firestore --project ferramentaria-68f52
```

- Precisa de **Java 21** para o emulador. Contas de teste locais e de produção: ver `ACESSOS.local.md`.
- Fora da nuvem a API **sempre** usa o emulador (`backend/src/config/firebase.js`): o banco real nunca é tocado por engano.
- Os dados do emulador ficam em `emulator-data/` (fora do Git).

## Armadilhas já resolvidas (não repetir)

- **Projeto dentro do OneDrive**: depois de trocar de ramo no Git, o Vite pode servir arquivos antigos. Reiniciar o `npm run dev`.
- **Jest + firebase-admin/auth**: o pacote ESM `jose` quebra o Jest. Solução: `firebase-admin/auth` é carregado
  só quando usado, e `jwks-rsa` é substituído nos testes (`backend/tests/substitutos/`).
- **oxlint** foi trocado por ESLint (binário nativo era bloqueado pelo Windows).
- **Não deixar senhas no código**: o repositório é público. `ferrum123` só existe no emulador local.
- **Deploy das functions** exige política de limpeza de imagens (já configurada: 1 dia).

## Estado atual

| Parte | Situação |
|---|---|
| Layout, identidade visual, logo, fundo animado | pronto |
| Categorias e locais | pronto |
| Cadastro de itens (ferramenta/consumo), código FER/CON-SIG-0001 sem repetir, etiqueta Code 128 | pronto |
| Catálogo (busca sem acento, filtros) e detalhe com histórico | pronto |
| Login, perfis, gestão de usuários, login salvo no navegador | pronto |
| Publicação (Hosting + Function em São Paulo + Firestore) | no ar |
| Colaboradores (cadastro por importação de CSV, lista, desativar) | pronto, ainda não publicado |
| Balcão: retirada e devolução identificam a pessoa pela digital (leitor simulado) ou, em último caso, pelo nome com sugestões + motivo; devolução mostra as ferramentas que estão com a pessoa; tudo ou nada | pronto, ainda não publicado; falta o leitor real (SDK) |
| Ranking: pontos pela devolução (10 no prazo, 3 atrasada, bônus a cada 5 seguidas), ligas por XP, `/ranking` e painel público `/painel` | pronto, ainda não publicado |
| Configurações: tema claro/escuro/sistema, cor principal (verde, vermelho, azul, rosa), fundo, ícones do fundo, posição do menu (esquerda, direita, topo, base), link de troca de senha por e-mail | pronto, ainda não publicado |
| Lixeira e exclusão (itens, colaboradores, categorias, locais, usuários), liga/desliga em Configurações, restaurar e apagar de vez | pronto, ainda não publicado |
| 139 testes automáticos da API | passando |

## Aparência (decisões)

- Preferências ficam em `usuarios/{uid}.preferencias` (por usuário) e em `localStorage['ferrum.aparencia']` (evita piscar o tema errado; script em `frontend/index.html`).
- Cores só por presets em `frontend/src/styles/tokens.css` (atributos `data-tema/acento/fundo/icones/menu` no `<html>`). `--primary` é só preenchimento (texto sobre ele é `--on-primary`, preto); `--accent` é a cor para texto/ícones sobre o fundo. Todo preset novo precisa passar WCAG 4.5:1 (texto) em todos os fundos.
- Menu em cima/embaixo/direita só em telas largas; no celular é sempre a gaveta.

## Próximos passos (em aberto)


1. **Importar Excel (.xlsx)** de colaboradores: hoje só CSV; o Ismael vai enviar o formato real do arquivo.
2. **Leitor de digital real**: a tela e a API já identificam por `biometriaId`; hoje o leitor é simulado. Para o real, um programa no PC do balcão (SDK do fabricante) responde `POST {VITE_LEITOR_URL}/ler` com `{ biometriaId }` (o leitor
   biométrico precisa do SDK do fabricante no computador do balcão; modelo ainda não escolhido).
   Devolução pode ser feita por outra pessoa (`devolvidoPorId`); pontos vão para o responsável.
3. **Demais movimentações**: entrada por compra (custo médio ponderado), alocadas, transferência,
   manutenção, baixa e ajuste (com aprovação do admin), estorno.
4. **Dashboard** com os 10 indicadores e gráficos; tarefas agendadas (paradas, alertas).
5. **BI profissional** com painéis por tema e **exportação para planilha** (gerada na API). Comparação
   "mês anterior" exige fotos mensais dos indicadores.
6. **Gamificação — falta:** medalhas e promoção/rebaixamento semanal de liga (hoje a liga vem do XP total). Regras de pontos em `backend/src/services/pontuacao.js`.
7. Telas pendentes: editar item (a API já aceita), foto da ferramenta (precisa do Storage).
8. **Atualizar a parte 2 da especificação** com as mudanças: colaboradores sem login, Code 128 no lugar de QR,
   painel sem login, contadores com ID `FER-ELE`/`CON-ELE`, `ferramentas` sem `localId`
   (o local atual fica em `itens.localId`), rotas de usuários, login com senha inicial definida pelo admin.
9. Recomendações ainda não feitas: tornar o repositório **privado**; criar alerta de orçamento de R$ 20 no Google Cloud.
