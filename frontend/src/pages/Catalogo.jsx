import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import EtiquetaStatus from '../components/EtiquetaStatus.jsx'
import { useAuth } from '../contexto/auth.js'
import { api } from '../services/api.js'
import { ORIGEM, STATUS, TIPO_ITEM } from '../utils/rotulos.js'

function montarConsulta(filtros) {
  const params = new URLSearchParams(Object.entries(filtros).filter(([, valor]) => valor))
  const texto = params.toString()
  return texto ? `?${texto}` : ''
}

function Catalogo() {
  const navigate = useNavigate()
  const { ehAdmin } = useAuth()
  const [filtros, setFiltros] = useState({ busca: '', tipo: '', status: '', categoriaId: '', origem: '' })
  const mudar = (campo) => (e) => setFiltros((atual) => ({ ...atual, [campo]: e.target.value }))

  const categorias = useQuery({ queryKey: ['categorias'], queryFn: () => api.get('/categorias') })
  const itens = useQuery({
    queryKey: ['itens', filtros],
    queryFn: () => api.get(`/itens${montarConsulta(filtros)}`),
    placeholderData: (anterior) => anterior,
  })

  const filtrando = Object.values(filtros).some(Boolean)

  return (
    <>
      <header className="cabecalho-pagina cabecalho-com-acao">
        <div>
          <h1>Catálogo</h1>
          <p>Ferramentas e materiais cadastrados.</p>
        </div>
        {ehAdmin && (
          <Link to="/catalogo/novo" className="botao botao-primario">
            Cadastrar item
          </Link>
        )}
      </header>

      <div className="filtros card">
        <label className="campo campo-busca">
          <span>Buscar por código ou nome</span>
          <input type="search" value={filtros.busca} onChange={mudar('busca')} placeholder="FER-ELE-0001 ou furadeira" />
        </label>
        <label className="campo">
          <span>Tipo</span>
          <select value={filtros.tipo} onChange={mudar('tipo')}>
            <option value="">Todos</option>
            {Object.entries(TIPO_ITEM).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Status</span>
          <select value={filtros.status} onChange={mudar('status')}>
            <option value="">Todos</option>
            {Object.entries(STATUS).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Categoria</span>
          <select value={filtros.categoriaId} onChange={mudar('categoriaId')}>
            <option value="">Todas</option>
            {categorias.data?.map((categoria) => (
              <option key={categoria.sigla} value={categoria.sigla}>
                {categoria.nome} ({categoria.sigla})
              </option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Origem</span>
          <select value={filtros.origem} onChange={mudar('origem')}>
            <option value="">Todas</option>
            {Object.entries(ORIGEM).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
      </div>

      {itens.isError && <p className="mensagem-erro">{itens.error.message}</p>}
      {itens.isPending && <p className="texto-apoio">Carregando catálogo…</p>}

      {itens.data?.length === 0 && (
        <div className="card estado-vazio-grande">
          {filtrando ? (
            <p>Nenhum item com esses filtros. Mude a busca ou limpe os filtros.</p>
          ) : (
            <>
              <h2>Nenhum item cadastrado</h2>
              {ehAdmin ? (
                <>
                  <p>Cadastre a primeira ferramenta: o sistema gera o código e a etiqueta.</p>
                  <Link to="/catalogo/novo" className="botao botao-primario">
                    Cadastrar item
                  </Link>
                </>
              ) : (
                <p>O administrador ainda não cadastrou ferramentas.</p>
              )}
            </>
          )}
        </div>
      )}

      {itens.data?.length > 0 && (
        <div className="card card-tabela">
          <p className="contagem">
            {itens.data.length} {itens.data.length === 1 ? 'item' : 'itens'}
          </p>
          <table className="tabela tabela-clicavel">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Status</th>
                <th>Com quem</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {itens.data.map((item) => (
                <tr key={item.id} onClick={() => navigate(`/catalogo/${item.id}`)}>
                  <td className="numero">
                    <Link to={`/catalogo/${item.id}`} onClick={(e) => e.stopPropagation()}>
                      {item.codigo}
                    </Link>
                  </td>
                  <td>{item.nome}</td>
                  <td>
                    {item.tipo === 'ferramenta'
                      ? `Ferramenta ${ORIGEM[item.ferramenta?.origem]?.toLowerCase()}`
                      : 'Consumo'}
                  </td>
                  <td>{item.ferramenta ? <EtiquetaStatus status={item.ferramenta.status} /> : '—'}</td>
                  <td>{item.ferramenta?.colaboradorNome ?? '—'}</td>
                  <td className="numero">
                    {item.saldo} {item.unidade}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <ul className="lista-cartoes">
            {itens.data.map((item) => (
              <li key={item.id}>
                <Link to={`/catalogo/${item.id}`} className="cartao-item">
                  <span className="cartao-item-topo">
                    <span className="numero cartao-item-codigo">{item.codigo}</span>
                    {item.ferramenta && <EtiquetaStatus status={item.ferramenta.status} />}
                  </span>
                  <span className="cartao-item-nome">{item.nome}</span>
                  <span className="cartao-item-info">
                    {item.tipo === 'ferramenta'
                      ? `Ferramenta ${ORIGEM[item.ferramenta?.origem]?.toLowerCase()}`
                      : `Consumo, saldo ${item.saldo} ${item.unidade}`}
                    {item.ferramenta?.colaboradorNome && `, com ${item.ferramenta.colaboradorNome}`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  )
}

export default Catalogo
