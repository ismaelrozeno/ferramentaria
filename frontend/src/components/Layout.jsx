import { useState } from 'react'
import { Outlet } from 'react-router'
import Icone from './Icone.jsx'
import Marca from './Marca.jsx'
import Menu from './Menu.jsx'

function Layout() {
  const [menuAberto, setMenuAberto] = useState(false)
  const fecharMenu = () => setMenuAberto(false)

  return (
    <div className="app">
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
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
