import { createHmac, timingSafeEqual } from 'node:crypto'
import { parseCookies, setCookie } from 'h3'
import { defineNuxtPlugin, useRequestEvent, useRuntimeConfig, useState, useHead } from '#imports'

export default defineNuxtPlugin({
  name: 'maintenance-mode-server',
  server: true,
  setup() {
    const event = useRequestEvent()
    const config = useRuntimeConfig()
    const mm = config.maintenanceMode as { secret: string }
    const mmPublic = config.public.maintenanceMode as { enabled: boolean, route: string, excludeRoutes: string[] }

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

    if (mmPublic.enabled && !isValid) {
      const route = JSON.stringify(mmPublic.route)
      const excluded = JSON.stringify(mmPublic.excludeRoutes || [])
      useHead({
        script: [{
          children: `(function(){var r=${route},x=${excluded},p=location.pathname;if(p===r||x.some(function(e){return p===e||p.startsWith(e)}))return;var h=document.cookie.split(';');if(!h.some(function(c){return c.trim().indexOf('maintenance_bypass_hint=')===0}))location.replace(r);})();`,
          tagPriority: 'critical',
        }],
      })
    }
  },
})
