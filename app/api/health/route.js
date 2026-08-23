import { NextResponse } from 'next/server'
import { prisma }       from '@/lib/prisma'

export async function GET() {
  const checks = {}

  // Database check
  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = 'ok'
  } catch {
    checks.database = 'error'
  }

  // Redis check (nếu có)
  try {
    const { redis } = await import('@/lib/redis')
    await redis.ping()
    checks.redis = 'ok'
  } catch {
    checks.redis = 'unavailable'
  }

  const allOk   = Object.values(checks).every(v => v === 'ok' || v === 'unavailable')
  const status  = allOk ? 200 : 503

  return NextResponse.json({
    status:    allOk ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    version:   process.env.npm_package_version || '1.0.0',
    checks,
  }, { status })
}
