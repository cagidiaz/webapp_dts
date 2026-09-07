import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'

const isHttps = process.env.HTTPS === 'true' || process.env.npm_lifecycle_event === 'dev:https';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(isHttps ? [basicSsl()] : []),
  ],
  server: {
    port: 5173,
    allowedHosts: ['jubilant-comrade-thrift.ngrok-free.dev', '.ngrok-free.dev'],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
