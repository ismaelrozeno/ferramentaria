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
