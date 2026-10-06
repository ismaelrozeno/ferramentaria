# Instruções para o assistente (Ferrum)

Antes de qualquer tarefa, leia `docs/CONTEXTO.md`: ele tem as decisões, as regras e o estado atual do projeto.

Resumo do que nunca pode ser quebrado:

- Responda e escreva textos de interface em **português do Brasil**, simples e direto.
- O navegador **nunca** acessa o banco: o React fala só com a API `/api`; o SDK do Firebase no front é só para login.
- Só `backend/src/services/` acessa o banco. Toda gravação é validada com zod. Saldo só muda por movimentação.
- Dinheiro em centavos (inteiro). Nada é apagado (`ativo: false`).
- Trabalhe **uma funcionalidade por vez**: rota → teste (Jest + Supertest no emulador) → tela → integração.
- Visual: tokens de `frontend/src/styles/tokens.css`, texto claro (nunca cinza escuro, mínimo 14 px),
  hover verde com texto preto, confirmação com `Confirmacao.jsx`, nome do sistema "Ferrum".
- **Nunca** coloque senhas ou chaves no código: o repositório é público. Senhas ficam em `ACESSOS.local.md` (fora do Git).
- Ao terminar: `npm --prefix frontend run lint`, `npm test` (API) e, se pedido "publica", commit + push +
  `npx firebase deploy --only functions,hosting --project ferramentaria-68f52`.
