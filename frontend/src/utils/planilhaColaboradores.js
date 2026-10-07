// Leitura da planilha de colaboradores (CSV). Aceita ; , ou tab, aspas e acentos do Excel.
// A validação de verdade é da API: aqui só se organiza o arquivo em linhas.

const normalizar = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()

// Nomes de coluna aceitos (sem acento, minúsculos).
const COLUNAS = {
  matricula: ['matricula', 'mat', 'registro', 'chapa', 'codigo', 'id'],
  nome: ['nome', 'nome completo', 'colaborador', 'funcionario'],
  equipe: ['equipe', 'setor', 'departamento', 'area', 'time', 'obra'],
}

export const MODELO_CSV = '\uFEFFmatricula;nome;equipe\r\n1001;Maria Souza;Elétrica\r\n1002;João Lima;Manutenção\r\n'

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

/**
 * Devolve { linhas: [{ linha, matricula, nome, equipe }], colunas: { matricula, nome, equipe } }.
 * `linha` é a posição no arquivo (1 = cabeçalho). Lança Error com mensagem em português se o arquivo não servir.
 */
export function lerCsvDeColaboradores(textoBruto) {
  const texto = textoBruto.replace(/^\uFEFF/, '')
  if (!texto.trim()) throw new Error('O arquivo está vazio.')

  const registros = lerRegistros(texto, detectarSeparador(texto))
  const cabecalho = registros[0].map((titulo) => ({ original: titulo.trim(), chave: normalizar(titulo) }))

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
    const rotulos = { matricula: '"matricula"', nome: '"nome"' }
    throw new Error(
      `Não achei a coluna ${faltando.map((f) => rotulos[f]).join(' e ')} na primeira linha do arquivo. ` +
        `Colunas encontradas: ${cabecalho.map((c) => c.original).filter(Boolean).join(', ') || 'nenhuma'}.`,
    )
  }

  const linhas = []
  registros.slice(1).forEach((campos, posicao) => {
    if (campos.every((valor) => valor.trim() === '')) return
    linhas.push({
      linha: posicao + 2,
      matricula: (campos[indice.matricula] ?? '').trim(),
      nome: (campos[indice.nome] ?? '').trim(),
      equipe: indice.equipe === undefined ? '' : (campos[indice.equipe] ?? '').trim(),
    })
  })

  if (linhas.length === 0) throw new Error('O arquivo tem só o cabeçalho, sem nenhum colaborador.')
  return { linhas, colunas }
}
