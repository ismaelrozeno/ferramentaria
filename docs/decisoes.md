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

## Lint do front: ESLint em vez de oxlint
O template do Vite vem com oxlint, mas o binário nativo dele é bloqueado pelo
Controle de Aplicativo do Windows nesta máquina. ESLint é JavaScript puro e não
tem esse problema.
