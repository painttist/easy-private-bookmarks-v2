<template>
  <div>
    <!--Overlay Effect-->
    <div
      class="fixed inset-0 bg-gray-600 bg-opacity-50 h-full w-fulloverflow-y-auto"
      id="my-modal"
    ></div>

    <div
      class="fixed top-1/2 left-1/2 transform-gpu -translate-x-1/2 -translate-y-1/2 bg-white shadow-lg flex flex-col items-center justify-start rounded-lg max-h-[calc(100vh-1.825rem)] overflow-y-auto scrollbar"
      :class="{
        'w-2/3': wide,
        'w-1/2': !wide,
      }"
    >
      <div class="text-lg font-bold p-2 mt-4 text-gray-800">{{ message }}</div>
      <slot></slot>
    </div>
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  message: string
  wide?: boolean
}>()
</script>
