import { createContext, useContext } from 'react'

// { carregando, usuario: { uid, nome, email, perfil } | null, erro, entrar, sair, ehAdmin }
export const ContextoAuth = createContext(null)

export function useAuth() {
  const valor = useContext(ContextoAuth)
  if (!valor) throw new Error('useAuth precisa estar dentro de <ProvedorAuth>')
  return valor
}
