import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Navigate } from 'react-router'
import Confirmacao from '../components/Confirmacao.jsx'
import Esqueleto from '../components/Esqueleto.jsx'
import { useConfiguracoes } from '../contexto/configuracoes.js'
import { api } from '../services/api.js'

const TIPOS = {
  itens: 'Itens',
  colaboradores: 'Colaboradores',
  categorias: 'Categorias',
  locais: 'Locais',
  usuarios: 'Usuários',
}

const quando = (iso) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function Lixeira() {
  const queryClient = useQueryClient()
  const { lixeiraAtiva } = useConfiguracoes()
  const [apagando, setApagando] = useState(null)

  const lixeira = useQuery({ queryKey: ['lixeira'], queryFn: () => api.get('/lixeira') })
  const total = lixeira.data ? Object.values(lixeira.data).reduce((soma, lista) => soma + lista.length, 0) : 0

  const restaurar = useMutation({
    mutationFn: ({ tipo, id }) => api.post(`/lixeira/${tipo}/${encodeURIComponent(id)}/restaurar`),
    onSuccess: () => queryClient.invalidateQueries(),
  })

  const apagar = useMutation({
    mutationFn: ({ tipo, id }) => api.delete(`/lixeira/${tipo}/${encodeURIComponent(id)}`),
    onSuccess: () => queryClient.invalidateQueries(),
    onSettled: () => setApagando(null),
  })

  const erro = restaurar.error ?? apagar.error

  // Lixeira desligada: a página some do menu e não abre por endereço direto.
  if (!lixeiraAtiva) return <Navigate to="/" replace />

  return (
    <>
      <header className="cabecalho-pagina">
        <h1>Lixeira</h1>
        <p>
          O que foi excluído fica aqui até você restaurar ou apagar de vez. O histórico de movimentações é sempre mantido.
        </p>
      </header>

      <section className="card secao-cadastro secao-config" aria-labelledby="titulo-lixeira">
        <h2 id="titulo-lixeira">Itens excluídos</h2>

        {erro && (
          <p className="mensagem-erro" role="alert">
            {erro.message}
          </p>
        )}

        {lixeira.isPending && <Esqueleto linhas={3} />}
        {lixeira.isError && <p className="mensagem-erro">{lixeira.error.message}</p>}
        {lixeira.data && total === 0 && <p className="estado-vazio">A lixeira está vazia.</p>}

        {lixeira.data &&
          Object.entries(TIPOS)
            .filter(([tipo]) => lixeira.data[tipo]?.length > 0)
            .map(([tipo, titulo]) => (
              <div key={tipo} className="lixeira-grupo">
                <h3>{titulo}</h3>
                <ul className="lista-usuarios">
                  {lixeira.data[tipo].map((registro) => (
                    <li key={registro.id} className="usuario-linha">
                      <div>
                        <p className="usuario-nome">{registro.rotulo}</p>
                        <p className="texto-apoio">
                          {registro.detalhe} · excluído em {quando(registro.excluidoEm)}
                          {registro.excluidoPorNome && ` por ${registro.excluidoPorNome}`}
                        </p>
                      </div>
                      <div className="usuario-acoes">
                        <button
                          type="button"
                          className="botao botao-secundario botao-pequeno"
                          disabled={restaurar.isPending}
                          onClick={() => {
                            restaurar.reset()
                            restaurar.mutate({ tipo, id: registro.id })
                          }}
                        >
                          Restaurar
                        </button>
                        <button
                          type="button"
                          className="botao botao-perigo botao-pequeno"
                          onClick={() => {
                            apagar.reset()
                            setApagando({ tipo, id: registro.id, nome: registro.rotulo })
                          }}
                        >
                          Apagar de vez
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
      </section>

      <Confirmacao
        aberta={Boolean(apagando)}
        titulo={`Apagar ${apagando?.nome ?? ''} de vez?`}
        mensagem="Não dá para desfazer. O histórico de movimentações continua guardado."
        textoConfirmar="Apagar de vez"
        perigo
        carregando={apagar.isPending}
        aoCancelar={() => setApagando(null)}
        aoConfirmar={() => apagar.mutate({ tipo: apagando.tipo, id: apagando.id })}
      />
    </>
  )
}

export default Lixeira
