import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigationType } from 'react-router'
import BarraProgresso from './BarraProgresso.jsx'
import BotaoVoltar from './BotaoVoltar.jsx'
import FundoOficina from './FundoOficina.jsx'
import Icone from './Icone.jsx'
import Marca from './Marca.jsx'
import Menu from './Menu.jsx'

function Layout() {
  const [menuAberto, setMenuAberto] = useState(false)
  const { key } = useLocation()
  const tipoNavegacao = useNavigationType()
  const fecharMenu = () => setMenuAberto(false)

  // Cada clique no menu abre a página do zero (sem busca/filtros antigos), mesmo já estando nela,
  // e começa do topo. Voltar/avançar do navegador mantém a rolagem que o navegador guardou.
  useEffect(() => {
    if (tipoNavegacao !== 'POP') window.scrollTo(0, 0)
  }, [key, tipoNavegacao])

  return (
    <div className="app">
      <FundoOficina />
      <BarraProgresso />
      <a href="#conteudo" className="pular-para-conteudo">
        Pular para o conteúdo
      </a>

      <header className="topo">
        <Marca aoClicar={fecharMenu} />
        <button
          type="button"
          className="botao-menu"
          aria-label={menuAberto ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuAberto}
          aria-controls="menu-lateral"
          onClick={() => setMenuAberto((aberto) => !aberto)}
        >
          <Icone nome={menuAberto ? 'fechar' : 'menu'} />
        </button>
      </header>

      <Menu aberto={menuAberto} aoNavegar={fecharMenu} />
      <div className="fundo-menu" data-aberto={menuAberto} onClick={fecharMenu} />

      <main className="conteudo" id="conteudo">
        <div className="conteudo-interno">
          <BotaoVoltar />
          <div key={key} className="transicao-pagina">
            <Outlet />
          </div>
        </div>
        <footer className="rodape">
          <span>© {new Date().getFullYear()} Issell Informática.</span>{' '}
          <span>Todos os direitos reservados.</span>
        </footer>
      </main>
    </div>
  )
}

export default Layout
