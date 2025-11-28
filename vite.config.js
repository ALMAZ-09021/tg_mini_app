import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    // Разрешаем этот конкретный домен
    allowedHosts: ['superglottal-yvone-unreprehended.ngrok-free.dev'],

    // ИЛИ просто разрешаем всё (проще):
    // allowedHosts: true,
  },
})
