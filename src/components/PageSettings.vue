<template>
  <div
    class="max-w-sm m-auto bg-gray-50 shadow p-6 text-gray-800 rounded-lg text-base mt-8"
  >
    <div class="mb-4 flex gap-6 items-baseline">
      <p class="font-bold text-2xl">Settings</p>

      <span class="font-semibold">v{{ version }}</span>
    </div>

    <div v-if="!keyTimeout">Loading...</div>

    <div
      v-if="keyTimeout"
      class="border-l-2 pl-2 transition-colors"
      :class="{
        'border-purple-600': isChanged,
        'border-gray-300 hover:border-purple-600': !isChanged,
      }"
    >
      <div class="text-base font-medium py-1">Tempary Key & Cache</div>
      expires after
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

    <modal-password
      :opened="showMigrateModal"
      :message="'Manual Migrate'"
      :requiresConfirm="false"
      :inputPlaceholders="['Old password']"
      @panel-close="showMigrateModal = false"
      @panel-confirm="handleMigratePanelConfirm"
      :content="migrateContent"
    ></modal-password>

    <div
      class="border-l-2 pl-2 transition-colors mt-4 hover:border-purple-600 border-gray-300"
    >
      <div class="text-base font-medium py-1">Manual Migrate</div>
      For users who updated to v2.0+ and found some old links not recognized or
      can't unlock
      <button
        @click="showMigrateModal = true"
        class="px-2 py-1.5 mt-2 text-sm transition rounded bg-purple-100 text-purple-600 hover:text-purple-800 focus-visible:outline-purple-600"
      >
        Migrate
      </button>
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
          'bg-gray-200 text-gray-500 cursor-default': !isChanged,
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
import { migrateWithPassword } from '../api/keys'

const DEFAULT_KEYTIMEOUT = 120000 // 2min

const keyTimeout = ref<number | null>(null)
const successMessage = ref('Saved!')
const showSuccessMessage = ref(false)
const minutes = ref(2)

const showMigrateModal = ref(false)

const DEFAULT_MIGRATE_CONTENT =
  'We will use the above passwords to try to unlock all old links, and migrate them to use version 2.0 lock. If you have deleted your lock, a new lock will be created using the old password.'
const migrateContent = ref(DEFAULT_MIGRATE_CONTENT)

async function handleMigratePanelConfirm(password: string) {
  let stats = await migrateWithPassword(password)

  let failed = stats.countLockedURL - stats.countUnlockSuccess

  migrateContent.value = `We found ${
    stats.countLockedURL
  } old links, unlocked ${stats.countUnlockSuccess} and migrated ${
    stats.countUpdated
  } links. ${failed} links failed to migrate. ${
    failed ? 'Please try again with a different password.' : ''
  }`

  // showMigrateModal.value = false
}

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

  version.value = chrome.runtime.getManifest().version
})

const version = ref('')

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
