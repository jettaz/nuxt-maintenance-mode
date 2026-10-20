import { createHmac, timingSafeEqual } from 'node:crypto'
import { defineEventHandler, getRequestURL, getRequestHeader, parseCookies, sendRedirect, setResponseHeader, setResponseStatus } from 'h3'
import { useRuntimeConfig } from '#imports'
import { isAllowedIP } from '../utils/client-ip'

const DEFAULT_PUBLIC_EXCLUDED_PREFIXES = [
  '/_i18n',
  '/_ipx',
  '/__sitemap__',
  '/robots.txt',
  '/manifest.json',
  '/favicon.ico',
]

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()

  const mm = config.public.maintenanceMode as Record<string, unknown>
  const url = getRequestURL(event)
  const route = mm.route as string
  const excludeRoutes = (mm.excludeRoutes as string[]) || []

  if (!mm.enabled) {
    if (url.pathname === route) {
      return sendRedirect(event, '/', 302)
    }
    return
  }

  if (getRequestHeader(event, 'x-nitro-prerender')) {
    return
  }

  if (
    url.pathname.startsWith('/api/_maintenance') ||
    url.pathname.startsWith('/_nuxt') ||
    url.pathname.startsWith('/__nuxt') ||
    DEFAULT_PUBLIC_EXCLUDED_PREFIXES.some((r) => url.pathname === r || url.pathname.startsWith(r)) ||
    excludeRoutes.some((r) => url.pathname === r || url.pathname.startsWith(r))
  ) {
    return
  }

  if (isAllowedIP(event)) return

  const cookies = parseCookies(event)
  const token = cookies.maintenance_bypass
  const mmPrivate = config.maintenanceMode as Record<string, unknown>

  const isValid = !!(token && mmPrivate.secret && (() => {
    const encoder = new TextEncoder()
    const tokenBytes = encoder.encode(token)
    const expectedBytes = encoder.encode(createHmac('sha256', mmPrivate.secret as string).update('maintenance_bypass').digest('hex'))
    return tokenBytes.length === expectedBytes.length && timingSafeEqual(tokenBytes, expectedBytes)
  })())

  if (isValid || url.pathname === route) return

  const secFetchMode = getRequestHeader(event, 'sec-fetch-mode')
  const accept = getRequestHeader(event, 'accept') || ''
  const isNavigationRequest = secFetchMode === 'navigate' || accept.includes('text/html')

  setResponseHeader(event, 'Cache-Control', 'no-store, no-cache, must-revalidate')
  if (isNavigationRequest) {
    return sendRedirect(event, route, 302)
  }

  setResponseHeader(event, 'Retry-After', 60)
  setResponseStatus(event, 503)
  return {
    statusCode: 503,
    statusMessage: 'Maintenance mode active',
  }
})
