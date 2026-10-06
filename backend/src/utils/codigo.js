// Código do item: FER-ELE-0001 (ferramenta) ou CON-ELE-0001 (material de consumo).
const PREFIXOS = { ferramenta: 'FER', consumo: 'CON' };

function formatarCodigo(tipo, sigla, numero) {
  return `${PREFIXOS[tipo]}-${sigla}-${String(numero).padStart(4, '0')}`;
}

// Cada prefixo + categoria tem seu próprio contador: FER-ELE e CON-ELE começam em 1.
function idDoContador(tipo, sigla) {
  return `${PREFIXOS[tipo]}-${sigla}`;
}

module.exports = { formatarCodigo, idDoContador };
