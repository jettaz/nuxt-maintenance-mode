import { createHmac } from 'node:crypto'

export default defineEventHandler((event) => {
  const config = useRuntimeConfig()

  const mm = config.public.maintenanceMode as Record<string, unknown>
  if (!mm.enabled) return

  const url = getRequestURL(event)
  const route = mm.route as string
  const excludeRoutes = (mm.excludeRoutes as string[]) || []
  const allowedIPs = (mm.allowedIPs as string[]) || []

  if (
    url.pathname === route ||
    url.pathname.startsWith('/api/_maintenance') ||
    url.pathname.startsWith('/_nuxt') ||
    url.pathname.startsWith('/__nuxt') ||
    excludeRoutes.some((r) => url.pathname === r || url.pathname.startsWith(r))
  ) {
    return
  }

  if (allowedIPs.length > 0) {
    const ip =
      getRequestHeader(event, 'x-forwarded-for')?.split(',')[0]?.trim() ||
      getRequestHeader(event, 'x-real-ip') ||
      event.node.req.socket?.remoteAddress ||
      ''
    if (allowedIPs.includes(ip)) return
  }

  const cookies = parseCookies(event)
  const token = cookies.maintenance_bypass

  const mmPrivate = config.maintenanceMode as Record<string, unknown>
  if (!token || !mmPrivate.secret) {
    return sendRedirect(event, route, 302)
  }

  const expected = createHmac('sha256', mmPrivate.secret as string)
    .update('maintenance_bypass')
    .digest('hex')

  if (token !== expected) {
    return sendRedirect(event, route, 302)
  }
})
