import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    // Em desenvolvimento, /api é encaminhado para o back-end
    proxy: {
      '/api': 'http://localhost:3001',
    },
  },
  build: {
    // O SDK de login do Firebase deixa o pacote em ~600 kB (143 kB comprimido),
    // o que carrega em menos de 1 s no 4G. O aviso padrão é de 500 kB.
    chunkSizeWarningLimit: 700,
  },
})
