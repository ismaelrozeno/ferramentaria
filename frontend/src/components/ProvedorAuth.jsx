import { useQueryClient } from '@tanstack/react-query'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ContextoAuth } from '../contexto/auth.js'
import { api } from '../services/api.js'
import { auth } from '../services/firebase.js'

const MENSAGENS_DE_LOGIN = {
  'auth/invalid-credential': 'E-mail ou senha incorretos.',
  'auth/invalid-login-credentials': 'E-mail ou senha incorretos.',
  'auth/wrong-password': 'E-mail ou senha incorretos.',
  'auth/user-not-found': 'E-mail ou senha incorretos.',
  'auth/invalid-email': 'Digite um e-mail válido.',
  'auth/user-disabled': 'Seu acesso foi desativado. Fale com o administrador.',
  'auth/too-many-requests': 'Muitas tentativas seguidas. Espere alguns minutos e tente de novo.',
  'auth/configuration-not-found': 'O login ainda não foi ativado no Firebase. Avise o administrador do sistema.',
  'auth/operation-not-allowed': 'O login por e-mail e senha está desativado no Firebase. Avise o administrador do sistema.',
  'auth/network-request-failed': 'Sem conexão com a internet. Confira a rede e tente de novo.',
}

function ProvedorAuth({ children }) {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState({ carregando: true, usuario: null, erro: null })

  useEffect(
    () =>
      onAuthStateChanged(auth, async (contaFirebase) => {
        if (!contaFirebase) {
          setEstado((atual) => ({ carregando: false, usuario: null, erro: atual.erro }))
          return
        }
        try {
          // O login do Firebase só prova quem é; o perfil vem do cadastro no Ferrum.
          const usuario = await api.get('/me')
          setEstado({ carregando: false, usuario, erro: null })
        } catch (err) {
          await signOut(auth)
          setEstado({ carregando: false, usuario: null, erro: err.message })
        }
      }),
    [],
  )

  const entrar = useCallback(async (email, senha) => {
    setEstado((atual) => ({ ...atual, erro: null }))
    try {
      await signInWithEmailAndPassword(auth, email.trim(), senha)
    } catch (err) {
      const mensagem = MENSAGENS_DE_LOGIN[err.code] ?? 'Não foi possível entrar. Tente de novo.'
      setEstado((atual) => ({ ...atual, erro: mensagem }))
    }
  }, [])

  const sair = useCallback(async () => {
    await signOut(auth)
    queryClient.clear()
  }, [queryClient])

  const valor = useMemo(
    () => ({ ...estado, entrar, sair, ehAdmin: estado.usuario?.perfil === 'admin' }),
    [estado, entrar, sair],
  )

  return <ContextoAuth.Provider value={valor}>{children}</ContextoAuth.Provider>
}

export default ProvedorAuth
