<template>
  <div>
    <Transitio name="fade">
      <img
        v-show="loaded"
        @load="onImageLoad"
        :src="src"
        :alt="alt"
        :key="src"
      />
    </Transitio >
  </div>
</template>

<script lang="ts" setup>
defineProps<{
  src: string
  alt: string
}>()

const loaded = ref(false)

const onImageLoad = () => {
  loaded.value = true
}
</script>
