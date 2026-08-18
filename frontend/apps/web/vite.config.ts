import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        ws: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
  resolve: {
    alias: {
      '@chart/tokens/css': fileURLToPath(
        new URL('../../packages/tokens/dist/css/tokens.css', import.meta.url),
      ),
      '@chart/tokens': fileURLToPath(
        new URL('../../packages/tokens/dist/js/index.js', import.meta.url),
      ),
    },
  },
})
