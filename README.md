# @jettaz/nuxt-maintenance-mode

[![npm version](https://img.shields.io/npm/v/@jettaz/nuxt-maintenance-mode)](https://www.npmjs.com/package/@jettaz/nuxt-maintenance-mode)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Nuxt module that puts your site in maintenance mode. Visitors see a maintenance page; authorized users bypass it with a PIN code.

## Features

- Redirects all visitors to a maintenance page when enabled
- PIN-based bypass — correct PIN sets a signed cookie, no login needed on next visit
- HMAC-SHA256 signed cookie (`httpOnly` + `sameSite=strict`)
- Rate limiting: max 5 PIN attempts per minute per IP
- IP allowlist — let specific IPs through without a PIN
- Exclude routes from maintenance mode (e.g. health checks, webhooks)
- Works independently of project auth middlewares — no redirect loops after PIN entry
- `useMaintenanceMode()` composable available as auto-import
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
| `placeholder` | `string` | `'PIN code'` | Input placeholder |
| `allowedIPs` | `string[]` | `[]` | IPs that always bypass maintenance mode |
| `excludeRoutes` | `string[]` | `[]` | Routes that are never redirected |

## Environment variables

Recommended for production — keeps sensitive values out of your config file:

```bash
NUXT_PUBLIC_MAINTENANCE_MODE_ENABLED=true
NUXT_MAINTENANCE_MODE_PIN=your-pin
NUXT_MAINTENANCE_MODE_SECRET=your-hmac-secret
```

Set a persistent `NUXT_MAINTENANCE_MODE_SECRET` so bypass cookies remain valid when your server restarts. If you omit it, a new secret is generated on every start and existing cookies are invalidated.

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
const { enabled, bypassed } = useMaintenanceMode()
```

| Property | Type | Description |
|----------|------|-------------|
| `enabled` | `boolean` | Whether maintenance mode is active |
| `bypassed` | `Ref<boolean>` | Whether the current user has bypassed maintenance |

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
