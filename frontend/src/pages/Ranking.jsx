import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import Esqueleto from '../components/Esqueleto.jsx'
import QuadroRanking from '../components/QuadroRanking.jsx'
import { api } from '../services/api.js'

const dataBr = (iso) => iso.split('-').reverse().join('/')

function Ranking() {
  const [aba, setAba] = useState('daSemana')
  const { data, isPending, isError, error } = useQuery({
    queryKey: ['ranking'],
    queryFn: () => api.get('/ranking'),
    refetchInterval: 60000,
  })

  return (
    <>
      <header className="cabecalho-pagina">
        <h1>Ranking</h1>
        <p>Pontos pelas devoluções dos colaboradores. Quanto mais devolve no prazo, mais sobe.</p>
      </header>

      <fieldset className="escolha-tipo balcao-abas">
        <legend className="sr-only">Período</legend>
        <label className="opcao">
          <input type="radio" name="periodo" checked={aba === 'daSemana'} onChange={() => setAba('daSemana')} />
          <span>
            <strong>Esta semana</strong>
            {data ? `Desde segunda, ${dataBr(data.semana)}.` : 'Zera toda segunda-feira.'}
          </span>
        </label>
        <label className="opcao">
          <input type="radio" name="periodo" checked={aba === 'geral'} onChange={() => setAba('geral')} />
          <span>
            <strong>Geral</strong>
            Todos os pontos acumulados.
          </span>
        </label>
      </fieldset>

      <section className="card secao-cadastro" aria-labelledby="titulo-classificacao">
        <h2 id="titulo-classificacao">{aba === 'daSemana' ? 'Classificação da semana' : 'Classificação geral'}</h2>
        {isPending && <Esqueleto linhas={5} />}
        {isError && <p className="mensagem-erro">{error.message}</p>}
        {data && (
          <QuadroRanking
            lista={data[aba]}
            campoXp={aba === 'daSemana' ? 'xpSemana' : 'xp'}
            vazio={aba === 'daSemana' ? 'Ninguém pontuou esta semana ainda.' : 'Ninguém pontuou ainda.'}
          />
        )}
      </section>

      {data && (
        <section className="card secao-cadastro" aria-labelledby="titulo-regras">
          <h2 id="titulo-regras">Como funciona</h2>
          <ul className="regras-ranking">
            <li>
              Devolução no prazo (ou sem prazo): <strong>{data.regras.noPrazo} XP</strong>.
            </li>
            <li>
              Devolução atrasada: <strong>{data.regras.atrasada} XP</strong> e a sequência volta a zero.
            </li>
            <li>
              A cada <strong>{data.regras.aCadaSequencia} devoluções seguidas</strong> no prazo: bônus de{' '}
              <strong>{data.regras.bonusSequencia} XP</strong>.
            </li>
            <li>
              Os pontos vão para quem retirou a ferramenta, mesmo que outra pessoa devolva.
            </li>
            <li>
              Ligas pelo total de XP:{' '}
              {data.ligas.map((liga, i) => (
                <span key={liga.id}>
                  {i > 0 && ', '}
                  <span className="selo-liga" data-liga={liga.id}>
                    {liga.nome}
                  </span>{' '}
                  {liga.minimo}+
                </span>
              ))}
              .
            </li>
          </ul>
        </section>
      )}
    </>
  )
}

export default Ranking
