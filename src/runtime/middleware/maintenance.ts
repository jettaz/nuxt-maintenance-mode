import { defineNuxtRouteMiddleware, useState, useRuntimeConfig, useCookie, abortNavigation, navigateTo } from '#imports'

export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()
  const mm = config.public.maintenanceMode as Record<string, unknown>
  if (!mm.enabled) return

  const bypassed = useState<boolean>('maintenance-bypassed', () => false)
  const hint = useCookie('maintenance_bypass_hint')
  const route = mm.route as string

  if ((bypassed.value || !!hint.value) && to.path === route) {
    if (from?.path && from.path !== route) {
      return abortNavigation()
    }
    return navigateTo('/', { replace: true })
  }
})
