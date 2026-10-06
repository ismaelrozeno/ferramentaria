# Decisões do projeto

## Stack
| Parte | Tecnologia | Hospedagem |
|---|---|---|
| Front-end | React + Vite | Firebase Hosting |
| API | Node + Express, testes com Jest + Supertest | Cloud Functions (Firebase) |
| Banco e login | Supabase (PostgreSQL) | Supabase |

**Por quê:** os dados são relacionais (ferramentas, funcionários, empréstimos,
manutenção, calibração), então PostgreSQL facilita relatórios e integridade.
A empresa tem crédito no Firebase, usado para a hospedagem.

## Fluxo de desenvolvimento
Figma → validação com o cliente → uma funcionalidade por vez:
rota no back → teste unitário → tela no front → teste da integração → próxima.
