import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })
dotenv.config()

// Vite plugin to handle /api/orders/submit in dev mode without needing a separate process
function orderApiPlugin() {
  return {
    name: 'order-api-dev-server',
    configureServer(server) {
      server.middlewares.use('/api/orders/submit', async (req, res, next) => {
        if (req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })
          req.on('end', async () => {
            try {
              const orderData = JSON.parse(body || '{}')
              const { handleOrderSubmit } = await import('./server/apiHandler.js')
              const result = await handleOrderSubmit(orderData)
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = result.status
              res.end(JSON.stringify(result.data))
            } catch (err) {
              console.error('Dev server order handler error:', err)
              res.setHeader('Content-Type', 'application/json')
              res.statusCode = 500
              res.end(
                JSON.stringify({
                  success: false,
                  error: err.message || 'Lỗi xử lý đơn hàng',
                })
              )
            }
          })
        } else {
          next()
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), orderApiPlugin()],
  base: './',
  server: {
    port: 3000,
    open: true,
  },
})
