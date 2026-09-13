import { defineConfig, createLogger } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

// Tùy biến logger để không in stack trace ECONNREFUSED làm ngập terminal khi backend chưa chạy
const logger = createLogger()
const originalError = logger.error
logger.error = (msg, options) => {
  if (
    typeof msg === 'string' &&
    msg.includes('http proxy error') &&
    (msg.includes('ECONNREFUSED') || msg.includes('/api/orders/events'))
  ) {
    return
  }
  originalError(msg, options)
}

export default defineConfig({
  customLogger: logger,
  plugins: [react()],
  base: '/',
  server: {
    port: 3000,
    open: true,
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            if (err.code === 'ECONNREFUSED' || err.message?.includes('ECONNREFUSED')) {
              if (res && !res.headersSent && typeof res.writeHead === 'function') {
                res.writeHead(503, { 'Content-Type': 'application/json' })
                res.end(
                  JSON.stringify({
                    success: false,
                    error: 'Backend API server (cổng 3001) chưa chạy. Khởi động bằng "npm run dev".',
                    code: 'BACKEND_NOT_RUNNING',
                  })
                )
              }
            }
          })
        },
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'vendor-react'
            }
            if (id.includes('framer-motion')) {
              return 'vendor-motion'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            return 'vendor-other'
          }
        },
      },
    },
  },
})
