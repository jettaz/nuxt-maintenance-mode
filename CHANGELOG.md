# Changelog

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
