<script setup lang="ts">
definePageMeta({ layout: false })

const config = useRuntimeConfig()
const mm = config.public.maintenanceMode as Record<string, string>
const title = mm.title
const message = mm.message
const buttonText = mm.buttonText
const errorMessage = mm.errorMessage
const placeholder = mm.placeholder

const pin = ref('')
const error = ref(false)
const loading = ref(false)

async function submit() {
  error.value = false
  loading.value = true
  try {
    await $fetch('/api/_maintenance/verify', {
      method: 'POST',
      body: { pin: pin.value },
    })
    window.location.href = '/'
  } catch {
    error.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="maintenance-wrap">
    <div class="maintenance-box">
      <h1 class="maintenance-title">{{ title }}</h1>
      <p class="maintenance-message">{{ message }}</p>

      <form class="maintenance-form" @submit.prevent="submit">
        <input
          v-model="pin"
          type="password"
          inputmode="numeric"
          :placeholder="placeholder"
          :maxlength="8"
          class="maintenance-input"
          autocomplete="off"
        />

        <p v-if="error" class="maintenance-error">{{ errorMessage }}</p>

        <button type="submit" :disabled="loading" class="maintenance-button">
          {{ loading ? '...' : buttonText }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.maintenance-wrap {
  display: flex;
  min-height: 100vh;
  align-items: center;
  justify-content: center;
  background: #f5f5f4;
  padding: 1rem;
  font-family: system-ui, sans-serif;
}

.maintenance-box {
  width: 100%;
  max-width: 20rem;
  text-align: center;
}

.maintenance-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: #292524;
  margin: 0 0 0.5rem;
}

.maintenance-message {
  color: #78716c;
  margin: 0 0 2rem;
}

.maintenance-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.maintenance-input {
  width: 100%;
  border: 1px solid #d6d3d1;
  border-radius: 0.5rem;
  padding: 0.75rem 1rem;
  font-size: 1.125rem;
  text-align: center;
  letter-spacing: 0.25em;
  outline: none;
  box-sizing: border-box;
}

.maintenance-input:focus {
  border-color: #78716c;
  box-shadow: 0 0 0 1px #78716c;
}

.maintenance-error {
  color: #dc2626;
  font-size: 0.875rem;
  margin: 0;
}

.maintenance-button {
  width: 100%;
  padding: 0.75rem 1rem;
  background: #292524;
  color: #fff;
  border: none;
  border-radius: 0.5rem;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.maintenance-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.maintenance-button:not(:disabled):hover {
  background: #44403c;
}
</style>
