<script setup lang="ts">
import { decryptData, isLockedURL } from '../api/lib'

const locationNoHash = computed(() => {
  return (
    window.location.protocol +
    '//' +
    window.location.host +
    window.location.pathname
  )
})

const linkText = window.location.href

const password = ref('')
const error = ref('')

const elmInputPassword = ref<HTMLElement | null>(null)

const toUnlock = computed(() => {
  return isLockedURL(linkText)
})

const unlocking = ref(false)

const viewPasswords = ref(false)

async function handleUnlock() {
  const hash = linkText.split('#')[1]
  unlocking.value = true
  decryptData(hash, password.value)
    .then((output) => {
      unlocking.value = false
      error.value = ''
      chrome.tabs.update({ url: output.url })
    })
    .catch((e) => {
      console.log(e)
      unlocking.value = false
      error.value = "Can't unlock. Please try again."
    })
}

onMounted(() => {
  if (elmInputPassword.value) {
    elmInputPassword.value.focus()
  }
})
</script>

<template>
  <div class="w-full flex justify-start items-center p-3 font-bold">
    <img
      class="h-10 py-1 mr-2"
      alt="Easy Private Bookmark logo"
      src="../assets/logo.png"
    />
    <div class="title text-lg">Easy Private Bookmark</div>

    <a
      v-if="toUnlock"
      :href="locationNoHash"
      class="ml-4 flex items-center text-base gap-1 group hover:text-purple-800 text-purple-600 hover:bg-purple-100 p-2 rounded-md transition-colors"
      target="_blank"
    >
      <icon-material-symbols-settings
        class="w-5 h-5 group-hover:rotate-[120deg] transition-transform"
      />
      Settings
    </a>
  </div>

  <div
    v-if="toUnlock"
    class="flex flex-col w-1/3 min-w-[300px] max-w-sm m-auto justify-center gap-3"
  >
    <div class="flex gap-2">
      <div class="relative">
        <input
          v-model="password"
          ref="elmInputPassword"
          :type="viewPasswords ? 'text' : 'password'"
          class="w-full py-2 px-3 text-base bg-gray-100 text-purple-600 font-normal focus:outline-purple-500 focus:bg-gray-50 rounded"
          :class="{ error: error }"
          placeholder="Password"
          @keydown.enter="handleUnlock"
        />
        <button
          v-if="password.length > 0"
          class="absolute right-2 top-[0.3rem] p-1.5 text-base cursor-pointer focus-visible:outline-purple-600 text-purple-600"
          @click="
            () => {
              elmInputPassword?.focus()
              viewPasswords = !viewPasswords
            }
          "
        >
          <icon-material-symbols-visibility-off v-if="viewPasswords" />
          <icon-material-symbols-visibility v-if="!viewPasswords" />
        </button>
      </div>
      <button
        @click="handleUnlock"
        class="py-2 px-3 font-medium bg-purple-100 rounded text-purple-600 hover:text-purple-800 text-base focus-visible:outline-purple-600"
      >
        Unlock
      </button>
    </div>
    <p
      class="text-orange-600 transition-opacity"
      :class="{
        'opacity-0': !error,
        'opacity-100': error,
      }"
    >
      {{ error }}
    </p>
  </div>

  <div v-if="!toUnlock">
    <page-settings></page-settings>
  </div>
</template>
