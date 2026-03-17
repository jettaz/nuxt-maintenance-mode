export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  modules: ['../src/module'],

  maintenanceMode: {
    enabled: true,
    pin: '1234',
    title: 'Under Maintenance',
    message: 'Enter the PIN code to gain access.',
  },
})
