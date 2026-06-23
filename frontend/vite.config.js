import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: !process.env.CI && !process.env.PORT,
    allowedHosts: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
}) 