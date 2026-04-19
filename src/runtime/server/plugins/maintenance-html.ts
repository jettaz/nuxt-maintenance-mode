import { defineNitroPlugin, useRuntimeConfig } from '#imports'

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    const config = useRuntimeConfig()
    const mm = config.public.maintenanceMode as { enabled: boolean, route: string, excludeRoutes: string[] }
    if (!mm.enabled) return
    const safeJson = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029')
    const route = safeJson(mm.route)
    const excluded = safeJson(mm.excludeRoutes || [])
    const script = `<script>(function(){var r=${route},x=${excluded},p=location.pathname;if(p===r||x.some(function(e){return p===e||p.startsWith(e)}))return;var h=document.cookie.split(';');if(!h.some(function(c){return c.trim().indexOf('maintenance_bypass_hint=')===0}))location.replace(r);})();</script>`
    html.head.unshift(script)
  })
})
