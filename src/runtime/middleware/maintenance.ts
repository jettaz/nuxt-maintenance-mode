import { defineNuxtRouteMiddleware, useState, useRuntimeConfig, useCookie, useRequestHeaders, abortNavigation, navigateTo } from '#imports'

const DEFAULT_PUBLIC_EXCLUDED_PREFIXES = [
  '/_i18n',
  '/_ipx',
  '/__sitemap__',
  '/robots.txt',
  '/manifest.json',
  '/favicon.ico',
]

export default defineNuxtRouteMiddleware((to, from) => {
  if (import.meta.server && useRequestHeaders(['x-nitro-prerender'])['x-nitro-prerender']) return

  const config = useRuntimeConfig()
  const mm = config.public.maintenanceMode as Record<string, unknown>
  if (!mm.enabled) return

  const bypassed = useState<boolean>('maintenance-bypassed', () => false)
  const hint = useCookie('maintenance_bypass_hint')
  const route = mm.route as string
  const excludeRoutes = (mm.excludeRoutes as string[]) || []
  const hasBypass = bypassed.value || (!import.meta.server && !!hint.value)

  if (hasBypass) {
    if (to.path === route) {
      if (from?.path && from.path !== route) {
        return abortNavigation()
      }
      return navigateTo('/', { replace: true })
    }
    return
  }

  if (to.path === route) return
  if (DEFAULT_PUBLIC_EXCLUDED_PREFIXES.some((r) => to.path === r || to.path.startsWith(r))) return
  if (excludeRoutes.some((r) => to.path === r || to.path.startsWith(r))) return

  return navigateTo(route, { replace: true })
})
