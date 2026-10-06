import { sendPasswordResetEmail } from 'firebase/auth'
import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import FundoOficina from '../components/FundoOficina.jsx'
import logo from '../assets/logo.png'
import { useAuth } from '../contexto/auth.js'
import { auth } from '../services/firebase.js'

function Login() {
  const { usuario, carregando, erro, entrar } = useAuth()
  const local = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
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
    setAviso(`Se ${email.trim()} tiver acesso ao FERRUM, um e-mail com o link para criar uma nova senha chega em alguns minutos.`)
  }

  return (
    <div className="pagina-login">
      <FundoOficina />
      <main className="card cartao-login">
        <div className="login-marca">
          <img src={logo} alt="" width="56" height="56" />
          <span>FERRUM</span>
        </div>
        <h1>Entrar</h1>
        <p className="texto-apoio">Acesso de administradores e almoxarifes.</p>

        <form className="formulario-login" onSubmit={aoEntrar}>
          <label className="campo">
            <span>E-mail</span>
            <input type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="campo">
            <span>Senha</span>
            <input
              type="password"
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              required
            />
          </label>

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
