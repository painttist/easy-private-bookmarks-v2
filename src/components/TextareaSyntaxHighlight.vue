<template>
  <div class="relative h-24" v-bind="$attrs">
    <textarea
      ref="textareaRef"
      v-model="value"
      spellcheck="false"
      id="editing"
    />
    <pre
      aria-hidden="true"
      id="highlighting"
    ><code class="language-html" ref="elmHighlighted">{{ highlighted }}</code></pre>
  </div>
</template>

<script lang="ts" setup>

type CssAttribs = 'resize' | 'overflow' | 'height'

const props = defineProps<{
  modelValue: string | number
  autosize: boolean
  minHeight: number
  maxHeight: number
  important: CssAttribs[] | boolean
}>()

defineExpose({
  focus: () => textareaRef.value.focus(),
})

const textareaRef = ref()
const value = ref(props.modelValue)

const highlighted = computed(() => {
  return value.value
  // return Prism.highlight(value.value, Prism.languages.html, 'html')
})

</script>

<style scoped>
#editing,
#highlighting {
  /* Both elements need the same text and space styling so they are directly on top of each other */
  margin: 10px;
  padding: 10px;
  border: 0;
  width: calc(100% - 32px);
  height: 150px;
}

#editing,
#highlighting,
#highlighting * {
  /* Also add text styles to highlighting tokens */
  font-size: 15pt;
  font-family: monospace;
  line-height: 20pt;
}

#editing, #highlighting {
  position: absolute;
  top: 0;
  left: 0;
}

/* Move the textarea in front of the result */
#editing {
  z-index: 1;
}

#highlighting {
  z-index: 0;
}

/* Make textarea almost completely transparent */
#editing {
  color: transparent;
  background: transparent;
  caret-color: black; /* Or choose your favorite color */
}
</style>
