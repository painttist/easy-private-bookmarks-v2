<template>
  <teleport to="body">
    <transition name="fade">
      <modal
        :message="title || 'Are you sure?'"
        :wide="true"
        v-if="opened"
      >
        <div class="px-8 pb-4 w-full">
          <div class="text-sm whitespace-pre-wrap text-left py-2">
            {{ message }}
          </div>
          <!-- Buttons -->
          <div class="flex w-full mb-2 mt-2 justify-end text-center gap-2">
            <button
              v-if="isDanger"
              @click="onConfirmBtn"
              class="rounded-md p-2 flex flex-col cursor-pointer items-center w-16 bg-gray-100 hover:bg-green-200 text-gray-600 hover:text-emerald-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-default transition-colors"
            >
              <icon-material-symbols-done class="text-lg" />Yes
            </button>
            <button
              v-if="!isDanger"
              @click="onLaterBtn"
              class="rounded-md p-2 flex flex-col cursor-pointer items-center w-16 bg-gray-100 hover:bg-red-200 text-gray-600 hover:text-red-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-default transition-colors"
            >
              <icon-material-symbols-close class="text-lg" />No
            </button>
            <button
              v-if="isDanger"
              @click="onLaterBtn"
              class="rounded-md p-2 flex flex-col cursor-pointer items-center w-16 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 transition-colors"
            >
              <icon-material-symbols-close class="text-lg" />No
            </button>
            <button
              v-if="!isDanger"
              @click="onConfirmBtn"
              class="rounded-md p-2 flex flex-col cursor-pointer items-center w-16 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 hover:text-emerald-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-default transition-colors"
            >
              <icon-material-symbols-done class="text-lg" />Yes
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
  title: string | undefined
  isDanger: boolean
  opened: boolean
}>()

// define emits
const emit = defineEmits(['panel-confirm', 'panel-close'])

// define methods
const onConfirmBtn = (event: Event) => {
  // confirm
  emit('panel-confirm', { newPassword: '', updateChrome: true })
}
const onLaterBtn = (event: Event) => {
  emit('panel-close')
}
</script>
