<template>
  <div
    class="max-w-sm m-auto bg-gray-50 shadow p-6 text-gray-800 rounded-lg text-base mt-8"
  >
    <p class="font-bold text-2xl mb-4">Settings</p>

    <div v-if="!keyTimeout">Loading...</div>

    <div
      v-if="keyTimeout"
      class="border-l-2 pl-2 transition-colors"
      :class="{
        'border-purple-600': isChanged,
        'border-gray-300': !isChanged,
      }"
    >
      Keys expires after
      <input
        class="w-12 text-center rounded mx-1 transition focus:outline-purple-600"
        :class="
          isChanged
            ? 'text-purple-600 font-semibold outline outline-2 outline-purple-400'
            : 'bg-white'
        "
        v-model="minutes"
        @change="handleKeyExpireChange"
        type="number"
        min="0"
      />
      minutes
    </div>

    <div class="flex justify-end mt-8 gap-4">
      <p
        class="text-purple-600 font-medium mt-2 transition-opacity pointer-events-none"
        :class="{
          'opacity-0': !showSuccessMessage,
          'opacity-100': showSuccessMessage,
        }"
      >
        {{ successMessage }}
      </p>
      <button
        @click="saveSettings"
        class="px-3 py-2 transition font-medium rounded"
        :class="{
          'bg-purple-100 text-purple-600 hover:text-purple-800 focus-visible:outline-purple-600':
            isChanged,
          'bg-gray-200 text-gray-500 cursor-default':
            !isChanged,
        }"
        v-if="keyTimeout"
        :disabled="!isChanged"
      >
        Save
      </button>
    </div>
  </div>
</template>

<script lang="ts" setup>
const DEFAULT_KEYTIMEOUT = 120000 // 2min

const keyTimeout = ref<number | null>(null)
const successMessage = ref('Saved!')
const showSuccessMessage = ref(false)
const minutes = ref(2)

const isChanged = computed(() => {
  return keyTimeout.value !== minutes.value * 60000
})

onMounted(async () => {
  const data = await chrome.storage.sync.get('option-key-timeout')
  keyTimeout.value = data['option-key-timeout']
  // console.log('Key Timeout', keyTimeout.value)
  if (!keyTimeout.value) {
    await chrome.storage.sync.set({ 'option-key-timeout': DEFAULT_KEYTIMEOUT })
    // console.log('Set default time out')
    keyTimeout.value = DEFAULT_KEYTIMEOUT
  }
  minutes.value = keyTimeout.value / 60000 // ms
})

function handleKeyExpireChange() {
  if (!minutes.value) {
    minutes.value = 0
  }
  // console.log('minutes', minutes.value)
  // storeKeyTimeout(minutes.value * 60000)
}

async function storeKeyTimeout(ms: number) {
  await chrome.storage.sync.set({ 'option-key-timeout': ms })
  keyTimeout.value = ms
}

let successTimeout: number | null = null

async function saveSettings() {
  await storeKeyTimeout(minutes.value * 60000)
  showSuccessMessage.value = true
  if (successTimeout) {
    window.clearTimeout(successTimeout)
  }
  successTimeout = window.setTimeout(() => {
    showSuccessMessage.value = false
  }, 2000)
}
</script>
