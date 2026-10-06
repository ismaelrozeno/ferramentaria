const BASE_URL = import.meta.env.VITE_API_URL ?? ''

// Erro devolvido pela API: { erro: 'CODIGO', mensagem: 'texto para o usuário', campos?: [...] }
export class ErroApi extends Error {
  constructor(mensagem, codigo, campos = []) {
    super(mensagem)
    this.codigo = codigo
    this.campos = campos
  }
}

async function requisitar(metodo, caminho, corpo) {
  let resposta
  try {
    resposta = await fetch(`${BASE_URL}/api${caminho}`, {
      method: metodo,
      headers: corpo ? { 'Content-Type': 'application/json' } : undefined,
      body: corpo ? JSON.stringify(corpo) : undefined,
    })
  } catch {
    throw new ErroApi('Sem conexão com o servidor. Confira a rede e tente de novo.', 'SEM_CONEXAO')
  }

  const dados = resposta.status === 204 ? null : await resposta.json().catch(() => null)
  if (!resposta.ok) {
    throw new ErroApi(dados?.mensagem ?? `Erro ${resposta.status} no servidor.`, dados?.erro, dados?.campos)
  }
  return dados
}

export const api = {
  get: (caminho) => requisitar('GET', caminho),
  post: (caminho, corpo) => requisitar('POST', caminho, corpo),
  patch: (caminho, corpo) => requisitar('PATCH', caminho, corpo),
  delete: (caminho) => requisitar('DELETE', caminho),
}

export const getHealth = () => api.get('/health')
