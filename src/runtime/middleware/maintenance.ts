import { defineNuxtRouteMiddleware, useState, useRuntimeConfig, useCookie, abortNavigation, navigateTo } from '#imports'

export default defineNuxtRouteMiddleware((to, from) => {
  const config = useRuntimeConfig()
  const mm = config.public.maintenanceMode as Record<string, unknown>
  if (!mm.enabled) return

  const bypassed = useState<boolean>('maintenance-bypassed', () => false)
  const hint = useCookie('maintenance_bypass_hint')
  const route = mm.route as string
  const excludeRoutes = (mm.excludeRoutes as string[]) || []

  if (bypassed.value || !!hint.value) {
    if (to.path === route) {
      if (from?.path && from.path !== route) {
        return abortNavigation()
      }
      return navigateTo('/', { replace: true })
    }
    return
  }

  if (to.path === route) return
  if (excludeRoutes.some((r) => to.path === r || to.path.startsWith(r))) return

  return navigateTo(route, { replace: true })
})
