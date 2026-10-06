import { useState } from 'react'
import { NavLink } from 'react-router'
import { useAuth } from '../contexto/auth.js'
import { gruposDoMenu } from '../rotas.js'
import Confirmacao from './Confirmacao.jsx'
import Icone from './Icone.jsx'
import Marca from './Marca.jsx'
import StatusApi from './StatusApi.jsx'

const PERFIS = { admin: 'Administrador', almoxarife: 'Almoxarife' }

function Menu({ aberto, aoNavegar }) {
  const { usuario, sair } = useAuth()
  const [confirmandoSaida, setConfirmandoSaida] = useState(false)
  const podeVer = (rota) => !rota.perfis || rota.perfis.includes(usuario?.perfil)

  return (
    <aside className="menu" id="menu-lateral" data-aberto={aberto}>
      <Marca aoClicar={aoNavegar} />

      <nav aria-label="Menu principal">
        {gruposDoMenu.map((grupo) => (
          <div className="menu-grupo" key={grupo.nome}>
            {grupo.rotas.filter(podeVer).map((rota) => (
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
        {usuario && (
          <div className="menu-usuario">
            <p className="menu-usuario-nome">{usuario.nome}</p>
            <p className="menu-usuario-perfil">{PERFIS[usuario.perfil]}</p>
            <button type="button" className="botao botao-secundario botao-pequeno" onClick={() => setConfirmandoSaida(true)}>
              Sair
            </button>
          </div>
        )}
        <Confirmacao
          aberta={confirmandoSaida}
          titulo="Sair do FERRUM?"
          mensagem="Você vai precisar do e-mail e da senha para entrar de novo neste aparelho."
          textoConfirmar="Sair"
          aoCancelar={() => setConfirmandoSaida(false)}
          aoConfirmar={() => {
            setConfirmandoSaida(false)
            sair()
          }}
        />
        <StatusApi />
      </div>
    </aside>
  )
}

export default Menu
