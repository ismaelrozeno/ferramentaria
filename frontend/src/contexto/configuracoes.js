import { useQuery } from '@tanstack/react-query'
import { api } from '../services/api.js'

// Configurações do sistema inteiro. Enquanto carrega, vale o padrão (lixeira ligada).
export function useConfiguracoes() {
  const { data } = useQuery({ queryKey: ['configuracoes'], queryFn: () => api.get('/configuracoes'), staleTime: 60_000 })
  return { lixeiraAtiva: data?.lixeiraAtiva ?? true }
}
