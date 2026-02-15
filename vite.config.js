const { defineConfig } = require('vite')

// Proxy /api requests to Express backend running on port 4000 during development
module.exports = defineConfig({
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
