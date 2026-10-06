const moeda = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

// Dinheiro chega da API em centavos (inteiro): 125090 -> "R$ 1.250,90"
export function formatarMoeda(centavos) {
  if (centavos === null || centavos === undefined) return '—'
  return moeda.format(centavos / 100)
}

// "1.250,90" ou "1250.90" digitado no formulário -> 125090 centavos
export function paraCentavos(texto) {
  const limpo = String(texto ?? '').replace(/[^\d,.-]/g, '')
  if (!limpo) return null
  const normalizado = limpo.includes(',') ? limpo.replace(/\./g, '').replace(',', '.') : limpo
  const numero = Number(normalizado)
  return Number.isFinite(numero) ? Math.round(numero * 100) : null
}

// "2026-12-31" -> "31/12/2026" (datas sem hora: não passam pelo fuso)
export function formatarData(iso) {
  if (!iso) return '—'
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [ano, mes, dia] = iso.split('-')
    return `${dia}/${mes}/${ano}`
  }
  return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
}
