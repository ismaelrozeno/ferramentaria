import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import BotaoExcluir from '../components/BotaoExcluir.jsx'
import CapturaDigital from '../components/CapturaDigital.jsx'
import Confirmacao from '../components/Confirmacao.jsx'
import { useAuth } from '../contexto/auth.js'
import { api } from '../services/api.js'
import { MODELO_CSV, ROTULOS_COLUNAS, lerArquivoDeColaboradores } from '../utils/planilhaColaboradores.js'
import Esqueleto from '../components/Esqueleto.jsx'

const LIMITE_NA_TELA = 100
const MAXIMO_POR_IMPORTACAO = 2000

const semAcento = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const MAO_DE_OBRA = { direta: 'Direta', indireta: 'Indireta' }

function textoSituacao(ativo) {
  if (ativo === true) return 'Ativo'
  if (ativo === false) return 'Inativo'
  return ativo ?? '—'
}

const vazio = { matricula: '', nome: '', funcao: '', equipe: '', maoDeObra: '' }

// Cadastro de uma pessoa só, sem planilha. Depois de salvar, oferece cadastrar a digital na hora.
function CadastroManual({ equipes, aoCriar, aoPedirDigital }) {
  const [form, setForm] = useState(vazio)
  const [criado, setCriado] = useState(null)
  const mudar = (campo) => (e) => setForm((atual) => ({ ...atual, [campo]: e.target.value }))

  const salvar = useMutation({
    mutationFn: () => api.post('/colaboradores', { ...form, maoDeObra: form.maoDeObra || null }),
    onSuccess: (colaborador) => {
      setCriado(colaborador)
      setForm(vazio)
      aoCriar()
    },
  })

  return (
    <section className="card secao-cadastro" aria-labelledby="titulo-cadastro-manual">
      <div>
        <h2 id="titulo-cadastro-manual">Cadastrar colaborador</h2>
        <p className="texto-apoio">Para uma pessoa só. Para muitas de uma vez, use a importação de planilha abaixo.</p>
      </div>

      {criado && (
        <div className="aviso-sucesso aviso-com-acao" role="status">
          <p>
            <strong>{criado.nome}</strong> cadastrado com a matrícula {criado.matricula}.
          </p>
          <button
            type="button"
            className="botao botao-primario botao-pequeno"
            onClick={() => {
              aoPedirDigital(criado)
              setCriado(null)
            }}
          >
            Cadastrar digital agora
          </button>
        </div>
      )}

      <form
        className="grade-campos grade-campos-alinhada"
        onSubmit={(e) => {
          e.preventDefault()
          setCriado(null)
          salvar.mutate()
        }}
      >
        <label className="campo">
          <span>Matrícula</span>
          <input value={form.matricula} onChange={mudar('matricula')} placeholder="8799168" required maxLength={30} />
        </label>
        <label className="campo">
          <span>Nome</span>
          <input value={form.nome} onChange={mudar('nome')} placeholder="Maria Souza" required maxLength={100} />
        </label>
        <label className="campo">
          <span>Função</span>
          <input value={form.funcao} onChange={mudar('funcao')} placeholder="Eletricista" maxLength={80} />
        </label>
        <label className="campo">
          <span>Equipe (encarregado)</span>
          <input value={form.equipe} onChange={mudar('equipe')} list="equipes-existentes" maxLength={60} />
          <datalist id="equipes-existentes">
            {equipes.map((equipe) => (
              <option key={equipe} value={equipe} />
            ))}
          </datalist>
        </label>
        <label className="campo">
          <span>Mão de obra</span>
          <select value={form.maoDeObra} onChange={mudar('maoDeObra')}>
            <option value="">Não informada</option>
            {Object.entries(MAO_DE_OBRA).map(([valor, rotulo]) => (
              <option key={valor} value={valor}>
                {rotulo}
              </option>
            ))}
          </select>
        </label>
        <div>
          <button type="submit" className="botao botao-primario" disabled={salvar.isPending}>
            {salvar.isPending ? 'Salvando…' : 'Cadastrar colaborador'}
          </button>
        </div>
      </form>

      {salvar.isError && (
        <p className="mensagem-erro" role="alert">
          {salvar.error.message}
        </p>
      )}
    </section>
  )
}

function baixarModelo() {
  const link = document.createElement('a')
  link.href = URL.createObjectURL(new Blob([MODELO_CSV], { type: 'text/csv;charset=utf-8' }))
  link.download = 'modelo-colaboradores.csv'
  link.click()
  URL.revokeObjectURL(link.href)
}

function Colaboradores() {
  const { usuario: eu } = useAuth()
  const souAdmin = eu.perfil === 'admin'
  const queryClient = useQueryClient()
  const campoArquivo = useRef(null)
  const [busca, setBusca] = useState('')
  const [arquivo, setArquivo] = useState(null)
  const [erroArquivo, setErroArquivo] = useState('')
  const [paraDesativar, setParaDesativar] = useState(null)
  const [paraDigital, setParaDigital] = useState(null)

  const colaboradores = useQuery({ queryKey: ['colaboradores'], queryFn: () => api.get('/colaboradores') })
  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['colaboradores'] })

  const importar = useMutation({
    mutationFn: () => api.post('/colaboradores/importacao', { linhas: arquivo.linhas }),
    onSuccess: () => {
      setArquivo(null)
      if (campoArquivo.current) campoArquivo.current.value = ''
      recarregar()
    },
  })

  async function cadastrarDigital(biometriaId) {
    await api.put(`/colaboradores/${encodeURIComponent(paraDigital.matricula)}/biometria`, { biometriaId })
    setParaDigital(null)
    recarregar()
  }

  const alterar = useMutation({
    mutationFn: ({ matricula, dados }) => api.patch(`/colaboradores/${encodeURIComponent(matricula)}`, dados),
    onSuccess: recarregar,
  })

  async function escolherArquivo(e) {
    const escolhido = e.target.files[0]
    setArquivo(null)
    setErroArquivo('')
    importar.reset()
    if (!escolhido) return
    try {
      const lido = await lerArquivoDeColaboradores(escolhido)
      if (lido.linhas.length > MAXIMO_POR_IMPORTACAO) {
        setErroArquivo(`O arquivo tem ${lido.linhas.length} colaboradores. O máximo por importação é ${MAXIMO_POR_IMPORTACAO}: divida em partes.`)
        return
      }
      setArquivo({ nome: escolhido.name, ...lido })
    } catch (err) {
      setErroArquivo(err.message)
    }
  }

  const termo = semAcento(busca).trim()
  const encontrados = (colaboradores.data ?? []).filter(
    (c) => !termo || semAcento(`${c.matricula} ${c.nome} ${c.equipe} ${c.funcao ?? ''}`).includes(termo),
  )
  const relatorio = importar.data
  // A área da digital fica no fim da página, depois da lista: rola até ela.
  function pedirDigital(colaborador) {
    setParaDigital(colaborador)
    setTimeout(() => document.getElementById('titulo-digital')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0)
  }

  const equipes = [...new Set((colaboradores.data ?? []).map((c) => c.equipe).filter(Boolean))].sort()
  const inativosNoArquivo =arquivo?.linhas.filter((l) => l.ativo === false).length ?? 0

  return (
    <>
      <header className="cabecalho-pagina">
        <h1>Colaboradores</h1>
        <p>Quem retira ferramentas no balcão. Não têm login: identificam-se pela digital ou pela matrícula.</p>
      </header>

      {souAdmin && <CadastroManual equipes={equipes} aoCriar={recarregar} aoPedirDigital={pedirDigital} />}

      {souAdmin && (
        <section className="card secao-cadastro" aria-labelledby="titulo-importar">
          <h2 id="titulo-importar">Importar de um arquivo</h2>
          <p className="texto-apoio">
            Planilha do Excel (.xlsx) ou CSV com as colunas <strong>matrícula</strong> e <strong>nome</strong>. Se tiver,
            também entram <strong>função</strong>, <strong>equipe</strong> (ou encarregado), <strong>situação</strong> (ativo ou
            inativo) e <strong>mão de obra</strong> (direta ou indireta). Quem já existe é atualizado; quem não está no
            arquivo continua como está.
          </p>
          <div className="importar-acoes">
            <label className="campo campo-arquivo">
              <span>Planilha</span>
              <input
                ref={campoArquivo}
                type="file"
                accept=".xlsx,.xls,.csv,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={escolherArquivo}
              />
            </label>
            <button type="button" className="botao botao-secundario botao-pequeno" onClick={baixarModelo}>
              Baixar modelo
            </button>
          </div>

          {erroArquivo && (
            <p className="mensagem-erro" role="alert">
              {erroArquivo}
            </p>
          )}

          {arquivo && (
            <div className="importar-previa">
              <p>
                <strong>{arquivo.linhas.length}</strong> colaboradores em <strong>{arquivo.nome}</strong>
                {inativosNoArquivo > 0 && <> ({inativosNoArquivo} como inativos, entram desativados)</>}. Colunas usadas:{' '}
                {Object.entries(arquivo.colunas)
                  .map(([campo, titulo]) => `${ROTULOS_COLUNAS[campo]} = “${titulo}”`)
                  .join(', ')}
                .
              </p>
              <div className="tabela-rolavel">
                <table className="tabela">
                  <thead>
                    <tr>
                      <th>Linha</th>
                      <th>Matrícula</th>
                      <th>Nome</th>
                      {arquivo.colunas.funcao && <th>Função</th>}
                      {arquivo.colunas.equipe && <th>Equipe</th>}
                      {arquivo.colunas.situacao && <th>Situação</th>}
                      {arquivo.colunas.maoDeObra && <th>Mão de obra</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {arquivo.linhas.slice(0, 5).map((l) => (
                      <tr key={l.linha}>
                        <td>{l.linha}</td>
                        <td>{l.matricula}</td>
                        <td>{l.nome}</td>
                        {arquivo.colunas.funcao && <td>{l.funcao}</td>}
                        {arquivo.colunas.equipe && <td>{l.equipe || '—'}</td>}
                        {arquivo.colunas.situacao && <td>{textoSituacao(l.ativo)}</td>}
                        {arquivo.colunas.maoDeObra && <td>{MAO_DE_OBRA[l.maoDeObra] ?? l.maoDeObra ?? '—'}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {arquivo.linhas.length > 5 && <p className="texto-apoio">Mostrando as 5 primeiras linhas.</p>}
              <button type="button" className="botao botao-primario" disabled={importar.isPending} onClick={() => importar.mutate()}>
                {importar.isPending ? 'Importando…' : `Importar ${arquivo.linhas.length} colaboradores`}
              </button>
            </div>
          )}

          {importar.isError && (
            <p className="mensagem-erro" role="alert">
              {importar.error.message}
            </p>
          )}

          {relatorio && (
            <div role="status">
              <p className="aviso-sucesso">
                Importação concluída: <strong>{relatorio.criados}</strong> novos, <strong>{relatorio.atualizados}</strong>{' '}
                atualizados, <strong>{relatorio.semMudanca}</strong> sem mudança
                {relatorio.erros.length > 0 && <>, <strong>{relatorio.erros.length}</strong> com problema</>}.
              </p>
              {relatorio.erros.length > 0 && (
                <>
                  <p className="texto-apoio">Estas linhas não foram importadas. Corrija no arquivo e importe de novo (o resto não muda).</p>
                  <table className="tabela">
                    <thead>
                      <tr>
                        <th>Linha</th>
                        <th>Problema</th>
                      </tr>
                    </thead>
                    <tbody>
                      {relatorio.erros.map((erro) => (
                        <tr key={`${erro.linha}-${erro.mensagem}`}>
                          <td>{erro.linha}</td>
                          <td>{erro.mensagem}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}
            </div>
          )}
        </section>
      )}

      <section className="card secao-cadastro secao-lista-colaboradores" aria-labelledby="titulo-lista-colaboradores">
        <h2 id="titulo-lista-colaboradores">Colaboradores cadastrados</h2>
        <label className="campo">
          <span>Buscar por nome, matrícula, função ou equipe</span>
          <input type="search" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </label>
        {colaboradores.isPending && <Esqueleto linhas={5} />}
        {colaboradores.isError && <p className="mensagem-erro">{colaboradores.error.message}</p>}
        {alterar.isError && (
          <p className="mensagem-erro" role="alert">
            {alterar.error.message}
          </p>
        )}
        {colaboradores.data && colaboradores.data.length === 0 && (
          <p className="estado-vazio">Nenhum colaborador ainda.{souAdmin && ' Importe um arquivo acima.'}</p>
        )}
        {colaboradores.data && colaboradores.data.length > 0 && (
          <>
            <p className="texto-apoio">
              {encontrados.length} de {colaboradores.data.length} colaboradores
              {encontrados.length > LIMITE_NA_TELA && ` (mostrando ${LIMITE_NA_TELA}: use a busca)`}
            </p>
            <table className="tabela tabela-colaboradores">
              <thead>
                <tr>
                  <th>Colaborador</th>
                  <th>Matrícula</th>
                  <th>Equipe</th>
                  <th>Digital</th>
                  {souAdmin && <th aria-label="Ações" />}
                </tr>
              </thead>
              <tbody>
                {encontrados.slice(0, LIMITE_NA_TELA).map((c) => (
                  <tr key={c.id} data-inativo={!c.ativo}>
                    <td className="col-colaborador">
                      <div className="colaborador-identidade">
                        <span className="colaborador-nome">{c.nome}</span>
                        <span className="colaborador-funcao">
                          {c.funcao || 'Função não informada'}
                          {!c.ativo && <span className="etiqueta-status etiqueta-desativado">Desativado</span>}
                        </span>
                      </div>
                    </td>
                    <td className="numero" data-rotulo="Matrícula">
                      {c.matricula}
                    </td>
                    <td data-rotulo="Equipe">{c.equipe || '—'}</td>
                    <td data-rotulo="Digital">
                      <span className="etiqueta-status" data-status={c.biometriaId ? 'disponivel' : 'pendente'}>
                        {c.biometriaId ? 'Cadastrada' : 'Pendente'}
                      </span>
                    </td>
                    {souAdmin && (
                      <td className="celula-acao acoes-colaborador">
                        <button type="button" className="botao botao-secundario botao-pequeno botao-digital" onClick={() => pedirDigital(c)}>
                          {c.biometriaId ? 'Refazer digital' : 'Cadastrar digital'}
                        </button>
                        <button
                          type="button"
                          className="botao botao-secundario botao-pequeno botao-situacao"
                          onClick={() =>
                            c.ativo ? setParaDesativar(c) : alterar.mutate({ matricula: c.matricula, dados: { ativo: true } })
                          }
                        >
                          {c.ativo ? 'Desativar' : 'Reativar'}
                        </button>
                        <BotaoExcluir tipo="colaboradores" id={c.matricula} nome={c.nome} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {paraDigital && (
        <section className="card secao-cadastro" aria-labelledby="titulo-digital">
          <h2 id="titulo-digital">Cadastrar digital de {paraDigital.nome}</h2>
          <p className="texto-apoio">Peça para a pessoa posicionar o dedo no leitor.</p>
          <CapturaDigital aoLer={cadastrarDigital} textoBotao="Ler e cadastrar" />
          <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => setParaDigital(null)}>
            Cancelar
          </button>
        </section>
      )}

      <Confirmacao
        aberta={Boolean(paraDesativar)}
        titulo={`Desativar ${paraDesativar?.nome ?? ''}?`}
        mensagem="A pessoa deixa de poder retirar ferramentas no balcão. O histórico é mantido e você pode reativar depois."
        textoConfirmar="Desativar colaborador"
        perigo
        carregando={alterar.isPending}
        aoCancelar={() => setParaDesativar(null)}
        aoConfirmar={() =>
          alterar.mutate(
            { matricula: paraDesativar.matricula, dados: { ativo: false } },
            { onSettled: () => setParaDesativar(null) },
          )
        }
      />
    </>
  )
}

export default Colaboradores
