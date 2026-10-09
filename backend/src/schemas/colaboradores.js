const { z } = require('./comum');
const { camposNaoEditaveis } = require('./cadastrosDeApoio');

const matricula = z
  .string({ error: 'Informe a matrícula.' })
  .trim()
  .toUpperCase()
  .min(1, 'Informe a matrícula.')
  .max(30, 'A matrícula pode ter no máximo 30 caracteres.')
  .regex(/^[A-Z0-9._-]+$/, 'A matrícula só pode ter letras, números, ponto, hífen e sublinhado.');

const nome = z.string({ error: 'Informe o nome.' }).trim().min(2, 'Informe o nome.').max(100);

const equipe = z.string().trim().max(60, 'A equipe pode ter no máximo 60 caracteres.');

const funcao = z.string().trim().max(80, 'A função pode ter no máximo 80 caracteres.');

const maoDeObra = z.enum(['direta', 'indireta'], { error: 'Mão de obra deve ser "direta" ou "indireta".' });

const criarColaborador = z.object({
  matricula,
  nome,
  equipe: equipe.default(''),
  funcao: funcao.default(''),
  maoDeObra: maoDeObra.nullable().default(null),
});

// Na importação, coluna que não veio no arquivo não apaga o que já está cadastrado.
const linhaImportacao = z.object({
  matricula,
  nome,
  equipe: equipe.optional(),
  funcao: funcao.optional(),
  maoDeObra: maoDeObra.optional(),
  ativo: z.boolean({ error: 'Situação deve ser "ativo" ou "inativo".' }).optional(),
});

const atualizarColaborador = z.strictObject(
  {
    nome: nome.optional(),
    equipe: equipe.optional(),
    funcao: funcao.optional(),
    maoDeObra: maoDeObra.nullable().optional(),
    ativo: z.boolean().optional(),
  },
  camposNaoEditaveis,
);

const importarColaboradores = z.object({
  linhas: z
    .array(z.unknown(), { error: 'Envie a lista de colaboradores em "linhas".' })
    .min(1, 'O arquivo não tem nenhum colaborador.')
    .max(2000, 'Máximo de 2000 colaboradores por importação.'),
});

const biometriaId = z
  .string({ error: 'Informe a leitura da digital.' })
  .trim()
  .min(1, 'Informe a leitura da digital.')
  .max(200, 'Leitura de digital inválida.');

const cadastrarBiometria = z.object({ biometriaId });

module.exports = {
  matricula,
  biometriaId,
  cadastrarBiometria,
  criarColaborador,
  atualizarColaborador,
  importarColaboradores,
  linhaImportacao,
};
