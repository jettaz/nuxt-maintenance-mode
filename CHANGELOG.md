# Changelog

## 1.3.0 - 2026-10-21

### Breaking (only if you use `allowedIPs`)

- The client IP no longer comes from `X-Forwarded-For` / `X-Real-IP` by default; those headers can be sent by anyone. Behind a proxy, set `ipHeader` (e.g. `'cf-connecting-ip'`, `'x-nf-client-connection-ip'`) or `trustProxy: true`, otherwise `allowedIPs` will not match.

### Added

- `trustProxy` and `ipHeader` options; one shared IP helper for the middleware and the PIN rate limit.
- `useMaintenanceMode()` now returns `verifyPin(pin)` and `unlock()`. Both built-in pages use them.
- `tooManyAttemptsMessage` option; the built-in pages show it on `429` instead of `errorMessage`.
- Typed module options (`NuxtModule<ModuleOptions>`) and `RuntimeConfig` / `PublicRuntimeConfig` augmentation; `bypassed` is `Ref<boolean>`.
- `npm run typecheck` and a CI workflow (typecheck + tests).

### Changed

- Setup wizard generates a 6-digit PIN and requires at least 6 characters.

### Fixed

- Rate limit could be bypassed by sending a different `X-Forwarded-For` per attempt.
- `allowedIPs` could be bypassed with a forged `X-Forwarded-For`.
- `allowedIPs` only passed the server middleware; the route middleware still redirected page navigations to the maintenance page. Allowed IPs now count as bypassed.
- An app page on the maintenance route (e.g. `app/pages/maintenance.vue`) is no longer registered a second time by the module. App pages outside `<rootDir>/app/pages` are now detected too.

## 1.2.0 - 2026-10-14

### Added

- Default public exclusions that always bypass maintenance redirects:
  - `/_i18n`
  - `/_ipx`
  - `/__sitemap__`
  - `/robots.txt`
  - `/manifest.json`
  - `/favicon.ico`

### Changed

- Bypass cookie `maintenance_bypass` now uses `SameSite=Lax` (was `Strict`) to prevent external-entry redirect loops (for example installed PWAs).
- Unauthorized non-navigation requests now return `503` JSON with `Retry-After: 60` instead of `302` HTML redirects.
- Maintenance pages now force a full reload after successful PIN verification using `window.location.replace('/')`.

### Fixed

- Server/client mismatch handling for stale hint cookies:
  - Server-side route checks no longer trust hint-only state.
  - Stale `maintenance_bypass_hint` cookies are cleared when no valid bypass cookie exists.
  - Prevents redirect loops when hint exists but bypass token is missing/invalid.
- Added regression tests covering cookie attributes, navigation behavior, non-navigation `503` behavior, i18n route handling, and stale-hint behavior.
