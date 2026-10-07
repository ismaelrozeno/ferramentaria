import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../contexto/auth.js'
import { api } from '../services/api.js'
import { TIPO_LOCAL } from '../utils/rotulos.js'
import Esqueleto from '../components/Esqueleto.jsx'

function Categorias() {
  const queryClient = useQueryClient()
  const { ehAdmin } = useAuth()
  const [sigla, setSigla] = useState('')
  const [nome, setNome] = useState('')
  const categorias = useQuery({ queryKey: ['categorias'], queryFn: () => api.get('/categorias') })

  const criar = useMutation({
    mutationFn: () => api.post('/categorias', { sigla, nome }),
    onSuccess: () => {
      setSigla('')
      setNome('')
      queryClient.invalidateQueries({ queryKey: ['categorias'] })
    },
  })

  const alternar = useMutation({
    mutationFn: (categoria) => api.patch(`/categorias/${categoria.sigla}`, { ativa: !categoria.ativa }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categorias'] }),
  })

  return (
    <section className="card secao-cadastro" aria-labelledby="titulo-categorias">
      <div>
        <h2 id="titulo-categorias">Categorias</h2>
        <p className="texto-apoio">A sigla entra no código de cada item: FER-ELE-0001.</p>
      </div>

      {ehAdmin && (
      <form
        className="form-linha"
        onSubmit={(e) => {
          e.preventDefault()
          criar.mutate()
        }}
      >
        <label className="campo campo-sigla">
          <span>Sigla</span>
          <input
            value={sigla}
            onChange={(e) => setSigla(e.target.value.toUpperCase().slice(0, 3))}
            placeholder="ELE"
            required
          />
        </label>
        <label className="campo">
          <span>Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Elétricas" required />
        </label>
        <button type="submit" className="botao botao-primario" disabled={criar.isPending}>
          Adicionar categoria
        </button>
      </form>
      )}
      {criar.isError && <p className="mensagem-erro" role="alert">{criar.error.message}</p>}

      {categorias.isPending && <Esqueleto linhas={3} />}
      {categorias.isError && <p className="mensagem-erro">{categorias.error.message}</p>}
      {categorias.data?.length === 0 && (
        <p className="estado-vazio">Nenhuma categoria ainda. Adicione a primeira acima.</p>
      )}
      {categorias.data?.length > 0 && (
        <table className="tabela">
          <thead>
            <tr>
              <th>Sigla</th>
              <th>Nome</th>
              <th>Situação</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {categorias.data.map((categoria) => (
              <tr key={categoria.sigla} data-inativo={!categoria.ativa}>
                <td className="numero">{categoria.sigla}</td>
                <td>{categoria.nome}</td>
                <td>{categoria.ativa ? 'Ativa' : 'Desativada'}</td>
                <td className="celula-acao">
                  {ehAdmin && (
                  <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => alternar.mutate(categoria)}>
                    {categoria.ativa ? 'Desativar' : 'Reativar'}
                  </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function Locais() {
  const queryClient = useQueryClient()
  const { ehAdmin } = useAuth()
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState('almoxarifado')
  const locais = useQuery({ queryKey: ['locais'], queryFn: () => api.get('/locais') })

  const criar = useMutation({
    mutationFn: () => api.post('/locais', { nome, tipo }),
    onSuccess: () => {
      setNome('')
      queryClient.invalidateQueries({ queryKey: ['locais'] })
    },
  })

  const alternar = useMutation({
    mutationFn: (local) => api.patch(`/locais/${local.id}`, { ativo: !local.ativo }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['locais'] }),
  })

  return (
    <section className="card secao-cadastro" aria-labelledby="titulo-locais">
      <div>
        <h2 id="titulo-locais">Locais</h2>
        <p className="texto-apoio">Onde as ferramentas ficam ou são usadas: almoxarifados, obras e setores.</p>
      </div>

      {ehAdmin && (
      <form
        className="form-linha"
        onSubmit={(e) => {
          e.preventDefault()
          criar.mutate()
        }}
      >
        <label className="campo">
          <span>Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Almoxarifado central" required />
        </label>
        <label className="campo campo-tipo">
          <span>Tipo</span>
          <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
            {Object.entries(TIPO_LOCAL).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="botao botao-primario" disabled={criar.isPending}>
          Adicionar local
        </button>
      </form>
      )}
      {criar.isError && <p className="mensagem-erro" role="alert">{criar.error.message}</p>}

      {locais.isPending && <Esqueleto linhas={3} />}
      {locais.isError && <p className="mensagem-erro">{locais.error.message}</p>}
      {locais.data?.length === 0 && <p className="estado-vazio">Nenhum local ainda. Adicione o primeiro acima.</p>}
      {locais.data?.length > 0 && (
        <table className="tabela">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Tipo</th>
              <th>Situação</th>
              <th aria-label="Ações" />
            </tr>
          </thead>
          <tbody>
            {locais.data.map((local) => (
              <tr key={local.id} data-inativo={!local.ativo}>
                <td>{local.nome}</td>
                <td>{TIPO_LOCAL[local.tipo]}</td>
                <td>{local.ativo ? 'Ativo' : 'Desativado'}</td>
                <td className="celula-acao">
                  {ehAdmin && (
                  <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => alternar.mutate(local)}>
                    {local.ativo ? 'Desativar' : 'Reativar'}
                  </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function Cadastros() {
  return (
    <>
      <header className="cabecalho-pagina">
        <h1>Categorias e locais</h1>
        <p>Cadastros de apoio usados no cadastro de ferramentas e nas movimentações.</p>
      </header>
      <div className="grade-cadastros">
        <Categorias />
        <Locais />
      </div>
    </>
  )
}

export default Cadastros
