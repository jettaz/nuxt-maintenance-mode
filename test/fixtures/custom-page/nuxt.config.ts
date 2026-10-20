export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: ['../../../src/module'],

  maintenanceMode: {
    pin: '123456',
    allowedIPs: ['203.0.113.7'],
    ipHeader: 'x-test-client-ip',
  },
})
