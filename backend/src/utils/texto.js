// Texto sem acento e em minúsculas, para busca ("Furadeira" encontra "furadeira").
function normalizar(texto) {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

module.exports = { normalizar };
