import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMaintenanceMode } from '../src/runtime/composables/useMaintenanceMode'

vi.mock('#imports', () => ({
  useRuntimeConfig: () => ({ public: { maintenanceMode: { enabled: true } } }),
  useState: () => ({ value: false }),
}))

const $fetch = vi.fn()
vi.stubGlobal('$fetch', $fetch)

describe('useMaintenanceMode().verifyPin', () => {
  beforeEach(() => { $fetch.mockReset() })

  it('posts the PIN and returns true when it is correct', async () => {
    $fetch.mockResolvedValue({ ok: true })
    expect(await useMaintenanceMode().verifyPin('123456')).toBe(true)
    expect($fetch).toHaveBeenCalledWith('/api/_maintenance/verify', { method: 'POST', body: { pin: '123456' } })
  })

  it('returns false for a wrong PIN (422)', async () => {
    $fetch.mockRejectedValue(Object.assign(new Error('Invalid PIN'), { statusCode: 422 }))
    expect(await useMaintenanceMode().verifyPin('000000')).toBe(false)
  })

  it('throws on too many attempts (429)', async () => {
    $fetch.mockRejectedValue(Object.assign(new Error('Too many attempts'), { statusCode: 429 }))
    await expect(useMaintenanceMode().verifyPin('000000')).rejects.toMatchObject({ statusCode: 429 })
  })
})
