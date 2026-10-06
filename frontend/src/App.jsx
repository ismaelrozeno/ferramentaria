import { Route, Routes } from 'react-router'
import Layout from './components/Layout.jsx'
import Dashboard from './pages/Dashboard.jsx'
import EmConstrucao from './pages/EmConstrucao.jsx'
import NaoEncontrada from './pages/NaoEncontrada.jsx'
import { todasAsRotas } from './rotas.js'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
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
