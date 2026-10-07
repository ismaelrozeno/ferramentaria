import { auth } from './firebase.js'

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
  const cabecalhos = {}
  if (corpo) cabecalhos['Content-Type'] = 'application/json'
  // Token do login atual; o SDK do Firebase renova sozinho quando expira.
  const token = await auth.currentUser?.getIdToken()
  if (token) cabecalhos.Authorization = `Bearer ${token}`

  let resposta
  try {
    resposta = await fetch(`${BASE_URL}/api${caminho}`, {
      method: metodo,
      headers: cabecalhos,
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
  put: (caminho, corpo) => requisitar('PUT', caminho, corpo),
  delete: (caminho) => requisitar('DELETE', caminho),
}

export const getHealth = () => api.get('/health')
