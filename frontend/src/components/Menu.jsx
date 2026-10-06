import { NavLink } from 'react-router'
import { gruposDoMenu } from '../rotas.js'
import Icone from './Icone.jsx'
import Marca from './Marca.jsx'
import StatusApi from './StatusApi.jsx'

function Menu({ aberto, aoNavegar }) {
  return (
    <aside className="menu" id="menu-lateral" data-aberto={aberto}>
      <Marca aoClicar={aoNavegar} />

      <nav aria-label="Menu principal">
        {gruposDoMenu.map((grupo) => (
          <div className="menu-grupo" key={grupo.nome}>
            {grupo.rotas.map((rota) => (
              <NavLink
                key={rota.caminho}
                to={rota.caminho}
                end={rota.caminho === '/'}
                className="menu-link"
                onClick={aoNavegar}
              >
                <Icone nome={rota.icone} />
                {rota.titulo}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="menu-rodape">
        <StatusApi />
      </div>
    </aside>
  )
}

export default Menu
