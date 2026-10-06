import { useQuery } from '@tanstack/react-query'
import { getHealth } from '../services/api.js'

function StatusApi() {
  const { isSuccess, isError } = useQuery({
    queryKey: ['health'],
    queryFn: getHealth,
    refetchInterval: 30_000,
    retry: false,
  })

  const estado = isSuccess ? 'ok' : isError ? 'erro' : 'verificando'
  const texto = {
    ok: 'Sistema conectado',
    erro: 'Sem conexão com o servidor',
    verificando: 'Verificando conexão',
  }[estado]

  return (
    <p className="status-api" data-estado={estado} role="status">
      <span className="status-api-ponto" aria-hidden="true" />
      {texto}
    </p>
  )
}

export default StatusApi
