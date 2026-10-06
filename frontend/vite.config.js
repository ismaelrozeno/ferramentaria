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
})
