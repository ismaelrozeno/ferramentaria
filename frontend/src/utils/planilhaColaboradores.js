// Leitura da planilha de colaboradores: Excel (.xlsx) ou CSV (; , ou tab, aspas e acentos do Excel).
// A validação de verdade é da API: aqui só se organiza o arquivo em linhas.
import { lerXlsx } from './lerXlsx.js'

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()

// Nomes de coluna aceitos (sem acento, minúsculos). A primeira coluna do arquivo que bater é a usada.
const COLUNAS = {
  matricula: ['matricula', 'mat', 'registro', 'chapa', 'codigo', 'id'],
  nome: ['nome', 'nome completo', 'colaborador', 'funcionario'],
  equipe: ['equipe', 'encarregado (equipe)', 'equipe (encarregado)', 'encarregado', 'setor', 'departamento', 'area', 'time', 'obra'],
  funcao: ['funcao', 'cargo', 'ocupacao'],
  situacao: ['situacao', 'status'],
  maoDeObra: ['mao de obra', 'tipo de mao de obra'],
}

const ROTULOS = {
  matricula: 'matrícula',
  nome: 'nome',
  equipe: 'equipe',
  funcao: 'função',
  situacao: 'situação',
  maoDeObra: 'mão de obra',
}

const SEM_EQUIPE = ['sem equipe', '-', '—', 'nenhuma']
const ATIVO = { ativo: true, ativa: true, sim: true, s: true, inativo: false, inativa: false, nao: false, n: false, desligado: false, desligada: false }

export const MODELO_CSV =
  '\uFEFFmatricula;nome;funcao;equipe;situacao;mao de obra\r\n' +
  '1001;Maria Souza;Eletricista;Elétrica;ativo;Direta\r\n' +
  '1002;João Lima;Almoxarife;Manutenção;ativo;Indireta\r\n'

export async function lerArquivoDeTexto(arquivo) {
  const bytes = await arquivo.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    // Excel em português costuma salvar CSV em Windows-1252.
    return new TextDecoder('windows-1252').decode(bytes)
  }
}

function detectarSeparador(texto) {
  const primeiraLinha = texto.split(/\r?\n/, 1)[0]
  const contagem = [';', ',', '\t'].map((s) => [s, primeiraLinha.split(s).length - 1])
  return contagem.sort((a, b) => b[1] - a[1])[0][0] || ';'
}

function lerRegistros(texto, separador) {
  const registros = []
  let registro = []
  let campo = ''
  let entreAspas = false

  for (let i = 0; i < texto.length; i += 1) {
    const c = texto[i]
    if (entreAspas) {
      if (c !== '"') campo += c
      else if (texto[i + 1] === '"') {
        campo += '"'
        i += 1
      } else entreAspas = false
    } else if (c === '"') {
      entreAspas = true
    } else if (c === separador) {
      registro.push(campo)
      campo = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto[i + 1] === '\n') i += 1
      registro.push(campo)
      registros.push(registro)
      registro = []
      campo = ''
    } else {
      campo += c
    }
  }
  if (campo !== '' || registro.length > 0) {
    registro.push(campo)
    registros.push(registro)
  }
  return registros
}

// "ativo" → true, "inativo" → false; texto estranho segue como está para a API apontar o erro na linha.
function situacaoDe(valor) {
  const chave = normalizar(valor)
  if (!chave) return undefined
  return chave in ATIVO ? ATIVO[chave] : valor
}

function maoDeObraDe(valor) {
  const chave = normalizar(valor)
  if (!chave) return undefined
  return chave === 'direta' || chave === 'indireta' ? chave : valor
}

/**
 * Transforma as linhas do arquivo (a primeira é o cabeçalho) em
 * { linhas: [{ linha, matricula, nome, equipe?, funcao?, ativo?, maoDeObra? }], colunas: { campo: título no arquivo } }.
 * Coluna que não existe no arquivo não vai na linha: a API mantém o que já estava cadastrado.
 */
export function montarLinhas(registros) {
  if (registros.length === 0 || registros.every((r) => r.every((v) => String(v).trim() === ''))) {
    throw new Error('O arquivo está vazio.')
  }
  const cabecalho = registros[0].map((titulo) => ({ original: String(titulo).trim(), chave: normalizar(titulo) }))

  const indice = {}
  const colunas = {}
  for (const [campo, nomesAceitos] of Object.entries(COLUNAS)) {
    const posicao = cabecalho.findIndex((c) => nomesAceitos.includes(c.chave))
    if (posicao >= 0) {
      indice[campo] = posicao
      colunas[campo] = cabecalho[posicao].original
    }
  }

  const faltando = ['matricula', 'nome'].filter((campo) => indice[campo] === undefined)
  if (faltando.length > 0) {
    throw new Error(
      `Não achei a coluna ${faltando.map((f) => `"${ROTULOS[f]}"`).join(' e ')} na primeira linha do arquivo. ` +
        `Colunas encontradas: ${cabecalho.map((c) => c.original).filter(Boolean).join(', ') || 'nenhuma'}.`,
    )
  }

  const linhas = []
  registros.slice(1).forEach((campos, posicao) => {
    const valor = (campo) => String(campos[indice[campo]] ?? '').trim()
    if (campos.every((v) => String(v ?? '').trim() === '')) return
    const linha = { linha: posicao + 2, matricula: valor('matricula'), nome: valor('nome') }
    if (indice.equipe !== undefined) linha.equipe = SEM_EQUIPE.includes(normalizar(valor('equipe'))) ? '' : valor('equipe')
    if (indice.funcao !== undefined) linha.funcao = valor('funcao')
    if (indice.situacao !== undefined) {
      const ativo = situacaoDe(valor('situacao'))
      if (ativo !== undefined) linha.ativo = ativo
    }
    if (indice.maoDeObra !== undefined) {
      const tipo = maoDeObraDe(valor('maoDeObra'))
      if (tipo !== undefined) linha.maoDeObra = tipo
    }
    linhas.push(linha)
  })

  if (linhas.length === 0) throw new Error('O arquivo tem só o cabeçalho, sem nenhum colaborador.')
  return { linhas, colunas }
}

export function lerCsvDeColaboradores(textoBruto) {
  const texto = textoBruto.replace(/^\uFEFF/, '')
  if (!texto.trim()) throw new Error('O arquivo está vazio.')
  return montarLinhas(lerRegistros(texto, detectarSeparador(texto)))
}

// Escolhe o leitor pelo tipo do arquivo.
export async function lerArquivoDeColaboradores(arquivo) {
  if (/\.xlsx$/i.test(arquivo.name)) return montarLinhas(await lerXlsx(arquivo))
  if (/\.xls$/i.test(arquivo.name)) {
    throw new Error('Esse é o formato antigo do Excel (.xls). No Excel, use Arquivo → Salvar como → Pasta de Trabalho do Excel (.xlsx).')
  }
  return lerCsvDeColaboradores(await lerArquivoDeTexto(arquivo))
}

export { ROTULOS as ROTULOS_COLUNAS }
