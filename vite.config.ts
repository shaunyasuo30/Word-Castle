import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { GET as translate } from './api/translate'

export default defineConfig({
  plugins: [react(), {
    name: 'local-translation-endpoint',
    configureServer(server) {
      server.middlewares.use('/api/translate', async (request, response) => {
        const result = await translate(new Request(`http://localhost${request.originalUrl ?? ''}`))
        response.statusCode = result.status
        result.headers.forEach((value, key) => response.setHeader(key, value))
        response.end(await result.text())
      })
    },
  }],
  server: {
    proxy: {
      '/api/dictionary': {
        target: 'https://api.dictionaryapi.dev',
        changeOrigin: true,
        rewrite: path => `/api/v2/entries/en/${encodeURIComponent(new URL(path, 'http://localhost').searchParams.get('word') ?? '')}`,
      },
    },
  },
})
