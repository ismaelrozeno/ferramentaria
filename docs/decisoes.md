# Decisões do projeto

## Stack
| Parte | Tecnologia | Hospedagem |
|---|---|---|
| Front-end | React + Vite | Firebase Hosting |
| API | Node + Express, testes com Jest + Supertest | Cloud Functions (Firebase) |
| Banco e login | **Em decisão:** Firebase (Firestore + Auth) ou Supabase (PostgreSQL) | — |

**Por quê:** a empresa já paga o Firebase (R$ 200 de crédito), então ele é o favorito.
O Supabase seria tecnicamente melhor, porque os dados são relacionais (ferramentas,
funcionários, empréstimos, manutenção, calibração), mas exigiria aprovar um novo custo.
Por isso o banco precisa ser trocável (veja abaixo).

## Fluxo de desenvolvimento
Figma → validação com o cliente → uma funcionalidade por vez:
rota no back → teste unitário → tela no front → teste da integração → próxima.

## Banco trocável (Firebase hoje, Supabase no futuro se necessário)
O banco ainda está em decisão. Firebase é o favorito porque a empresa já paga.
Para que uma troca futura seja simples, valem estas regras:

1. **O front nunca acessa o banco diretamente**, só a API.
2. **Só `backend/src/services/` acessa o banco.** Rotas e controllers não sabem qual banco é.
3. **Toda gravação é validada na API** (campos, tipos, obrigatórios). Os dados ficam sempre no mesmo formato.
4. **Coleções planas, uma por entidade** (`ferramentas`, `funcionarios`, `emprestimos`...),
   ligadas por ID, sem subcoleções aninhadas. Cada coleção equivale a uma tabela SQL.
5. **Modelo de dados documentado** em `docs/` e atualizado a cada funcionalidade.
6. **Regras de negócio com teste.** Depois de uma troca, os testes validam que nada quebrou.

## Lint do front: ESLint em vez de oxlint
O template do Vite vem com oxlint, mas o binário nativo dele é bloqueado pelo
Controle de Aplicativo do Windows nesta máquina. ESLint é JavaScript puro e não
tem esse problema.
