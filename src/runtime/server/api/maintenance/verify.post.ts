import { createHmac, timingSafeEqual } from 'node:crypto'
import { defineEventHandler, getRequestHeader, readBody, createError, setCookie } from 'h3'
import { useRuntimeConfig } from '#imports'

const attempts = new Map<string, { count: number; resetAt: number }>()
const MAX_ATTEMPTS = 5
const WINDOW_MS = 60_000

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const ip =
    getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
    getRequestHeader(event, 'x-real-ip') ||
    event.node.req.socket?.remoteAddress ||
    'unknown'

  const now = Date.now()

  for (const [key, value] of attempts) {
    if (now >= value.resetAt) attempts.delete(key)
  }

  const entry = attempts.get(ip)

  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_ATTEMPTS) {
      throw createError({ statusCode: 429, message: 'Too many attempts. Try again later.' })
    }
    entry.count++
  } else {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS })
  }

  const body = await readBody(event)
  const pin = body?.pin as string | undefined

  const mm = config.maintenanceMode as Record<string, unknown>
  const secret = mm.secret as string

  const submittedHash = createHmac('sha256', secret).update(String(pin ?? '')).digest()
  const expectedHash = createHmac('sha256', secret).update(String(mm.pin ?? '')).digest()
  const pinValid = !!pin && timingSafeEqual(submittedHash, expectedHash)

  if (!pinValid) {
    throw createError({ statusCode: 422, message: 'Invalid PIN' })
  }

  const token = createHmac('sha256', secret)
    .update('maintenance_bypass')
    .digest('hex')

  setCookie(event, 'maintenance_bypass', token, {
    httpOnly: true,
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  setCookie(event, 'maintenance_bypass_hint', '1', {
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })

  attempts.delete(ip)

  return { ok: true }
})
