import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Aceita conexões da rede local, para abrir o link pessoal num celular de verdade.
    host: true,
    // O front fala com /api na própria origem; em desenvolvimento o Vite repassa para a API local.
    proxy: { '/api': 'http://localhost:8000' },
  },
})
