import { useEffect, useState } from 'react'
import { getHealth } from '../services/api.js'

function Status() {
  const [health, setHealth] = useState(null)
  const [erro, setErro] = useState(null)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch((e) => setErro(e.message))
  }, [])

  return (
    <main className="status">
      <h1>Sistema de Ferramentaria</h1>
      {erro && <p className="status-erro">API fora do ar: {erro}</p>}
      {!erro && !health && <p>Verificando API...</p>}
      {health && (
        <p className="status-ok">
          API conectada: {health.status} ({new Date(health.timestamp).toLocaleString('pt-BR')})
        </p>
      )}
    </main>
  )
}

export default Status
