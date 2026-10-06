# Sistema de Ferramentaria

Sistema para gestão de ferramentaria: ferramentas, empréstimos, manutenção e calibração.

## Estrutura

```
ferramentaria/
├── backend/                 API Node + Express
│   ├── src/
│   │   ├── routes/          definição das rotas (URL → controller)
│   │   ├── controllers/     recebe a requisição e devolve a resposta
│   │   ├── services/        regras de negócio e acesso ao banco
│   │   ├── middlewares/     autenticação, validação, tratamento de erros
│   │   └── config/          variáveis de ambiente, cliente do Supabase
│   └── tests/               testes (Jest + Supertest)
├── frontend/                React + Vite
│   ├── public/              arquivos estáticos (ícones, imagens)
│   └── src/
│       ├── pages/           uma pasta/arquivo por tela
│       ├── components/      peças reutilizáveis (tabela, modal, botão)
│       ├── services/        chamadas à API
│       ├── hooks/           lógica reutilizável do React
│       └── styles/          estilos globais
└── docs/                    decisões, requisitos, links do Figma
```

## Como rodar

Precisa do Node 20+. Em dois terminais:

```bash
# Terminal 1 — API (http://localhost:3001)
cd backend
npm install
npm run dev

# Terminal 2 — front (http://localhost:5173)
cd frontend
npm install
npm run dev
```

Em desenvolvimento, o front encaminha `/api` para a API (proxy no `vite.config.js`).

| Comando | Onde | O que faz |
|---|---|---|
| `npm test` | backend | roda os testes (Jest + Supertest) |
| `npm run lint` | frontend | verifica o código (ESLint) |
| `npm run build` | frontend | gera a versão de produção em `dist/` |

## Fluxo de desenvolvimento

1. Design no Figma
2. Validação com o cliente
3. Uma funcionalidade por vez:
   - rota no back-end
   - teste unitário
   - tela no front-end
   - teste da integração front ↔ back
   - só então a próxima funcionalidade

Detalhes da stack e das decisões em [docs/decisoes.md](docs/decisoes.md).
