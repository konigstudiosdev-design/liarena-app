import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'
import electron from 'vite-plugin-electron/simple'

const isElectron = process.env.ELECTRON === 'true' || process.env.VITE_DEV_SERVER_URL !== undefined;

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    !process.env.VERCEL && electron({
      main: {
        entry: 'electron/main.ts',
      },
      preload: {
        input: path.join(__dirname, 'electron/preload.ts'),
      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8443,
    strictPort: true,
  }
})
