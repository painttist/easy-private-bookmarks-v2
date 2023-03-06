<template>
  <textarea
    ref="textareaRef"
    v-model="value"
    :style="computedStyles"
    @focus="resize"
    @input="() => {
      resize()
      emit('update:modelValue', value)
    }"
  />
</template>

<script lang="ts" setup>
import { CSSProperties } from 'vue'

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

const emit = defineEmits<{
  (event: 'update:modelValue', value: string | number): void
}>()

const height = ref('0')
const textareaRef = ref()
const maxHeightScroll = ref(false)
const value = ref(props.modelValue)

const isImportantAttr = (attr: CssAttribs) => {
  return (
    props.important === true ||
    (Array.isArray(props.important) && props.important.includes(attr))
  )
}

const computedStyles = computed<CSSProperties | undefined>(() => {
  if (!props.autosize) {
    return undefined
  }

  return {
    resize: !isImportantAttr('resize') ? 'none' : 'none !important',
    height: height.value,
    overflow: maxHeightScroll.value
      ? 'auto'
      : !isImportantAttr('overflow')
      ? 'hidden'
      : 'hidden !important',
  } as CSSProperties // !important is not always allowed for `CSSProperties`
})

const resize = () => {
  const important = isImportantAttr('height') ? 'important' : ''
  height.value = `auto${important ? ' !important' : ''}`

  nextTick(() => {
    let contentHeight = textareaRef.value.scrollHeight + 1
    if (props.minHeight) {
      contentHeight =
        contentHeight < props.minHeight ? props.minHeight : contentHeight
    }
    if (props.maxHeight) {
      if (contentHeight > props.maxHeight) {
        contentHeight = props.maxHeight
        maxHeightScroll.value = true
      } else {
        maxHeightScroll.value = false
      }
    }

    // console.log(textareaRef.value.value)

    const heightVal = `${contentHeight}px`
    // console.log('contentHeight', contentHeight, 'heightVal', heightVal)
    height.value = `${heightVal}${important ? ' !important' : ''}`
  })
}

onMounted(() => {
  resize()
})

watch(
  () => props.modelValue,
  (val) => {
    value.value = val
    nextTick(resize)
    emit('update:modelValue', val)
  }
)

watch(
  () => props.minHeight,
  () => {
    nextTick(resize)
  }
)

watch(
  () => props.maxHeight,
  () => {
    nextTick(resize)
  }
)

watch(
  () => props.autosize,
  (val) => {
    if (val) resize()
  }
)
</script>
