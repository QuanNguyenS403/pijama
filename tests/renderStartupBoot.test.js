import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const projectRoot = path.resolve(__dirname, '..')

function getFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.unref()
    srv.on('error', reject)
    srv.listen(0, '127.0.0.1', () => {
      const addr = srv.address()
      const port = typeof addr === 'object' && addr ? addr.port : 0
      srv.close((closeErr) => (closeErr ? reject(closeErr) : resolve(port)))
    })
  })
}

async function waitForHttpOk(url, timeoutMs = 8000) {
  const start = Date.now()
  let lastErr = null
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(1000) })
      if (res.ok) {
        return { res, elapsedMs: Date.now() - start }
      }
      lastErr = new Error(`HTTP ${res.status}`)
    } catch (err) {
      lastErr = err
    }
    await new Promise((r) => setTimeout(r, 50))
  }
  throw new Error(`Timed out waiting for ${url} after ${timeoutMs}ms: ${lastErr?.message || lastErr}`)
}

function buildIsolatedProdEnv(overrides = {}) {
  const base = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (
      !/^(GAS_|GMAIL|RESEND|SMTP|TURNSTILE|SUPABASE|GOOGLE_|VIETTELPOST_|TELEGRAM_|REDIS_URL|NODE_TEST_CONTEXT|NODE_ENV|AUTH_TEST_MODE|EMAIL_REAL_SEND|EMAIL_DELIVERY_DISABLED|ORDER_STORE_FILE|TX_STORE_FILE|ACCOUNT_DB_FILE)/i.test(
        k
      )
    ) {
      base[k] = v
    }
  }
  return {
    ...base,
    CI: '',
    RENDER: 'true',
    ADMIN_PASSWORD: 'test-render-admin-password-2026',
    ADMIN_SESSION_SECRET: 'test-render-admin-session-secret-key-32-chars',
    ORDER_TOKEN_SECRET: 'test-render-order-token-secret-key-32-chars',
    CUSTOMER_AUTH_SECRET: 'test-render-customer-auth-secret-key-32-chars',
    JWT_SECRET: 'test-render-jwt-secret-key-distinct-32-chars',
    GMAIL_USER: 'render-test@example.invalid',
    OWNER_EMAIL: 'render-owner@example.invalid',
    ...overrides,
  }
}

describe('Render Production Startup & Port-Bind Regression Suite', () => {
  const distDir = path.join(projectRoot, 'dist')
  const distIndexPath = path.join(distDir, 'index.html')
  let createdDistDir = false
  let createdDistIndex = false
  const tempDirs = []

  before(() => {
    // CI runs `npm test` before `npm run build`, so provide a temporary dist/index.html if missing
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true })
      createdDistDir = true
    }
    if (!fs.existsSync(distIndexPath)) {
      fs.writeFileSync(distIndexPath, '<!doctype html><html><body>render-test</body></html>', 'utf8')
      createdDistIndex = true
    }
  })

  after(() => {
    if (createdDistIndex && fs.existsSync(distIndexPath)) {
      try {
        fs.unlinkSync(distIndexPath)
      } catch {}
    }
    if (createdDistDir && fs.existsSync(distDir)) {
      try {
        fs.rmSync(distDir, { recursive: true, force: true })
      } catch {}
    }
    for (const dir of tempDirs) {
      try {
        fs.rmSync(dir, { recursive: true, force: true })
      } catch {}
    }
  })

  it('package.json và render.yaml dùng trực tiếp `node server/start.js` và `/livez` health check', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
    assert.equal(pkg.scripts?.start, 'node server/start.js')

    const renderYaml = fs.readFileSync(path.join(projectRoot, 'render.yaml'), 'utf8')
    assert.match(renderYaml, /^\s*startCommand:\s*node\s+server\/start\.js\s*$/m)
    assert.match(renderYaml, /^\s*healthCheckPath:\s*\/livez\s*$/m)
  })

  it('server/start.js mở cổng HTTP và phản hồi /livez 200 OK + /api/chat/config nhanh không nghẽn', async () => {
    const port = await getFreePort()
    const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qns-render-boot-'))
    tempDirs.push(tempDataDir)

    let stdout = ''
    let stderr = ''
    const child = spawn(
      process.execPath,
      ['--import', './tests/setup/no-real-network.mjs', 'server/start.js'],
      {
        cwd: projectRoot,
        env: buildIsolatedProdEnv({
          PORT: String(port),
          DATA_DIR: tempDataDir,
          UPLOADS_DIR: path.join(tempDataDir, 'uploads'),
        }),
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8')
    })

    const exitPromise = new Promise((resolve) => {
      child.once('exit', (code, signal) => resolve({ code, signal }))
    })

    try {
      const { res: liveRes } = await waitForHttpOk(`http://127.0.0.1:${port}/livez`, 8000)
      assert.equal(liveRes.status, 200)
      const liveBody = await liveRes.json()
      assert.equal(liveBody.status, 'alive')

      const chatRes = await fetch(`http://127.0.0.1:${port}/api/chat/config`, {
        signal: AbortSignal.timeout(3000),
      })
      assert.equal(chatRes.status, 200)
      const chatBody = await chatRes.json()
      assert.equal(chatBody.success, true)

      assert.match(stdout, /\[START\] Booting QuanNguyenS entrypoint/)
      assert.match(stdout, /QuanNguyenS Order Server đang lắng nghe/)
    } finally {
      if (child.exitCode === null && child.signalCode === null) {
        child.kill('SIGTERM')
      }
      const exitResult = await Promise.race([
        exitPromise,
        new Promise((resolve) => setTimeout(() => {
          if (child.exitCode === null) child.kill('SIGKILL')
          resolve({ timedOut: true })
        }, 5000)),
      ])
      if (process.platform !== 'win32' && !exitResult.timedOut) {
        assert.equal(exitResult.code, 0, `Expected clean SIGTERM exit on POSIX, stderr=${stderr}`)
      }
    }
  })

  it('server/start.js từ chối fail-closed và in rõ lý do ra stderr khi thiếu/sai khóa bảo mật Production', async () => {
    const port = await getFreePort()
    const tempDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qns-render-fail-'))
    tempDirs.push(tempDataDir)

    let stdout = ''
    let stderr = ''
    const child = spawn(
      process.execPath,
      ['--import', './tests/setup/no-real-network.mjs', 'server/start.js'],
      {
        cwd: projectRoot,
        env: buildIsolatedProdEnv({
          PORT: String(port),
          DATA_DIR: tempDataDir,
          ADMIN_PASSWORD: 'short',
        }),
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    )

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8')
    })
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8')
    })

    const { code } = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        child.kill('SIGKILL')
        reject(new Error('Fail-closed startup check timed out'))
      }, 8000)
      child.once('exit', (exitCode) => {
        clearTimeout(timer)
        resolve({ code: exitCode })
      })
    })

    assert.notEqual(code, 0, `Expected non-zero exit code when ADMIN_PASSWORD is invalid; stdout=${stdout}`)
    assert.match(stderr, /CRITICAL/i)
    assert.match(stderr, /ADMIN_PASSWORD/)
  })
})
