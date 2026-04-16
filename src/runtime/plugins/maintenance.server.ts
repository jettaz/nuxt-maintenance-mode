import { createHmac, timingSafeEqual } from 'node:crypto'
import { parseCookies, setCookie } from 'h3'
import { defineNuxtPlugin, useRequestEvent, useRuntimeConfig, useState } from '#imports'

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
    const encoder = new TextEncoder()
    const tokenBytes = encoder.encode(token ?? '')
    const expectedBytes = encoder.encode(expected)
    const isValid = !!token && tokenBytes.length === expectedBytes.length && timingSafeEqual(tokenBytes, expectedBytes)

    useState('maintenance-bypassed', () => isValid)

    if (isValid && !cookies.maintenance_bypass_hint) {
      setCookie(event, 'maintenance_bypass_hint', '1', {
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      })
    }
  },
})
