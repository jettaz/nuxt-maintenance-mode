<script setup lang="ts">
definePageMeta({ layout: false })

const config = useRuntimeConfig()
const mm = config.public.maintenanceMode as Record<string, unknown>

if (!mm.enabled) {
  await navigateTo('/', { replace: true })
}

const title = mm.title as string
const message = mm.message as string
const buttonText = mm.buttonText as string
const errorMessage = mm.errorMessage as string
const tooManyAttemptsMessage = mm.tooManyAttemptsMessage as string
const placeholder = mm.placeholder as string

const { bypassed, verifyPin, unlock } = useMaintenanceMode()
const bypassHint = useCookie('maintenance_bypass_hint')

onMounted(async () => {
  if (bypassed.value || !!bypassHint.value) {
    await navigateTo('/', { replace: true })
  }
})

const pin = ref('')
const error = ref('')
const loading = ref(false)

async function submit() {
  error.value = ''
  loading.value = true
  try {
    if (await verifyPin(pin.value)) return unlock()
    error.value = errorMessage
  } catch (e) {
    error.value = (e as { statusCode?: number }).statusCode === 429 ? tooManyAttemptsMessage : errorMessage
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-stone-100 p-4">
    <div class="w-full max-w-xs text-center">
      <h1 class="text-2xl font-bold text-stone-900 mb-2">{{ title }}</h1>
      <p class="text-stone-500 mb-8">{{ message }}</p>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          :placeholder="placeholder"
          :maxlength="8"
          id="pin"
          name="pin"
          class="w-full border border-stone-300 rounded-lg px-4 py-3 text-lg text-center tracking-widest outline-none focus:border-stone-500 focus:ring-1 focus:ring-stone-500"
          autocomplete="off"
        />

        <p v-if="error" class="text-red-600 text-sm">{{ error }}</p>

        <button
          type="submit"
          :disabled="loading"
          class="w-full py-3 px-4 bg-stone-900 text-white rounded-lg font-semibold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-stone-700"
        >
          {{ loading ? '...' : buttonText }}
        </button>
      </form>
    </div>
  </div>
</template>
