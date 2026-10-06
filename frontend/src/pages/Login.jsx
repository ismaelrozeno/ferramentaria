import { sendPasswordResetEmail } from 'firebase/auth'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import FundoOficina from '../components/FundoOficina.jsx'
import Icone from '../components/Icone.jsx'
import logo from '../assets/logo.png'
import { useAuth } from '../contexto/auth.js'
import { auth } from '../services/firebase.js'

function Login() {
  const { usuario, carregando, erro, entrar } = useAuth()
  const local = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState(null)

  if (!carregando && usuario) return <Navigate to={local.state?.voltarPara ?? '/'} replace />

  async function aoEntrar(e) {
    e.preventDefault()
    setAviso(null)
    setEnviando(true)
    await entrar(email, senha)
    setEnviando(false)
  }

  async function esqueciSenha() {
    if (!email.trim()) {
      setAviso('Digite seu e-mail acima e clique de novo em "Esqueci minha senha".')
      return
    }
    try {
      await sendPasswordResetEmail(auth, email.trim())
    } catch {
      // A resposta é a mesma exista ou não a conta, para não revelar quem tem acesso.
    }
    setAviso(`Se ${email.trim()} tiver acesso ao Ferrum, um e-mail com o link para criar uma nova senha chega em alguns minutos.`)
  }

  return (
    <div className="pagina-login">
      <FundoOficina />
      <main className="card cartao-login">
        <div className="login-marca">
          <img src={logo} alt="" width="56" height="56" />
          <span>Ferrum</span>
        </div>
        <h1>Entrar</h1>
        <p className="texto-apoio">Acesso de administradores e almoxarifes.</p>

        <form className="formulario-login" onSubmit={aoEntrar}>
          <label className="campo">
            <span>E-mail</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <div className="campo">
            <label htmlFor="senha">Senha</label>
            <div className="campo-com-botao">
              <input
                id="senha"
                type={mostrarSenha ? 'text' : 'password'}
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
              <button
                type="button"
                className="botao-olho"
                aria-label={mostrarSenha ? 'Esconder senha' : 'Mostrar senha'}
                aria-pressed={mostrarSenha}
                onClick={() => setMostrarSenha((atual) => !atual)}
              >
                <Icone nome={mostrarSenha ? 'olhoFechado' : 'olho'} />
              </button>
            </div>
          </div>

          {erro && (
            <p className="mensagem-erro" role="alert">
              {erro}
            </p>
          )}
          {aviso && (
            <p className="aviso-sucesso" role="status">
              {aviso}
            </p>
          )}

          <button type="submit" className="botao botao-primario botao-largo" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
          <button type="button" className="botao-link" onClick={esqueciSenha}>
            Esqueci minha senha
          </button>
        </form>
      </main>
      <footer className="rodape rodape-login">
        <span>© {new Date().getFullYear()} Issell Informática.</span> <span>Todos os direitos reservados.</span>
      </footer>
    </div>
  )
}

export default Login
