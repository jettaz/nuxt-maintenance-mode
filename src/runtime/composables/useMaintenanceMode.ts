import type { Ref } from 'vue'
import { useRuntimeConfig, useState } from '#imports'

export interface UseMaintenanceMode {
  enabled: boolean
  bypassed: Ref<boolean>
  /** `true` for a correct PIN, `false` for a wrong one (422). Throws on 429 and other errors. */
  verifyPin: (pin: string) => Promise<boolean>
  /** Marks the session as bypassed and does a full reload, so startup requests are retried with the new cookie. */
  unlock: () => void
}

export function useMaintenanceMode(): UseMaintenanceMode {
  const config = useRuntimeConfig()
  const bypassed = useState<boolean>('maintenance-bypassed', () => false)

  async function verifyPin(pin: string): Promise<boolean> {
    try {
      await $fetch('/api/_maintenance/verify', { method: 'POST', body: { pin } })
      return true
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode === 422) return false
      throw error
    }
  }

  function unlock() {
    bypassed.value = true
    window.location.replace('/')
  }

  return {
    enabled: config.public.maintenanceMode.enabled,
    bypassed,
    verifyPin,
    unlock,
  }
}
