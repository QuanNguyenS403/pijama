import { argon2id } from 'hash-wasm'
import crypto from 'crypto'

const DEFAULT_ITERATIONS = 2
const DEFAULT_MEMORY = 19456 // 19 MB
const DEFAULT_PARALLELISM = 1
const DEFAULT_HASH_LENGTH = 32

/**
 * Băm mật khẩu bằng giải thuật Argon2id chuẩn OWASP / RFC 9106
 * @param {string} password - Mật khẩu người dùng nhập
 * @returns {Promise<string>} - Chuỗi hash dạng $argon2id$v=19$m=19456,t=2,p=1$...
 */
export async function hashPassword(password) {
  if (!password || typeof password !== 'string') {
    throw new Error('Mật khẩu không hợp lệ')
  }

  const salt = crypto.randomBytes(16)
  const encoded = await argon2id({
    password: String(password),
    salt,
    parallelism: DEFAULT_PARALLELISM,
    iterations: DEFAULT_ITERATIONS,
    memorySize: DEFAULT_MEMORY,
    hashLength: DEFAULT_HASH_LENGTH,
    outputType: 'encoded',
  })

  return encoded
}

/**
 * Xác thực mật khẩu với chuỗi băm Argon2id bằng constant-time comparison
 * @param {string} password - Mật khẩu người dùng nhập
 * @param {string} storedHash - Chuỗi hash đã lưu trong database
 * @returns {Promise<boolean>}
 */
export async function verifyPassword(password, storedHash) {
  if (!password || !storedHash || typeof password !== 'string' || typeof storedHash !== 'string') {
    return false
  }

  try {
    // Trích xuất thông số và salt từ chuỗi encoded: $argon2id$v=19$m=19456,t=2,p=1$<salt-b64>$<hash-b64>
    const parts = storedHash.split('$')
    if (parts.length < 6 || !parts[1].startsWith('argon2')) {
      // Fallback cho mật khẩu giả định chưa chuẩn hóa
      return false
    }

    const paramsStr = parts[3] // m=19456,t=2,p=1
    const saltB64 = parts[4]
    const expectedRawHashB64 = parts[5]

    const memoryMatch = paramsStr.match(/m=(\d+)/)
    const iterationsMatch = paramsStr.match(/t=(\d+)/)
    const parallelismMatch = paramsStr.match(/p=(\d+)/)

    const memorySize = memoryMatch ? parseInt(memoryMatch[1], 10) : DEFAULT_MEMORY
    const iterations = iterationsMatch ? parseInt(iterationsMatch[1], 10) : DEFAULT_ITERATIONS
    const parallelism = parallelismMatch ? parseInt(parallelismMatch[1], 10) : DEFAULT_PARALLELISM

    // Giải mã salt từ base64/base64url
    const salt = Buffer.from(saltB64, 'base64')

    const computed = await argon2id({
      password: String(password),
      salt,
      parallelism,
      iterations,
      memorySize,
      hashLength: DEFAULT_HASH_LENGTH,
      outputType: 'encoded',
    })

    const computedParts = computed.split('$')
    const computedRawHashB64 = computedParts[5]

    if (!computedRawHashB64 || !expectedRawHashB64) return false

    const bufA = Buffer.from(computedRawHashB64, 'utf8')
    const bufB = Buffer.from(expectedRawHashB64, 'utf8')

    if (bufA.length !== bufB.length) return false
    return crypto.timingSafeEqual(bufA, bufB)
  } catch (err) {
    console.error('Lỗi xác thực Argon2id:', err.message)
    return false
  }
}
