import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../contexto/auth.js'
import { ContextoAparencia } from '../contexto/aparencia.js'
import { api } from '../services/api.js'
import { PADRAO, aplicarAparencia, lerLocal, resolverTema, salvarLocal } from '../utils/aparencia.js'

function ProvedorAparencia({ children }) {
  const { usuario } = useAuth()
  const [prefs, setPrefs] = useState(() => ({ ...PADRAO, ...lerLocal() }))
  const [temaResolvido, setTemaResolvido] = useState(() => resolverTema(prefs.tema))
  const [erro, setErro] = useState('')

  // Ao entrar, vale o que está salvo na conta (quem ainda não escolheu nada mantém o do navegador).
  // Só roda quando a pessoa logada muda; trocar uma opção depois não é desfeito por aqui.
  const [uidSincronizado, setUidSincronizado] = useState(null)
  if (usuario && usuario.uid !== uidSincronizado) {
    setUidSincronizado(usuario.uid)
    if (Object.keys(usuario.preferencias ?? {}).length > 0) setPrefs({ ...prefs, ...usuario.preferencias })
  }

  useEffect(() => {
    const aplicar = () => setTemaResolvido(aplicarAparencia(prefs))
    aplicar()
    salvarLocal(prefs)
    if (prefs.tema !== 'sistema') return undefined
    const consulta = window.matchMedia('(prefers-color-scheme: dark)')
    consulta.addEventListener('change', aplicar)
    return () => consulta.removeEventListener('change', aplicar)
  }, [prefs])

  const alterar = useCallback(
    async (parcial) => {
      const anterior = prefs
      setErro('')
      setPrefs({ ...prefs, ...parcial })
      try {
        await api.patch('/me/preferencias', parcial)
      } catch (err) {
        setPrefs(anterior)
        setErro(err.message)
      }
    },
    [prefs],
  )

  const valor = useMemo(() => ({ prefs, temaResolvido, erro, alterar }), [prefs, temaResolvido, erro, alterar])
  return <ContextoAparencia.Provider value={valor}>{children}</ContextoAparencia.Provider>
}

export default ProvedorAparencia
