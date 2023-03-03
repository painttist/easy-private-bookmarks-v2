<template>
  <teleport to="body">
    <transition name="fade">
      <modal
        :message="'Are you sure?'"
        :wide="true"
        v-if="opened"
      >
        <div class="px-8 pb-4">
          <div class="text-sm whitespace-pre-wrap text-left py-2">
            {{ message }}
          </div>
          <!-- Buttons -->
          <div class="flex w-full mb-2 mt-2 justify-end text-center gap-2">
            <button
              @click="onLaterBtn"
              class="rounded-md p-2 flex flex-col cursor-pointer items-center w-16 bg-red-100 text-red-600 hover:text-red-800 transition-colors"
            >
              <icon-mdi-close-thick class="text-lg" />No
            </button>
            <button
              @click="onConfirmBtn"
              class="rounded-md p-2 flex flex-col cursor-pointer items-center w-16 bg-emerald-400 hover:bg-emerald-300 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-default transition-colors"
            >
              <icon-mdi-check-bold class="text-lg" />Yes
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
