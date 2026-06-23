import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        query: resolve(__dirname, 'query-playground.html'),
        form: resolve(__dirname, 'form-playground.html'),
      },
    },
  },
  server: { port: 5177 },
})

