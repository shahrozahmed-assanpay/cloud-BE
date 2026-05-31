import type { Context } from 'hono'
import { createMiddleware } from 'hono/factory'

import type { AppEnv } from '../types/auth'

type RateLimitEntry = {
  count: number
  resetAt: number
}

type RateLimiterOptions = {
  windowMs: number
  limit: number
  keyGenerator: (c: Context<AppEnv>) => string
  message: string
}

const buckets = new Map<string, RateLimitEntry>()

function cleanupExpiredBuckets(now: number) {
  for (const [key, entry] of buckets) {
    if (entry.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

export function createRateLimiter(options: RateLimiterOptions) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const now = Date.now()
    cleanupExpiredBuckets(now)

    const key = options.keyGenerator(c)
    const current = buckets.get(key)
    const entry =
      current && current.resetAt > now
        ? current
        : { count: 0, resetAt: now + options.windowMs }

    entry.count += 1
    buckets.set(key, entry)

    const remaining = Math.max(options.limit - entry.count, 0)
    const resetSeconds = Math.ceil((entry.resetAt - now) / 1000)

    c.header('RateLimit-Limit', String(options.limit))
    c.header('RateLimit-Remaining', String(remaining))
    c.header('RateLimit-Reset', String(resetSeconds))

    if (entry.count > options.limit) {
      c.header('Retry-After', String(resetSeconds))
      return c.json({ error: options.message }, 429)
    }

    await next()
  })
}
