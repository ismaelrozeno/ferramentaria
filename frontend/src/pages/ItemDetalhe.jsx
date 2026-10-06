import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import EtiquetaCodigoDeBarras from '../components/EtiquetaCodigoDeBarras.jsx'
import EtiquetaStatus from '../components/EtiquetaStatus.jsx'
import { api } from '../services/api.js'
import { formatarData, formatarMoeda } from '../utils/formatar.js'
import { MOVIMENTACAO, ORIGEM, TIPO_ITEM, UNIDADES } from '../utils/rotulos.js'

function Dado({ rotulo, children }) {
  return (
    <div className="dado">
      <dt>{rotulo}</dt>
      <dd>{children || '—'}</dd>
    </div>
  )
}

function ItemDetalhe() {
  const { id } = useParams()
  const [parametros] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const recemCriado = parametros.get('novo') === '1'

  const item = useQuery({ queryKey: ['item', id], queryFn: () => api.get(`/itens/${id}`) })
  const categorias = useQuery({ queryKey: ['categorias'], queryFn: () => api.get('/categorias') })
  const locais = useQuery({ queryKey: ['locais'], queryFn: () => api.get('/locais') })

  const desativar = useMutation({
    mutationFn: () => api.delete(`/itens/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['itens'] })
      navigate('/catalogo')
    },
  })

  if (item.isPending) return <p className="texto-apoio">Carregando…</p>
  if (item.isError) {
    return (
      <div className="card estado-vazio-grande">
        <h1>Item não encontrado</h1>
        <p>{item.error.message}</p>
        <Link to="/catalogo" className="botao botao-secundario">
          Voltar ao catálogo
        </Link>
      </div>
    )
  }

  const dados = item.data
  const ferramenta = dados.ferramenta
  const categoria = categorias.data?.find((c) => c.sigla === dados.categoriaId)
  const local = locais.data?.find((l) => l.id === dados.localId)

  return (
    <>
      <nav className="trilha" aria-label="Você está em">
        <Link to="/catalogo">Catálogo</Link>
        <span aria-hidden="true">/</span>
        <span>{dados.codigo}</span>
      </nav>

      {recemCriado && (
        <p className="aviso-sucesso" role="status">
          Item cadastrado com o código <strong>{dados.codigo}</strong>. Imprima a etiqueta e cole na ferramenta.
        </p>
      )}

      <header className="cabecalho-pagina cabecalho-com-acao">
        <div>
          <p className="codigo-destaque numero">{dados.codigo}</p>
          <h1>{dados.nome}</h1>
        </div>
        {ferramenta && <EtiquetaStatus status={ferramenta.status} />}
      </header>

      <div className="grade-detalhe">
        <section className="card" aria-labelledby="titulo-dados">
          <h2 id="titulo-dados">Dados</h2>
          <dl className="lista-dados">
            <Dado rotulo="Tipo">{TIPO_ITEM[dados.tipo]}</Dado>
            <Dado rotulo="Categoria">{categoria ? `${categoria.nome} (${categoria.sigla})` : dados.categoriaId}</Dado>
            {ferramenta ? (
              <>
                <Dado rotulo="Marca e modelo">{[ferramenta.marca, ferramenta.modelo].filter(Boolean).join(' ')}</Dado>
                <Dado rotulo="Número de série">{ferramenta.numeroSerie}</Dado>
                <Dado rotulo="Valor">{formatarMoeda(ferramenta.valor)}</Dado>
                <Dado rotulo="Data de aquisição">{ferramenta.dataAquisicao && formatarData(ferramenta.dataAquisicao)}</Dado>
                <Dado rotulo="Origem">{ORIGEM[ferramenta.origem]}</Dado>
                {ferramenta.origem === 'alocada' && (
                  <>
                    <Dado rotulo="Fornecedor">{ferramenta.fornecedor}</Dado>
                    <Dado rotulo="Fim do contrato">{formatarData(ferramenta.fimContratoLocacao)}</Dado>
                  </>
                )}
              </>
            ) : (
              <>
                <Dado rotulo="Unidade">{UNIDADES[dados.unidade]}</Dado>
                <Dado rotulo="Saldo">
                  <span className="numero">
                    {dados.saldo} {dados.unidade}
                  </span>
                </Dado>
                <Dado rotulo="Estoque mínimo / ponto de pedido / máximo">
                  <span className="numero">
                    {dados.estoqueMinimo} / {dados.pontoPedido} / {dados.estoqueMaximo}
                  </span>
                </Dado>
                <Dado rotulo="Custo médio">{formatarMoeda(dados.custoMedio)}</Dado>
              </>
            )}
          </dl>
        </section>

        <div className="coluna-lateral">
          {ferramenta && (
            <section className="card" aria-labelledby="titulo-situacao">
              <h2 id="titulo-situacao">Situação atual</h2>
              <dl className="lista-dados">
                <Dado rotulo="Status">
                  <EtiquetaStatus status={ferramenta.status} />
                </Dado>
                <Dado rotulo="Com quem">{ferramenta.colaboradorNome ?? 'No almoxarifado'}</Dado>
                <Dado rotulo="Local">{local?.nome}</Dado>
                <Dado rotulo="Desde">{formatarData(ferramenta.statusDesde)}</Dado>
              </dl>
            </section>
          )}

          <section className="card" aria-labelledby="titulo-etiqueta">
            <h2 id="titulo-etiqueta">Etiqueta</h2>
            <div className="area-etiqueta">
              <EtiquetaCodigoDeBarras codigo={dados.codigo} nome={dados.nome} />
            </div>
            <button type="button" className="botao botao-primario" onClick={() => window.print()}>
              Imprimir etiqueta
            </button>
          </section>
        </div>
      </div>

      <section className="secao" aria-labelledby="titulo-historico">
        <h2 id="titulo-historico">Histórico de movimentações</h2>
        {dados.historico.length === 0 ? (
          <p className="estado-vazio">Nenhuma movimentação ainda.</p>
        ) : (
          <div className="card card-tabela">
            <table className="tabela">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Movimentação</th>
                  <th>Quantidade</th>
                  <th>Registrado por</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {dados.historico.map((mov) => (
                  <tr key={mov.id}>
                    <td className="numero">{formatarData(mov.data)}</td>
                    <td>{MOVIMENTACAO[mov.tipo] ?? mov.tipo}</td>
                    <td className="numero">{mov.quantidade}</td>
                    <td>{mov.usuarioNome}</td>
                    <td>{mov.observacao ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="zona-perigo">
        <div>
          <h2>Desativar item</h2>
          <p className="texto-apoio">
            Use para cadastro errado ou duplicado. O histórico é mantido. Perda ou quebra é registrada como baixa.
          </p>
        </div>
        <button
          type="button"
          className="botao botao-perigo"
          disabled={desativar.isPending}
          onClick={() => {
            if (window.confirm(`Desativar ${dados.codigo}? Ele sai do catálogo.`)) desativar.mutate()
          }}
        >
          Desativar item
        </button>
        {desativar.isError && (
          <p className="mensagem-erro" role="alert">
            {desativar.error.message}
          </p>
        )}
      </section>
    </>
  )
}

export default ItemDetalhe
