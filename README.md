# Ferrum — Sistema de Gestão de Ferramentaria

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

Precisa do Node 20+ e do Java 21 (para o emulador do Firebase).

```bash
# Uma vez: instalar as dependências
npm install
npm --prefix backend install
npm --prefix frontend install

# Sobe tudo junto: emulador, API e front
npm run dev
```

Abra **http://localhost:5173**. O painel do emulador (dados e usuários de teste) fica em http://localhost:4000.

Na primeira vez, com o `npm run dev` rodando, crie categorias e locais de exemplo em outro terminal:

```bash
npm run exemplo
```

Os dados do emulador ficam salvos em `emulator-data/` ao fechar com Ctrl+C e voltam na próxima vez.
Fora da nuvem a API **sempre** usa o emulador; o banco de produção nunca é tocado.
Enquanto o login não existe, a API trata o acesso local como administrador (`backend/desenvolvimento.env`).

| Comando | Onde | O que faz |
|---|---|---|
| `npm run dev` | raiz | sobe emulador, API (:3001) e front (:5173) |
| `npm run exemplo` | raiz | cria categorias ELE, MAN, MED e dois locais de exemplo |
| `npm test` | raiz ou backend | sobe um emulador próprio e roda os testes (feche o `npm run dev` antes) |
| `npm run test:rapido` | backend | roda os testes no emulador que já está ligado, sem apagar seus dados |
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
