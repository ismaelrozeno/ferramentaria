import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

// Linha verde no topo enquanto a tela busca ou envia dados. Só aparece se demorar
// mais de 150 ms, para não piscar em respostas rápidas.
function BarraProgresso() {
  const ocupado = useIsFetching() + useIsMutating() > 0
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    if (!ocupado) {
      const esconder = setTimeout(() => setVisivel(false), 250)
      return () => clearTimeout(esconder)
    }
    const mostrar = setTimeout(() => setVisivel(true), 150)
    return () => clearTimeout(mostrar)
  }, [ocupado])

  return <div className="barra-progresso" data-ativa={visivel && ocupado} data-saindo={visivel && !ocupado} aria-hidden="true" />
}

export default BarraProgresso
