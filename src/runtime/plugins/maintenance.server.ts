import { createHmac } from 'node:crypto'
import { parseCookies } from 'h3'

export default defineNuxtPlugin({
  name: 'maintenance-mode-server',
  server: true,
  setup() {
    const event = useRequestEvent()
    const config = useRuntimeConfig()
    const mm = config.maintenanceMode as { secret: string }

    if (!event || !mm?.secret) {
      useState('maintenance-bypassed', () => false)
      return
    }

    const cookies = parseCookies(event)
    const token = cookies.maintenance_bypass
    const expected = createHmac('sha256', mm.secret).update('maintenance_bypass').digest('hex')
    useState('maintenance-bypassed', () => token === expected)
  },
})
