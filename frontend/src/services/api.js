const BASE_URL = import.meta.env.VITE_API_URL ?? ''

async function get(path) {
  const res = await fetch(`${BASE_URL}/api${path}`)
  if (!res.ok) {
    throw new Error(`Erro ${res.status} ao acessar ${path}`)
  }
  return res.json()
}

export function getHealth() {
  return get('/health')
}
