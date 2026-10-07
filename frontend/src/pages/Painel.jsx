import { useQuery } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import logo from '../assets/logo.png'
import FundoOficina from '../components/FundoOficina.jsx'
import QuadroRanking from '../components/QuadroRanking.jsx'
import { api } from '../services/api.js'

const INTERVALO_TROCA_MS = 15000

// Tela para TV ou monitor fixo: sem login, alterna sozinha entre a semana e o geral.
function Painel() {
  const [aba, setAba] = useState('daSemana')
  const { data, isError } = useQuery({
    queryKey: ['painel'],
    queryFn: () => api.get('/painel'),
    refetchInterval: 30000,
  })

  useEffect(() => {
    const troca = setInterval(() => setAba((atual) => (atual === 'daSemana' ? 'geral' : 'daSemana')), INTERVALO_TROCA_MS)
    return () => clearInterval(troca)
  }, [])

  return (
    <div className="painel">
      <FundoOficina />
      <header className="painel-topo">
        <img src={logo} alt="" width="56" height="56" />
        <div>
          <h1>Ranking Ferrum</h1>
          <p>{aba === 'daSemana' ? 'Destaques da semana' : 'Destaques de todos os tempos'}</p>
        </div>
      </header>

      <main className="painel-corpo">
        {data && (
          <QuadroRanking
            key={aba}
            lista={data[aba]}
            campoXp={aba === 'daSemana' ? 'xpSemana' : 'xp'}
            vazio="Ninguém pontuou ainda. Devolva no prazo e apareça aqui!"
          />
        )}
        {isError && !data && <p className="estado-vazio">Sem conexão com o servidor. Tentando de novo…</p>}
      </main>

      <footer className="painel-rodape">
        {data && `Atualizado às ${new Date(data.atualizadoEm).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`}
      </footer>
    </div>
  )
}

export default Painel
