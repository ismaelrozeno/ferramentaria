import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRef, useState } from 'react'
import BotaoExcluir from '../components/BotaoExcluir.jsx'
import CapturaDigital from '../components/CapturaDigital.jsx'
import Confirmacao from '../components/Confirmacao.jsx'
import { useAuth } from '../contexto/auth.js'
import { api } from '../services/api.js'
import { MODELO_CSV, lerArquivoDeTexto, lerCsvDeColaboradores } from '../utils/planilhaColaboradores.js'
import Esqueleto from '../components/Esqueleto.jsx'

const LIMITE_NA_TELA = 100
const MAXIMO_POR_IMPORTACAO = 2000

const semAcento = (texto) =>
  String(texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

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
    if (/\.xlsx?$/i.test(escolhido.name)) {
      setErroArquivo('Ainda não leio Excel direto. No Excel, use Arquivo → Salvar como → CSV e escolha o arquivo salvo.')
      return
    }
    try {
      const lido = lerCsvDeColaboradores(await lerArquivoDeTexto(escolhido))
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
    (c) => !termo || semAcento(`${c.matricula} ${c.nome} ${c.equipe}`).includes(termo),
  )
  const relatorio = importar.data

  return (
    <>
      <header className="cabecalho-pagina">
        <h1>Colaboradores</h1>
        <p>Quem retira ferramentas no balcão. Não têm login: identificam-se pela digital ou pela matrícula.</p>
      </header>

      {souAdmin && (
        <section className="card secao-cadastro" aria-labelledby="titulo-importar">
          <h2 id="titulo-importar">Importar de um arquivo</h2>
          <p className="texto-apoio">
            Arquivo CSV com as colunas <strong>matricula</strong>, <strong>nome</strong> e (opcional) <strong>equipe</strong>.
            Quem já existe é atualizado; quem não está no arquivo continua como está.
          </p>
          <div className="importar-acoes">
            <label className="campo campo-arquivo">
              <span>Arquivo CSV</span>
              <input ref={campoArquivo} type="file" accept=".csv,.txt,text/csv" onChange={escolherArquivo} />
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
                <strong>{arquivo.linhas.length}</strong> colaboradores em <strong>{arquivo.nome}</strong>. Colunas usadas:
                matrícula = “{arquivo.colunas.matricula}”, nome = “{arquivo.colunas.nome}”
                {arquivo.colunas.equipe ? `, equipe = “${arquivo.colunas.equipe}”` : ', sem coluna de equipe'}.
              </p>
              <table className="tabela">
                <thead>
                  <tr>
                    <th>Linha</th>
                    <th>Matrícula</th>
                    <th>Nome</th>
                    <th>Equipe</th>
                  </tr>
                </thead>
                <tbody>
                  {arquivo.linhas.slice(0, 5).map((l) => (
                    <tr key={l.linha}>
                      <td>{l.linha}</td>
                      <td>{l.matricula}</td>
                      <td>{l.nome}</td>
                      <td>{l.equipe}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
          <span>Buscar por nome, matrícula ou equipe</span>
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
            <ul className="lista-usuarios">
              {encontrados.slice(0, LIMITE_NA_TELA).map((c) => (
                <li key={c.id} className="usuario-linha" data-inativo={!c.ativo}>
                  <div>
                    <p className="usuario-nome">{c.nome}</p>
                    <p className="texto-apoio">
                      Matrícula {c.matricula}
                      {c.equipe && ` · ${c.equipe}`} · Digital {c.biometriaId ? 'cadastrada' : 'não cadastrada'}
                      {!c.ativo && ' · Desativado'}
                    </p>
                  </div>
                  {souAdmin && (
                    <div className="usuario-acoes">
                      <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => setParaDigital(c)}>
                        {c.biometriaId ? 'Refazer digital' : 'Cadastrar digital'}
                      </button>
                      <button
                        type="button"
                        className="botao botao-secundario botao-pequeno"
                        onClick={() =>
                          c.ativo ? setParaDesativar(c) : alterar.mutate({ matricula: c.matricula, dados: { ativo: true } })
                        }
                      >
                        {c.ativo ? 'Desativar' : 'Reativar'}
                      </button>
                      <BotaoExcluir tipo="colaboradores" id={c.matricula} nome={c.nome} />
                    </div>
                  )}
                </li>
              ))}
            </ul>
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
