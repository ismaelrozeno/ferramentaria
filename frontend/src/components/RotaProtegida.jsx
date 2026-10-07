import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '../contexto/auth.js'

// Sem login, manda para /login (e volta para a página pedida depois de entrar).
// Com `perfis`, só esses perfis veem a página.
function RotaProtegida({ perfis, children }) {
  const { carregando, usuario } = useAuth()
  const local = useLocation()

  if (carregando) {
    return (
      <div className="tela-carregando" role="status">
        <span className="spinner spinner-grande" aria-hidden="true" />
        <span className="sr-only">Carregando…</span>
      </div>
    )
  }

  if (!usuario) return <Navigate to="/login" replace state={{ voltarPara: local.pathname }} />

  if (perfis && !perfis.includes(usuario.perfil)) {
    return (
      <section className="card em-breve">
        <h1>Sem permissão</h1>
        <p>Esta página é só para administradores. Se precisar dela, fale com o administrador do sistema.</p>
        <Link to="/" className="botao botao-secundario">
          Voltar ao dashboard
        </Link>
      </section>
    )
  }

  return children
}

export default RotaProtegida
