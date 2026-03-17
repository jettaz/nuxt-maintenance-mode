import { randomBytes } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { defineNuxtModule, addServerHandler, extendPages, createResolver, hasNuxtModule } from '@nuxt/kit'
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
  placeholder: string
  allowedIPs: string[]
  excludeRoutes: string[]
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
    placeholder: 'PIN code',
    allowedIPs: [],
    excludeRoutes: [],
  },
  setup(options, nuxt) {
    const resolver = createResolver(import.meta.url)
    const secret = options.secret || randomBytes(32).toString('hex')

    nuxt.options.runtimeConfig.maintenanceMode = defu(
      nuxt.options.runtimeConfig.maintenanceMode as Record<string, unknown>,
      { secret, pin: options.pin }
    )

    nuxt.options.runtimeConfig.public.maintenanceMode = defu(
      nuxt.options.runtimeConfig.public.maintenanceMode as Record<string, unknown>,
      {
        enabled: options.enabled,
        route: options.route,
        title: options.title,
        message: options.message,
        buttonText: options.buttonText,
        errorMessage: options.errorMessage,
        placeholder: options.placeholder,
        allowedIPs: options.allowedIPs,
        excludeRoutes: options.excludeRoutes,
      }
    )

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
      nuxt.hook('tailwindcss:config', (config) => {
        const content = Array.isArray(config.content) ? config.content : []
        content.push(resolver.resolve('./runtime/pages/maintenance.tailwind.vue'))
        config.content = content
      })
    }

    const routeSegment = options.route.replace(/^\//, '')
    const userPageFile = join(nuxt.options.rootDir, 'app/pages', `${routeSegment}.vue`)
    const pageFile = existsSync(userPageFile) ? userPageFile : defaultPageFile

    extendPages((pages) => {
      pages.push({
        name: 'maintenance-mode',
        path: options.route,
        file: pageFile,
      })
    })
  },
})
