import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { api } from '../services/api.js'
import { paraCentavos } from '../utils/formatar.js'
import { UNIDADES } from '../utils/rotulos.js'

const inicial = {
  tipo: 'ferramenta',
  nome: '',
  categoriaId: '',
  localId: '',
  marca: '',
  modelo: '',
  numeroSerie: '',
  valor: '',
  dataAquisicao: '',
  origem: 'propria',
  fornecedor: '',
  fimContratoLocacao: '',
  unidade: 'un',
  estoqueMinimo: '0',
  pontoPedido: '0',
  estoqueMaximo: '0',
}

function montarCorpo(form) {
  const comum = { tipo: form.tipo, nome: form.nome, categoriaId: form.categoriaId, localId: form.localId }
  if (form.tipo === 'consumo') {
    return {
      ...comum,
      unidade: form.unidade,
      estoqueMinimo: Number(form.estoqueMinimo),
      pontoPedido: Number(form.pontoPedido),
      estoqueMaximo: Number(form.estoqueMaximo),
    }
  }
  return {
    ...comum,
    marca: form.marca,
    modelo: form.modelo,
    numeroSerie: form.numeroSerie,
    valor: paraCentavos(form.valor),
    dataAquisicao: form.dataAquisicao,
    origem: form.origem,
    fornecedor: form.fornecedor,
    fimContratoLocacao: form.fimContratoLocacao,
  }
}

function NovoItem() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  // Vindo de Categorias e locais com uma categoria recém-criada, ela já vem escolhida.
  const [form, setForm] = useState(() => ({ ...inicial, categoriaId: params.get('categoria') ?? '' }))
  const mudar = (campo) => (e) => setForm((atual) => ({ ...atual, [campo]: e.target.value }))

  const categorias = useQuery({ queryKey: ['categorias'], queryFn: () => api.get('/categorias') })
  const locais = useQuery({ queryKey: ['locais'], queryFn: () => api.get('/locais') })
  const categoriasAtivas = categorias.data?.filter((c) => c.ativa) ?? []
  const locaisAtivos = locais.data?.filter((l) => l.ativo) ?? []

  const salvar = useMutation({
    mutationFn: () => api.post('/itens', montarCorpo(form)),
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ['itens'] })
      navigate(`/catalogo/${item.id}?novo=1`)
    },
  })

  const ehFerramenta = form.tipo === 'ferramenta'
  const ehAlocada = ehFerramenta && form.origem === 'alocada'

  if (categorias.isSuccess && categoriasAtivas.length === 0) {
    return (
      <>
        <header className="cabecalho-pagina">
          <h1>Cadastrar item</h1>
        </header>
        <div className="card estado-vazio-grande">
          <h2>Cadastre uma categoria primeiro</h2>
          <p>Todo item pertence a uma categoria, e a sigla dela entra no código (FER-ELE-0001).</p>
          <Link to="/cadastros?depois=novo-item" className="botao botao-primario">
            Ir para categorias
          </Link>
        </div>
      </>
    )
  }

  return (
    <>
      <header className="cabecalho-pagina">
        <h1>Cadastrar item</h1>
        <p>O código é gerado ao salvar, no formato FER-ELE-0001.</p>
      </header>

      <form
        className="card formulario"
        onSubmit={(e) => {
          e.preventDefault()
          salvar.mutate()
        }}
      >
        <fieldset className="escolha-tipo">
          <legend>O que você está cadastrando?</legend>
          <label className="opcao">
            <input type="radio" name="tipo" value="ferramenta" checked={ehFerramenta} onChange={mudar('tipo')} />
            <span>
              <strong>Ferramenta</strong>
              Controlada por unidade, sai e volta ao almoxarifado.
            </span>
          </label>
          <label className="opcao">
            <input type="radio" name="tipo" value="consumo" checked={!ehFerramenta} onChange={mudar('tipo')} />
            <span>
              <strong>Material de consumo</strong>
              Controlado por quantidade, é consumido no uso.
            </span>
          </label>
        </fieldset>

        <div className="grade-campos">
          <label className="campo campo-largo">
            <span>Nome</span>
            <input value={form.nome} onChange={mudar('nome')} placeholder="Furadeira de impacto" required />
          </label>
          <label className="campo">
            <span>Categoria</span>
            <select value={form.categoriaId} onChange={mudar('categoriaId')} required>
              <option value="">Escolha</option>
              {categoriasAtivas.map((c) => (
                <option key={c.sigla} value={c.sigla}>
                  {c.nome} ({c.sigla})
                </option>
              ))}
            </select>
          </label>
          <label className="campo">
            <span>Local</span>
            <select value={form.localId} onChange={mudar('localId')}>
              <option value="">Não informado</option>
              {locaisAtivos.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.nome}
                </option>
              ))}
            </select>
          </label>

          {ehFerramenta && (
            <>
              <label className="campo">
                <span>Marca</span>
                <input value={form.marca} onChange={mudar('marca')} />
              </label>
              <label className="campo">
                <span>Modelo</span>
                <input value={form.modelo} onChange={mudar('modelo')} />
              </label>
              <label className="campo">
                <span>Número de série</span>
                <input value={form.numeroSerie} onChange={mudar('numeroSerie')} />
              </label>
              <label className="campo">
                <span>Valor (R$)</span>
                <input inputMode="decimal" value={form.valor} onChange={mudar('valor')} placeholder="1.250,90" required />
              </label>
              <label className="campo">
                <span>Data de aquisição</span>
                <input type="date" value={form.dataAquisicao} onChange={mudar('dataAquisicao')} />
              </label>
              <label className="campo">
                <span>Origem</span>
                <select value={form.origem} onChange={mudar('origem')}>
                  <option value="propria">Própria</option>
                  <option value="alocada">Alocada (alugada ou terceirizada)</option>
                </select>
              </label>
              {ehAlocada && (
                <>
                  <label className="campo">
                    <span>Fornecedor</span>
                    <input value={form.fornecedor} onChange={mudar('fornecedor')} required />
                  </label>
                  <label className="campo">
                    <span>Fim do contrato de locação</span>
                    <input type="date" value={form.fimContratoLocacao} onChange={mudar('fimContratoLocacao')} required />
                  </label>
                </>
              )}
            </>
          )}

          {!ehFerramenta && (
            <>
              <label className="campo">
                <span>Unidade</span>
                <select value={form.unidade} onChange={mudar('unidade')}>
                  {Object.entries(UNIDADES).map(([valor, rotulo]) => (
                    <option key={valor} value={valor}>
                      {rotulo}
                    </option>
                  ))}
                </select>
              </label>
              <label className="campo">
                <span>Estoque mínimo</span>
                <input type="number" min="0" value={form.estoqueMinimo} onChange={mudar('estoqueMinimo')} />
              </label>
              <label className="campo">
                <span>Ponto de pedido</span>
                <input type="number" min="0" value={form.pontoPedido} onChange={mudar('pontoPedido')} />
              </label>
              <label className="campo">
                <span>Estoque máximo</span>
                <input type="number" min="0" value={form.estoqueMaximo} onChange={mudar('estoqueMaximo')} />
              </label>
              <p className="texto-apoio campo-largo">
                O item começa com saldo zero. As quantidades entram por movimentação de entrada.
              </p>
            </>
          )}
        </div>

        {salvar.isError && (
          <p className="mensagem-erro" role="alert">
            {salvar.error.message}
          </p>
        )}

        <div className="acoes-formulario">
          <Link to="/catalogo" className="botao botao-secundario">
            Cancelar
          </Link>
          <button type="submit" className="botao botao-primario" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Salvar e gerar código'}
          </button>
        </div>
      </form>
    </>
  )
}

export default NovoItem
