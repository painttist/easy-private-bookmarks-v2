<template>
  <teleport to="body">
    <transition name="fade">
      <modal
        :message="message"
        v-if="opened"
      >
        <div class="px-8 pb-4">
          <div class="relative">
            <input
              class="w-full text-base py-2 px-4 bg-gray-100 my-2"
              v-model="password"
              :type="viewPasswords ? 'text' : 'password'"
              :placeholder="inputPlaceholders[0]"
            />
            <button
              v-if="password.length > 0"
              class="absolute right-2 top-5 text-base cursor-pointer"
              @click="viewPasswords = !viewPasswords"
            >
              <icon-mdi-eye-off v-if="viewPasswords" />
              <icon-mdi-eye v-if="!viewPasswords" />
            </button>
          </div>
          <input
            v-if="requiresConfirm"
            v-model="confirmPassword"
            type="password"
            :placeholder="inputPlaceholders[1]"
            class="w-full transition-vertical text-base py-2 px-4 bg-gray-100 my-2"
            :class="{ shrunk: !password }"
          />
          <!-- Buttons -->
          <div class="flex w-full mb-2 mt-2 justify-end text-center gap-2">
            <button
              @click="onLaterBtn"
              class="rounded-md p-2 flex flex-col cursor-pointer items-center w-16 bg-gray-100 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <icon-mdi-clock class="text-lg" />Later
            </button>
            <button
              @click="onConfirmBtn"
              class="rounded-md p-2 flex flex-col cursor-pointer items-center w-16 bg-emerald-400 hover:bg-emerald-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-default transition-colors"
              :disabled="!canConfirm"
            >
              <icon-mdi-check-bold class="text-lg" />Confirm
            </button>
          </div>
        </div>
      </modal>
    </transition>
  </teleport>
</template>

<script lang="ts" setup>
// import Modal from './Modal.vue'

const props = defineProps<{
  message: string
  inputPlaceholders: string[]
  requiresConfirm: boolean
  opened: boolean
}>()

// define ref for data

const viewPasswords = ref(false)

const password = ref('')
const confirmPassword = ref('')

// define computed
const canConfirm = computed(() => {
  return (
    !(password.value.length == 0) &&
    (confirmPassword.value == password.value || !props.requiresConfirm)
  )
})

// define emits
const emit = defineEmits(['panel-confirm', 'panel-close'])

// define methods
const onConfirmBtn = (event: Event) => {
  if (canConfirm.value) {
    // confirm
    emit('panel-confirm', { newPassword: password.value, updateChrome: true })
    password.value = ''
    confirmPassword.value = ''

    // hidePanel()
  }
}
const onLaterBtn = (event: Event) => {
  emit('panel-close')
  // hidePanel()
}
// const showPanel = () => {
//   opened.value = true
// }
// const hidePanel = () => {
//   password.value = ''
//   confirmPassword.value = ''
//   opened.value = false
// }
</script>
