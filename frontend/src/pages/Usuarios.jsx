import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import Confirmacao from '../components/Confirmacao.jsx'
import { useAuth } from '../contexto/auth.js'
import { api } from '../services/api.js'
import Esqueleto from '../components/Esqueleto.jsx'

const PERFIS = { admin: 'Administrador', almoxarife: 'Almoxarife' }
const vazio = { nome: '', email: '', perfil: 'almoxarife', senha: '' }

function Usuarios() {
  const { usuario: eu } = useAuth()
  const queryClient = useQueryClient()
  const [form, setForm] = useState(vazio)
  const [criado, setCriado] = useState(null)
  const [paraDesativar, setParaDesativar] = useState(null)
  const mudar = (campo) => (e) => setForm((atual) => ({ ...atual, [campo]: e.target.value }))

  const usuarios = useQuery({ queryKey: ['usuarios'], queryFn: () => api.get('/usuarios') })
  const recarregar = () => queryClient.invalidateQueries({ queryKey: ['usuarios'] })

  const criar = useMutation({
    mutationFn: () => api.post('/usuarios', form),
    onSuccess: (novo) => {
      setCriado({ email: novo.email, senha: form.senha })
      setForm(vazio)
      recarregar()
    },
  })

  const alterar = useMutation({
    mutationFn: ({ uid, dados }) => api.patch(`/usuarios/${uid}`, dados),
    onSuccess: recarregar,
  })

  return (
    <>
      <header className="cabecalho-pagina">
        <h1>Usuários</h1>
        <p>Quem entra no Ferrum. Colaboradores não têm login: eles se identificam no balcão.</p>
      </header>

      <div className="grade-cadastros">
        <section className="card secao-cadastro" aria-labelledby="titulo-novo-usuario">
          <h2 id="titulo-novo-usuario">Novo usuário</h2>
          <form
            className="formulario-vertical"
            onSubmit={(e) => {
              e.preventDefault()
              setCriado(null)
              criar.mutate()
            }}
          >
            <label className="campo">
              <span>Nome</span>
              <input value={form.nome} onChange={mudar('nome')} required />
            </label>
            <label className="campo">
              <span>E-mail</span>
              <input type="email" value={form.email} onChange={mudar('email')} required />
            </label>
            <label className="campo">
              <span>Perfil</span>
              <select value={form.perfil} onChange={mudar('perfil')}>
                <option value="almoxarife">Almoxarife: retiradas, devoluções e consultas</option>
                <option value="admin">Administrador: tudo, inclusive cadastros e usuários</option>
              </select>
            </label>
            <label className="campo">
              <span>Senha inicial (mínimo 8 caracteres)</span>
              <input type="text" autoComplete="off" value={form.senha} onChange={mudar('senha')} minLength={8} required />
            </label>
            {criar.isError && (
              <p className="mensagem-erro" role="alert">
                {criar.error.message}
              </p>
            )}
            {criado && (
              <p className="aviso-sucesso" role="status">
                Usuário criado. Passe para a pessoa o e-mail <strong>{criado.email}</strong> e a senha inicial{' '}
                <strong>{criado.senha}</strong>. Ela pode trocar a senha em "Esqueci minha senha".
              </p>
            )}
            <button type="submit" className="botao botao-primario" disabled={criar.isPending}>
              {criar.isPending ? 'Criando…' : 'Criar usuário'}
            </button>
          </form>
        </section>

        <section className="card secao-cadastro" aria-labelledby="titulo-lista-usuarios">
          <h2 id="titulo-lista-usuarios">Usuários cadastrados</h2>
          {usuarios.isPending && <Esqueleto linhas={4} />}
          {usuarios.isError && <p className="mensagem-erro">{usuarios.error.message}</p>}
          {alterar.isError && (
            <p className="mensagem-erro" role="alert">
              {alterar.error.message}
            </p>
          )}
          {usuarios.data && (
            <ul className="lista-usuarios">
              {usuarios.data.map((u) => {
                const souEu = u.id === eu.uid
                return (
                  <li key={u.id} className="usuario-linha" data-inativo={!u.ativo}>
                    <div>
                      <p className="usuario-nome">
                        {u.nome}
                        {souEu && ' (você)'}
                      </p>
                      <p className="texto-apoio">{u.email}</p>
                    </div>
                    <div className="usuario-acoes">
                      <select
                        aria-label={`Perfil de ${u.nome}`}
                        value={u.perfil}
                        disabled={souEu || !u.ativo}
                        onChange={(e) => alterar.mutate({ uid: u.id, dados: { perfil: e.target.value } })}
                      >
                        {Object.entries(PERFIS).map(([valor, rotulo]) => (
                          <option key={valor} value={valor}>
                            {rotulo}
                          </option>
                        ))}
                      </select>
                      {!souEu && (
                        <button
                          type="button"
                          className="botao botao-secundario botao-pequeno"
                          onClick={() =>
                            u.ativo ? setParaDesativar(u) : alterar.mutate({ uid: u.id, dados: { ativo: true } })
                          }
                        >
                          {u.ativo ? 'Desativar' : 'Reativar'}
                        </button>
                      )}
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>

      <Confirmacao
        aberta={Boolean(paraDesativar)}
        titulo={`Desativar ${paraDesativar?.nome ?? ''}?`}
        mensagem="A pessoa perde o acesso ao Ferrum na hora. Você pode reativar depois."
        textoConfirmar="Desativar usuário"
        perigo
        carregando={alterar.isPending}
        aoCancelar={() => setParaDesativar(null)}
        aoConfirmar={() =>
          alterar.mutate({ uid: paraDesativar.id, dados: { ativo: false } }, { onSettled: () => setParaDesativar(null) })
        }
      />
    </>
  )
}

export default Usuarios
