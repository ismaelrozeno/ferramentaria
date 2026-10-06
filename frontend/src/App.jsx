import { Route, Routes } from 'react-router'
import Layout from './components/Layout.jsx'
import Cadastros from './pages/Cadastros.jsx'
import Catalogo from './pages/Catalogo.jsx'
import Dashboard from './pages/Dashboard.jsx'
import EmConstrucao from './pages/EmConstrucao.jsx'
import ItemDetalhe from './pages/ItemDetalhe.jsx'
import NaoEncontrada from './pages/NaoEncontrada.jsx'
import NovoItem from './pages/NovoItem.jsx'
import { todasAsRotas } from './rotas.js'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="catalogo" element={<Catalogo />} />
        <Route path="catalogo/novo" element={<NovoItem />} />
        <Route path="catalogo/:id" element={<ItemDetalhe />} />
        <Route path="cadastros" element={<Cadastros />} />
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
