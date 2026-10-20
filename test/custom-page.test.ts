import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { setup, fetch } from '@nuxt/test-utils/e2e'

describe('app with its own maintenance page', async () => {
  await setup({
    rootDir: fileURLToPath(new URL('./fixtures/custom-page', import.meta.url)),
  })

  const navigation = { accept: 'text/html', 'sec-fetch-mode': 'navigate' }

  it('serves the app page instead of the built-in one', async () => {
    const html = await (await fetch('/maintenance', { headers: navigation })).text()
    expect(html).toContain('data-custom-page')
    expect(html).not.toContain('maintenance-wrap')
  })

  it('trusts the configured ipHeader for allowedIPs', async () => {
    const allowed = await fetch('/', { redirect: 'manual', headers: { ...navigation, 'x-test-client-ip': '203.0.113.7' } })
    expect(allowed.status).toBe(200)

    const spoofed = await fetch('/', { redirect: 'manual', headers: { ...navigation, 'x-forwarded-for': '203.0.113.7' } })
    expect(spoofed.status).toBe(302)
  })
})
