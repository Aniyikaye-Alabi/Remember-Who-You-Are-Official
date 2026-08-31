import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Vite's default 5173 sits inside a Windows reserved port range on some
  // machines and fails to bind with EACCES; 3000 is reliably free.
  server: { host: '127.0.0.1', port: 3000 },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
