import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineNuxtModule, addServerHandler, addPlugin, addRouteMiddleware, addImports, extendPages, createResolver, hasNuxtModule } from '@nuxt/kit'
import { defu } from 'defu'

export interface ModuleOptions {
  enabled: boolean
  pin: string
  secret: string
  route: string
  title: string
  message: string
  buttonText: string
  errorMessage: string
  tooManyAttemptsMessage: string
  placeholder: string
  allowedIPs: string[]
  excludeRoutes: string[]
  /** Read the client IP from `X-Forwarded-For`. Only enable behind a proxy that overwrites this header. */
  trustProxy: boolean
  /** Header with the real client IP set by your proxy, e.g. `cf-connecting-ip` or `x-nf-client-connection-ip`. */
  ipHeader: string
}

declare module 'nuxt/schema' {
  interface RuntimeConfig {
    maintenanceMode: Pick<ModuleOptions, 'secret' | 'pin' | 'trustProxy' | 'ipHeader'>
  }
  interface PublicRuntimeConfig {
    maintenanceMode: Pick<ModuleOptions, 'enabled' | 'route' | 'title' | 'message' | 'buttonText' | 'errorMessage' | 'tooManyAttemptsMessage' | 'placeholder' | 'allowedIPs' | 'excludeRoutes'>
  }
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'nuxt-maintenance-mode',
    configKey: 'maintenanceMode',
    compatibility: { nuxt: '>=4.0.0' },
  },
  defaults: {
    enabled: true,
    pin: '',
    secret: '',
    route: '/maintenance',
    title: 'Under Maintenance',
    message: 'Enter the PIN code to gain access.',
    buttonText: 'Access',
    errorMessage: 'Incorrect PIN code.',
    tooManyAttemptsMessage: 'Too many attempts. Try again in a minute.',
    placeholder: 'PIN code',
    allowedIPs: [],
    excludeRoutes: [],
    trustProxy: false,
    ipHeader: '',
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const secret = options.secret || createHash('sha256').update(`maintenance:${options.pin}`).digest('hex')

    nuxt.options.runtimeConfig.maintenanceMode = defu(
      nuxt.options.runtimeConfig.maintenanceMode,
      { secret, pin: options.pin, trustProxy: options.trustProxy, ipHeader: options.ipHeader }
    )

    nuxt.options.runtimeConfig.public.maintenanceMode = defu(
      nuxt.options.runtimeConfig.public.maintenanceMode,
      {
        enabled: options.enabled,
        route: options.route,
        title: options.title,
        message: options.message,
        buttonText: options.buttonText,
        errorMessage: options.errorMessage,
        tooManyAttemptsMessage: options.tooManyAttemptsMessage,
        placeholder: options.placeholder,
        allowedIPs: options.allowedIPs,
        excludeRoutes: options.excludeRoutes,
      }
    )

    addPlugin({ src: resolver.resolve('./runtime/plugins/maintenance.server'), mode: 'server' })

    nuxt.hook('nitro:config', (nitroConfig) => {
      nitroConfig.plugins = nitroConfig.plugins || []
      nitroConfig.plugins.push(resolver.resolve('./runtime/server/plugins/maintenance-html'))
    })

    addRouteMiddleware({
      name: 'maintenance',
      path: resolver.resolve('./runtime/middleware/maintenance'),
      global: true,
    })

    addImports({
      name: 'useMaintenanceMode',
      as: 'useMaintenanceMode',
      from: resolver.resolve('./runtime/composables/useMaintenanceMode'),
    })

    addServerHandler({
      middleware: true,
      handler: resolver.resolve('./runtime/server/middleware/maintenance'),
    })

    addServerHandler({
      route: '/api/_maintenance/verify',
      method: 'post',
      handler: resolver.resolve('./runtime/server/api/maintenance/verify.post'),
    })

    let hasTailwind = hasNuxtModule('@tailwindcss/nuxt') || hasNuxtModule('@nuxtjs/tailwindcss')
    if (!hasTailwind) {
      try {
        const pkgPath = join(nuxt.options.rootDir, 'package.json')
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
        const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }
        hasTailwind = '@tailwindcss/vite' in allDeps || 'tailwindcss' in allDeps
      } catch {}
    }
    const defaultPageFile = hasTailwind
      ? resolver.resolve('./runtime/pages/maintenance.tailwind.vue')
      : resolver.resolve('./runtime/pages/maintenance.vue')

    if (hasNuxtModule('@nuxtjs/tailwindcss')) {
      // Hook comes from @nuxtjs/tailwindcss and is only typed when that is installed
      nuxt.hook('tailwindcss:config' as 'ready', ((config: { content?: unknown }) => {
        const content = Array.isArray(config.content) ? config.content : []
        content.push(resolver.resolve('./runtime/pages/maintenance.tailwind.vue'))
        config.content = content
      }) as () => void)
    }

    // An app page on the same path (e.g. app/pages/maintenance.vue) is already registered by Nuxt.
    extendPages((pages) => {
      if (pages.some(page => page.path === options.route)) return
      pages.push({
        name: 'maintenance-mode',
        path: options.route,
        file: defaultPageFile,
      })
    })
  },
})
