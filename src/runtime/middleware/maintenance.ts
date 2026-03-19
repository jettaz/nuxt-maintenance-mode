export default defineNuxtRouteMiddleware((to) => {
  const config = useRuntimeConfig()
  const mm = config.public.maintenanceMode as Record<string, unknown>
  if (!mm.enabled) return

  const bypassed = useState<boolean>('maintenance-bypassed')
  const route = mm.route as string

  if (bypassed.value && to.path === route) {
    return abortNavigation()
  }
})
