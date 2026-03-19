export function useMaintenanceMode() {
  const config = useRuntimeConfig()
  const mm = config.public.maintenanceMode as Record<string, unknown>
  const bypassed = useState<boolean>('maintenance-bypassed', () => false)
  return {
    enabled: mm.enabled as boolean,
    bypassed,
  }
}
