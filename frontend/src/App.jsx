import { Route, Routes } from 'react-router'
import Layout from './components/Layout.jsx'
import RotaProtegida from './components/RotaProtegida.jsx'
import Cadastros from './pages/Cadastros.jsx'
import Catalogo from './pages/Catalogo.jsx'
import Balcao from './pages/Balcao.jsx'
import Colaboradores from './pages/Colaboradores.jsx'
import Configuracoes from './pages/Configuracoes.jsx'
import Dashboard from './pages/Dashboard.jsx'
import EmConstrucao from './pages/EmConstrucao.jsx'
import ItemDetalhe from './pages/ItemDetalhe.jsx'
import Lixeira from './pages/Lixeira.jsx'
import Login from './pages/Login.jsx'
import NaoEncontrada from './pages/NaoEncontrada.jsx'
import NovoItem from './pages/NovoItem.jsx'
import Painel from './pages/Painel.jsx'
import Ranking from './pages/Ranking.jsx'
import Usuarios from './pages/Usuarios.jsx'
import { todasAsRotas } from './rotas.js'

const somenteAdmin = (pagina) => <RotaProtegida perfis={['admin']}>{pagina}</RotaProtegida>

function App() {
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="painel" element={<Painel />} />
      <Route
        element={
          <RotaProtegida>
            <Layout />
          </RotaProtegida>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="catalogo/novo" element={somenteAdmin(<NovoItem />)} />
        <Route path="catalogo/:id" element={<ItemDetalhe />} />
        <Route path="cadastros" element={<Cadastros />} />
        <Route path="balcao" element={<Balcao />} />
        <Route path="ranking" element={<Ranking />} />
        <Route path="lixeira" element={somenteAdmin(<Lixeira />)} />
        <Route path="configuracoes" element={<Configuracoes />} />
        <Route path="colaboradores" element={<Colaboradores />} />
        <Route path="usuarios" element={somenteAdmin(<Usuarios />)} />
        {todasAsRotas
          .filter((rota) => !rota.pronta)
          .map((rota) => (
            <Route
              key={rota.caminho}
              path={rota.caminho}
              element={<EmConstrucao titulo={rota.titulo} descricao={rota.descricao} />}
            />
          ))}
        <Route path="*" element={<NaoEncontrada />} />
      </Route>
    </Routes>
  )
}

export default App
