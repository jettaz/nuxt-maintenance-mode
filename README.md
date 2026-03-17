# nuxt-maintenance-mode

Nuxt module for maintenance mode with PIN verification. Put your site in maintenance mode and let authorized users bypass it with a PIN code.

## Features

- Redirects all visitors to a `/maintenance` page when enabled
- PIN-based bypass with HMAC-SHA256 signed cookie
- `httpOnly` + `sameSite=strict` cookie (XSS-safe)
- Rate limiting: max 5 PIN attempts per minute per IP
- Allowlist specific IP addresses to always pass through
- Exclude specific routes from maintenance mode
- Fully customizable text (title, message, button, placeholder, error)
- Works with environment variables

## Installation

```bash
npm install nuxt-maintenance-mode
```

Add the module to `nuxt.config.ts`:

```ts
export default defineNuxtConfig({
  modules: ['nuxt-maintenance-mode'],

  maintenanceMode: {
    enabled: true,
    pin: '1234',
  },
})
```

## Configuration

| Option | Type | Default | Description |
|---|---|---|---|
| `enabled` | `boolean` | `false` | Enable maintenance mode |
| `pin` | `string` | `''` | PIN code required to bypass |
| `secret` | `string` | auto-generated | HMAC secret for cookie signing (set in env for persistence across restarts) |
| `route` | `string` | `'/maintenance'` | Path of the maintenance page |
| `title` | `string` | `'Under Maintenance'` | Page heading |
| `message` | `string` | `'Enter the PIN code to gain access.'` | Subheading text |
| `buttonText` | `string` | `'Access'` | Submit button label |
| `errorMessage` | `string` | `'Incorrect PIN code.'` | Error shown on wrong PIN |
| `placeholder` | `string` | `'PIN code'` | Input placeholder |
| `allowedIPs` | `string[]` | `[]` | IPs that always bypass maintenance mode |
| `excludeRoutes` | `string[]` | `[]` | Routes that are never redirected |

## Environment variables

You can override options via environment variables (recommended for production):

```bash
NUXT_PUBLIC_MAINTENANCE_MODE_ENABLED=true
NUXT_MAINTENANCE_MODE_PIN=secret-pin
NUXT_MAINTENANCE_MODE_SECRET=your-hmac-secret
```

Setting a persistent `NUXT_MAINTENANCE_MODE_SECRET` ensures bypass cookies remain valid across server restarts.

## Example: allow office IP, exclude health check

```ts
maintenanceMode: {
  enabled: true,
  pin: '9999',
  allowedIPs: ['203.0.113.42'],
  excludeRoutes: ['/api/health'],
},
```

## How it works

```
Visitor → Server Middleware → check cookie token
                           ↓ no / invalid token
                   Redirect → /maintenance
                           ↓ user enters PIN
                   POST /api/_maintenance/verify
                           ↓ PIN correct
                   HMAC-SHA256 token → httpOnly cookie
                           ↓ cookie valid
                   Access to normal site
```

## License

MIT
