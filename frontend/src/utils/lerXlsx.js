// Leitor mínimo de planilha Excel (.xlsx) sem biblioteca: o .xlsx é um zip de XMLs.
// Devolve as linhas da primeira aba como listas de texto, igual ao leitor de CSV.

const MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'

// Lê o índice do zip (diretório central) e devolve { nome: { metodo, inicio, tamanho } }.
function indiceDoZip(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  let fim = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i -= 1) {
    if (dv.getUint32(i, true) === 0x06054b50) {
      fim = i
      break
    }
  }
  if (fim < 0) throw new Error('O arquivo não parece ser uma planilha .xlsx válida.')

  const total = dv.getUint16(fim + 10, true)
  let pos = dv.getUint32(fim + 16, true)
  const arquivos = {}
  const texto = new TextDecoder()
  for (let n = 0; n < total; n += 1) {
    if (dv.getUint32(pos, true) !== 0x02014b50) break
    const metodo = dv.getUint16(pos + 10, true)
    const tamanho = dv.getUint32(pos + 20, true)
    const nomeLen = dv.getUint16(pos + 28, true)
    const extraLen = dv.getUint16(pos + 30, true)
    const comentLen = dv.getUint16(pos + 32, true)
    const local = dv.getUint32(pos + 42, true)
    const nome = texto.decode(bytes.subarray(pos + 46, pos + 46 + nomeLen))
    const inicio = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true)
    arquivos[nome] = { metodo, inicio, tamanho }
    pos += 46 + nomeLen + extraLen + comentLen
  }
  return arquivos
}

async function extrair(bytes, arquivos, nome) {
  const entrada = arquivos[nome]
  if (!entrada) return null
  const dados = bytes.subarray(entrada.inicio, entrada.inicio + entrada.tamanho)
  if (entrada.metodo === 0) return new TextDecoder().decode(dados)
  if (entrada.metodo !== 8) throw new Error('A planilha usa uma compactação que não sei ler. Salve de novo no Excel.')
  const fluxo = new Blob([dados]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new Response(fluxo).text()
}

const xml = (texto) => new DOMParser().parseFromString(texto, 'application/xml')

// "BC12" → 54 (posição da coluna, começando em 0).
function colunaDe(referencia) {
  const letras = /^[A-Z]+/.exec(referencia)[0]
  return [...letras].reduce((soma, letra) => soma * 26 + letra.charCodeAt(0) - 64, 0) - 1
}

const textoDe = (no) => [...no.getElementsByTagNameNS(MAIN, 't')].map((t) => t.textContent).join('')

// Caminho do XML da primeira aba (respeitando a ordem das abas, não o nome do arquivo).
async function caminhoDaPrimeiraAba(bytes, arquivos) {
  const livro = await extrair(bytes, arquivos, 'xl/workbook.xml')
  const relacoes = await extrair(bytes, arquivos, 'xl/_rels/workbook.xml.rels')
  const primeira = livro && xml(livro).getElementsByTagNameNS(MAIN, 'sheet')[0]
  const id = primeira?.getAttribute('r:id')
  const alvo = relacoes && id && [...xml(relacoes).getElementsByTagName('Relationship')].find((r) => r.getAttribute('Id') === id)?.getAttribute('Target')
  if (!alvo) return 'xl/worksheets/sheet1.xml'
  return alvo.startsWith('/') ? alvo.slice(1) : `xl/${alvo}`
}

export async function lerXlsx(arquivo) {
  const bytes = new Uint8Array(await arquivo.arrayBuffer())
  const arquivos = indiceDoZip(bytes)

  const compartilhados = await extrair(bytes, arquivos, 'xl/sharedStrings.xml')
  const textos = compartilhados ? [...xml(compartilhados).getElementsByTagNameNS(MAIN, 'si')].map(textoDe) : []

  const aba = await extrair(bytes, arquivos, await caminhoDaPrimeiraAba(bytes, arquivos))
  if (!aba) throw new Error('Não achei nenhuma aba com dados na planilha.')

  return [...xml(aba).getElementsByTagNameNS(MAIN, 'row')].map((linha) => {
    const valores = []
    for (const celula of linha.getElementsByTagNameNS(MAIN, 'c')) {
      const tipo = celula.getAttribute('t')
      const v = celula.getElementsByTagNameNS(MAIN, 'v')[0]?.textContent ?? ''
      let valor
      if (tipo === 's') valor = textos[Number(v)] ?? ''
      else if (tipo === 'inlineStr') valor = textoDe(celula)
      else if (tipo === 'b') valor = v === '1' ? 'VERDADEIRO' : 'FALSO'
      else valor = v
      const referencia = celula.getAttribute('r')
      valores[referencia ? colunaDe(referencia) : valores.length] = valor
    }
    return Array.from(valores, (valor) => valor ?? '')
  })
}
