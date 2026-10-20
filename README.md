# @jettaz/nuxt-maintenance-mode

[![npm version](https://img.shields.io/npm/v/@jettaz/nuxt-maintenance-mode)](https://www.npmjs.com/package/@jettaz/nuxt-maintenance-mode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Nuxt module that puts your site in maintenance mode. Visitors see a maintenance page; authorized users bypass it with a PIN code.

## Features

- Redirects all visitors to a maintenance page when enabled
- PIN-based bypass — correct PIN sets a signed cookie, no login needed on next visit
- HMAC-SHA256 signed cookies (`maintenance_bypass` and `maintenance_bypass_hint`, both `sameSite=lax`)
- Rate limiting: max 5 PIN attempts per minute per IP
- IP allowlist — let specific IPs through without a PIN (proxy headers only when you opt in)
- Exclude routes from maintenance mode (e.g. health checks, webhooks)
- Non-page requests (JSON/fetch/assets) get a `503` JSON response instead of an HTML redirect
- Built-in public route exclusions for i18n/image/sitemap/manifest/favicon endpoints
- Works independently of project auth middlewares — no redirect loops after PIN entry
- `useMaintenanceMode()` composable with `verifyPin()` and `unlock()` for your own page
- Typed module options and runtime config
- Customizable text (title, message, button, placeholder, error)
- Auto-detects Tailwind CSS and uses utility classes when available
- All options overridable via environment variables

## Installation

```bash
npm install @jettaz/nuxt-maintenance-mode
```

The setup wizard starts automatically. It updates `nuxt.config.ts` and creates a `.env` with a PIN and HMAC secret.

To run the wizard manually at any time:

```bash
npx maintenance-setup
```

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` | Enable maintenance mode |
| `pin` | `string` | `''` | PIN code required to bypass |
| `secret` | `string` | auto-generated | HMAC secret for cookie signing — set this in your env to keep cookies valid across restarts |
| `route` | `string` | `'/maintenance'` | Path of the maintenance page |
| `title` | `string` | `'Under Maintenance'` | Page heading |
| `message` | `string` | `'Enter the PIN code to gain access.'` | Subheading text |
| `buttonText` | `string` | `'Access'` | Submit button label |
| `errorMessage` | `string` | `'Incorrect PIN code.'` | Error shown on wrong PIN |
| `tooManyAttemptsMessage` | `string` | `'Too many attempts. Try again in a minute.'` | Error shown when rate limited (429) |
| `placeholder` | `string` | `'PIN code'` | Input placeholder |
| `allowedIPs` | `string[]` | `[]` | IPs that always bypass maintenance mode |
| `excludeRoutes` | `string[]` | `[]` | Routes that are never redirected |
| `trustProxy` | `boolean` | `false` | Read the client IP from `X-Forwarded-For` |
| `ipHeader` | `string` | `''` | Read the client IP from this header, e.g. `'cf-connecting-ip'` (Cloudflare) or `'x-nf-client-connection-ip'` (Netlify) |

### Client IP behind a proxy

The client IP is used for `allowedIPs` and for the PIN rate limit. By default the module only uses the socket address, because any visitor can send an `X-Forwarded-For` header.

Behind a proxy or CDN the socket address is the proxy's, so:

- `allowedIPs` will not match anyone, and
- the rate limit counts all visitors together (stricter, not less safe).

Set `ipHeader` to the header your host sets and visitors cannot forge, or `trustProxy: true` when your proxy overwrites `X-Forwarded-For`. Don't enable either without a proxy in front of the app.

### Rate limit

Max 5 wrong PINs per minute per IP. The counter lives in memory per server instance, so on serverless hosts (Netlify Functions, Vercel, Lambda) every instance counts separately. Use a PIN of at least 6 characters; the setup wizard enforces this.

### Bypass cookies

After a correct PIN, the module sets:

- `maintenance_bypass`: signed access cookie (`httpOnly`, `sameSite=lax`, 7 days)
- `maintenance_bypass_hint`: client hint cookie (`sameSite=lax`, 7 days)

If a stale hint exists without a valid bypass cookie, the hint cookie is automatically cleared on the next server render.

### Built-in public exclusions

These routes are always excluded from maintenance redirects before your custom `excludeRoutes`:

- `/_i18n`
- `/_ipx`
- `/__sitemap__`
- `/robots.txt`
- `/manifest.json`
- `/favicon.ico`

## Environment variables

Recommended for production — keeps sensitive values out of your config file:

```bash
NUXT_PUBLIC_MAINTENANCE_MODE_ENABLED=true
NUXT_MAINTENANCE_MODE_PIN=your-pin
NUXT_MAINTENANCE_MODE_SECRET=your-hmac-secret
```

Set a persistent `NUXT_MAINTENANCE_MODE_SECRET` so bypass cookies remain valid when your server restarts. If you omit it, a new secret is generated on every start and existing cookies are invalidated.

## Custom maintenance page

Create `app/pages/maintenance.vue` (or the file matching your `route`) and it replaces the built-in page. Use `verifyPin()` and `unlock()` so you don't need to know the API route:

```vue
<script setup lang="ts">
definePageMeta({ layout: false })

const { verifyPin, unlock } = useMaintenanceMode()
const { title, errorMessage, tooManyAttemptsMessage } = useRuntimeConfig().public.maintenanceMode
const pin = ref('')
const error = ref('')

async function submit() {
  error.value = ''
  try {
    if (await verifyPin(pin.value)) return unlock()
    error.value = errorMessage
  } catch (e) {
    error.value = (e as { statusCode?: number }).statusCode === 429 ? tooManyAttemptsMessage : errorMessage
  }
}
</script>

<template>
  <form @submit.prevent="submit">
    <h1>{{ title }}</h1>
    <input v-model="pin" type="password" autocomplete="off">
    <p v-if="error">{{ error }}</p>
    <button>Access</button>
  </form>
</template>
```

`unlock()` forces a full reload instead of client-side navigation, so translations, payloads, auth/session fetches and other startup requests are retried with the new bypass cookie.

## Examples

**Allow office IP, exclude health check:**

```ts
maintenanceMode: {
  enabled: true,
  pin: '9999',
  allowedIPs: ['203.0.113.42'],
  excludeRoutes: ['/api/health'],
},
```

**Custom text:**

```ts
maintenanceMode: {
  enabled: true,
  pin: '0000',
  title: 'We\'ll be right back',
  message: 'Scheduled maintenance in progress.',
  buttonText: 'Staff access',
  placeholder: 'Enter PIN',
  errorMessage: 'That PIN is incorrect.',
},
```

## Tailwind CSS

The module auto-detects Tailwind CSS. No configuration needed.

- **Tailwind v4** (`@tailwindcss/nuxt`): detected automatically, classes are scanned by Tailwind's file scanner
- **Tailwind v3** (`@nuxtjs/tailwindcss`): detected automatically, the maintenance page is added to Tailwind's content paths

When Tailwind is present the maintenance page uses utility classes (stone palette). When it's not, a self-contained scoped CSS version is used — no external dependencies either way.

## `useMaintenanceMode()`

Auto-imported composable for use in your own middlewares or components:

```ts
const { enabled, bypassed, verifyPin, unlock } = useMaintenanceMode()
```

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether maintenance mode is active |
| `bypassed` | `Ref<boolean>` | Whether the current user has bypassed maintenance (valid cookie or allowed IP) |
| `verifyPin` | `(pin: string) => Promise<boolean>` | `true` for a correct PIN, `false` for a wrong one; throws on `429` and other errors |
| `unlock` | `() => void` | Marks the session as bypassed and reloads to `/` |

Example — skip your auth middleware for bypassed users:

```ts
export default defineNuxtRouteMiddleware(() => {
  const { bypassed } = useMaintenanceMode()
  if (bypassed.value) return
  // ... rest of auth logic
})
```

## How it works

```
Visitor → Server middleware → valid bypass cookie?
                                      │
                   ┌──────────────────┴──────────────────┐
                   │ yes                                  │ no
                   ▼                                      ▼
           Access to site                     Redirect → /maintenance
                                                         │
                                              User enters PIN
                                                         │
                                     POST /api/_maintenance/verify
                                                         │
                                    ┌────────────────────┴──────────────────┐
                                    │ correct                               │ wrong
                                    ▼                                       ▼
                        Set httpOnly cookie (7 days)              Show error (max 5 tries/min)
                        bypassed state hydrated via SSR
                        Route middleware blocks redirect loops
                        Access to site
```

## License

[MIT](LICENSE)
