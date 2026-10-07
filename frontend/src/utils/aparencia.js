export const PADRAO = { tema: 'escuro', acento: 'verde', fundo: 'padrao', icones: 'acento', menu: 'esquerda' }

// Cópia no navegador: o tema certo aparece antes da página carregar (o script de index.html lê a mesma chave).
const CHAVE = 'ferrum.aparencia'

export const TEMAS = [
  { id: 'escuro', nome: 'Escuro', texto: 'Fundo escuro, o visual padrão.' },
  { id: 'claro', nome: 'Claro', texto: 'Fundo claro, bom para ambientes com muita luz.' },
  { id: 'sistema', nome: 'Seguir o computador', texto: 'Muda sozinho conforme o Windows.' },
]

export const ACENTOS = [
  { id: 'verde', nome: 'Verde', cor: '#22c55e' },
  { id: 'vermelho', nome: 'Vermelho', cor: '#ef4444' },
  { id: 'azul', nome: 'Azul', cor: '#3b82f6' },
  { id: 'rosa', nome: 'Rosa', cor: '#ec4899' },
]

export const FUNDOS = {
  escuro: [
    { id: 'padrao', nome: 'Preto', cor: '#0a0a0a' },
    { id: 'grafite', nome: 'Grafite', cor: '#18181b' },
    { id: 'azul', nome: 'Azul-noite', cor: '#0b1220' },
    { id: 'verde', nome: 'Verde-escuro', cor: '#07120c' },
  ],
  claro: [
    { id: 'padrao', nome: 'Claro', cor: '#f4f4f5' },
    { id: 'cinza', nome: 'Cinza', cor: '#e4e4e7' },
    { id: 'creme', nome: 'Creme', cor: '#f6f1e7' },
  ],
}

export const ICONES = [
  { id: 'acento', nome: 'Cor principal', texto: 'As ferramentas do fundo usam a cor escolhida.' },
  { id: 'neutro', nome: 'Cinza', texto: 'Discretas, sem cor.' },
  { id: 'nenhum', nome: 'Sem ícones', texto: 'Só o fundo liso.' },
]

export const MENUS = [
  { id: 'esquerda', nome: 'Esquerda', texto: 'Menu lateral à esquerda (padrão).' },
  { id: 'direita', nome: 'Direita', texto: 'Menu lateral à direita.' },
  { id: 'topo', nome: 'Em cima', texto: 'Barra no topo da tela.' },
  { id: 'base', nome: 'Embaixo', texto: 'Barra no pé da tela.' },
]

export function lerLocal() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE)) ?? {}
  } catch {
    return {}
  }
}

export function salvarLocal(prefs) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(prefs))
  } catch {
    // Sem armazenamento local (navegação privada, por exemplo): o tema vale só até fechar a aba.
  }
}

export const escuroDoSistema = () => window.matchMedia('(prefers-color-scheme: dark)').matches

export const resolverTema = (tema) => (tema === 'sistema' ? (escuroDoSistema() ? 'escuro' : 'claro') : tema)

// Escreve a aparência nos atributos do <html>; os estilos em tokens.css e layout.css fazem o resto.
export function aplicarAparencia(prefs) {
  const raiz = document.documentElement
  const tema = resolverTema(prefs.tema)
  raiz.dataset.tema = tema
  raiz.dataset.acento = prefs.acento
  raiz.dataset.fundo = prefs.fundo
  raiz.dataset.icones = prefs.icones
  raiz.dataset.menu = prefs.menu

  const cor = getComputedStyle(raiz).getPropertyValue('--bg').trim()
  if (cor) document.querySelector('meta[name="theme-color"]')?.setAttribute('content', cor)
  return tema
}
