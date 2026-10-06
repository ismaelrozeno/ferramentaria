import { useLocation, useNavigate } from 'react-router'
import Icone from './Icone.jsx'

// Página "de cima" de cada endereço, usada quando não há para onde voltar
// no histórico (ex.: a pessoa abriu o link direto).
function paginaDeCima(caminho) {
  if (caminho.startsWith('/catalogo/')) return '/catalogo'
  return '/'
}

function BotaoVoltar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  if (pathname === '/') return null

  function voltar() {
    // O React Router guarda a posição no histórico em history.state.idx:
    // maior que zero = a pessoa chegou aqui navegando dentro do sistema.
    if (window.history.state?.idx > 0) navigate(-1)
    else navigate(paginaDeCima(pathname))
  }

  return (
    <button type="button" className="botao-voltar" onClick={voltar}>
      <Icone nome="voltar" tamanho={18} />
      Voltar
    </button>
  )
}

export default BotaoVoltar
