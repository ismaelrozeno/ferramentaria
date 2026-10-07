import { createContext, useContext } from 'react'

// { prefs, temaResolvido: 'escuro' | 'claro', erro, alterar(parcial) }
export const ContextoAparencia = createContext(null)

export function useAparencia() {
  const valor = useContext(ContextoAparencia)
  if (!valor) throw new Error('useAparencia precisa estar dentro de <ProvedorAparencia>')
  return valor
}
