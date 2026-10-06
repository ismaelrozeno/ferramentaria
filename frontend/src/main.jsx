import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router'
import App from './App.jsx'
import ProvedorAuth from './components/ProvedorAuth.jsx'
import './styles/tokens.css'
import './styles/global.css'
import './styles/layout.css'
import './styles/componentes.css'
import './styles/fundo.css'
import './styles/telas.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: true, staleTime: 10_000 },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ProvedorAuth>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProvedorAuth>
    </QueryClientProvider>
  </StrictMode>,
)
