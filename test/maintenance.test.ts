import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils/e2e'

describe('maintenance mode', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('../playground', import.meta.url)),
  })

  function getSetCookieValues(response: Response): string[] {
    const headersWithGetSetCookie = response.headers as Headers & { getSetCookie?: () => string[] }
    if (typeof headersWithGetSetCookie.getSetCookie === 'function') {
      return headersWithGetSetCookie.getSetCookie()
    }

    const combined = response.headers.get('set-cookie')
    return combined ? combined.split(/,(?=\s*[^;]+=[^;]+)/g).map(v => v.trim()) : []
  }

  function toCookieHeader(setCookies: string[]): string {
    return setCookies
      .map((cookie) => cookie.split(';')[0])
      .filter(Boolean)
      .join('; ')
  }

  async function verifyByPin(): Promise<string[]> {
    const response = await fetch('/api/_maintenance/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ pin: '1234' }),
      redirect: 'manual',
    })
    expect(response.status).toBe(200)
    return getSetCookieValues(response)
  }

  function navigationHeaders(cookie?: string): HeadersInit {
    const headers: HeadersInit = {
      accept: 'text/html',
      'sec-fetch-mode': 'navigate',
    }
    if (cookie) {
      headers.cookie = cookie
    }
    return headers
  }

  it('redirects navigation requests to maintenance route without bypass', async () => {
    const response = await fetch('/', {
      redirect: 'manual',
      headers: navigationHeaders(),
    })
    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('/maintenance')
  })

  it('allows navigation to home with valid bypass cookie', async () => {
    const setCookies = await verifyByPin()
    const cookieHeader = toCookieHeader(setCookies)
    const response = await fetch('/', {
      redirect: 'manual',
      headers: navigationHeaders(cookieHeader),
    })
    expect(response.status).toBe(200)
  })

  it('sets bypass and hint cookies with SameSite=Lax after successful PIN', async () => {
    const setCookies = await verifyByPin()
    const bypassCookie = setCookies.find(v => v.startsWith('maintenance_bypass='))
    const hintCookie = setCookies.find(v => v.startsWith('maintenance_bypass_hint='))

    expect(bypassCookie).toBeTruthy()
    expect(hintCookie).toBeTruthy()
    expect(bypassCookie).toContain('HttpOnly')
    expect(bypassCookie).toContain('SameSite=Lax')
    expect(hintCookie).toContain('SameSite=Lax')
  })

  it('returns 503 (not 302) for non-navigation JSON requests without bypass', async () => {
    const response = await fetch('/api/example', {
      redirect: 'manual',
      headers: { accept: 'application/json' },
    })

    expect(response.status).toBe(503)
    expect(response.headers.get('location')).toBeNull()
    expect(response.headers.get('retry-after')).toBe('60')
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('does not redirect /_i18n requests without bypass', async () => {
    const response = await fetch('/_i18n/x/nl/messages.json', {
      redirect: 'manual',
      headers: { accept: 'application/json' },
    })

    expect(response.status).not.toBe(302)
    expect(response.headers.get('location')).toBeNull()
  })

  it('keeps /maintenance reachable and clears stale hint cookie when bypass is invalid', async () => {
    const response = await fetch('/maintenance', {
      redirect: 'manual',
      headers: navigationHeaders('maintenance_bypass_hint=1'),
    })

    expect(response.status).toBe(200)

    const setCookies = getSetCookieValues(response).join('\n')
    expect(setCookies).toContain('maintenance_bypass_hint=;')
  })

  it('injects inline redirect script into HTML for prerendered pages', async () => {
    const response = await fetch('/maintenance', {
      redirect: 'manual',
      headers: navigationHeaders(),
    })
    expect(response.status).toBe(200)
    const html = await response.text()
    expect(html).toContain('location.replace')
    expect(html).toContain('maintenance_bypass_hint')
  })

  it('ignores a spoofed X-Forwarded-For for allowedIPs without trustProxy', async () => {
    const response = await fetch('/', {
      redirect: 'manual',
      headers: { ...navigationHeaders(), 'x-forwarded-for': '203.0.113.42' },
    })
    expect(response.status).toBe(302)
  })

  // Keep last: locks this client out of the verify route for a minute.
  it('rate limits wrong PINs even with a different X-Forwarded-For per attempt', async () => {
    const attempt = (i: number) => fetch('/api/_maintenance/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': `198.51.100.${i}` },
      body: JSON.stringify({ pin: '0000' }),
    })
    for (let i = 0; i < 5; i++) {
      expect((await attempt(i)).status).toBe(422)
    }
    expect((await attempt(99)).status).toBe(429)
  })
})
