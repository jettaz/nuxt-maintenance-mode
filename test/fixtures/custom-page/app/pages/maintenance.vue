<script setup lang="ts">
definePageMeta({ layout: false })

const { verifyPin, unlock } = useMaintenanceMode()
const { title } = useRuntimeConfig().public.maintenanceMode
const pin = ref('')
const wrong = ref(false)

async function submit() {
  wrong.value = false
  if (await verifyPin(pin.value)) return unlock()
  wrong.value = true
}
</script>

<template>
  <form data-custom-page @submit.prevent="submit">
    <h1>{{ title }}</h1>
    <input v-model="pin" type="password">
    <p v-if="wrong">Wrong PIN</p>
  </form>
</template>
