<template>
  <teleport to="body">
    <transition
      name="fade"
      @enter="elmTitleInput?.focus()"
    >
      <modal
        :message="isFolder ? 'Edit Folder' : 'Edit Bookmark'"
        :wide="true"
        v-if="opened && init()"
      >
        <div class="px-8 pb-4 w-full">
          <textarea-autoresize
            rows="1"
            class="w-full text-sm py-2 px-4 bg-gray-100 my-2 rounded"
            v-model="title"
            ref="elmTitleInput"
            type="text"
            placeholder="Title"
            :autosize="true"
          />
          <textarea-autoresize
            rows="1"
            class="w-full text-sm py-2 px-4 bg-gray-100 my-2 rounded"
            v-if="!isFolder"
            :modelValue="decodeURI(url)"
            @update:modelValue="updateUrl"
            ref="elmUrlInput"
            type="text"
            :autosize="true"
            placeholder="URL"
          />
          <div
            class="text-sm text-orange-600"
            v-if="error != ''"
          >
            {{ error }}
          </div>
          <!-- Buttons -->
          <div class="flex w-full mb-2 mt-4 justify-end text-center gap-2">
            <button
              @click="onDeleteBtn"
              class="rounded-md p-2 flex flex-col cursor-pointer items-center w-16 bg-red-100 hover:bg-red-200 text-red-600 hover:text-red-800 transition-colors"
            >
              <icon-material-symbols-delete class="text-lg" />Delete
            </button>
            <button
              @click="onCancelBtn"
              class="rounded-md p-2 flex flex-col cursor-pointer items-center w-16 bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors"
            >
              <icon-material-symbols-close class="text-lg" />Cacel
            </button>
            <button
              @click="onConfirmBtn"
              class="rounded-md p-2 flex flex-col cursor-pointer items-center w-16 bg-emerald-100 hover:bg-emerald-200 text-emerald-600 hover:text-emerald-800 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-default transition-colors"
            >
              <icon-material-symbols-done class="text-lg" />Confirm
            </button>
          </div>
        </div>
      </modal>
    </transition>
  </teleport>
</template>

<script lang="ts" setup>
const props = defineProps<{
  id: string
  opened: boolean
}>()

const title = ref('')
const url = ref('')

const elmTitleInput = ref<HTMLInputElement | null>(null)

const isFolder = ref(true)

const init = () => {
  chrome.bookmarks.getSubTree(props.id, (bookmark) => {
    isFolder.value = !!bookmark?.[0].children
    title.value = bookmark?.[0].title
    if (!isFolder.value && bookmark?.[0].url) {
      url.value = bookmark?.[0].url
    }
  })
  return true
}

const emit = defineEmits(['panel-close'])

const error = ref('')

const updateUrl = (value: string) => {
  url.value = value
}

const closePanel = () => {
  error.value = ''
  emit('panel-close')
}

// define methods
const onConfirmBtn = async (event: Event) => {
  if (!isFolder.value && url.value == '') {
    error.value = 'URL is required'
    return
  }
  try {
    if (isFolder.value) {
      await chrome.bookmarks.update(props.id, {
        title: title.value,
      })
      // console.log("Updated Folder Success", title.value, url.value)
      closePanel()
      return
    } else {
      await chrome.bookmarks.update(props.id, {
        title: title.value,
        url: url.value,
      })
      // console.log("Updated Success", title.value, url.value)
      closePanel()
    }
  } catch (e: any) {
    console.log("Updated Error", e)
    if (e.toString().includes('Invalid URL')) {
      error.value = 'Invalid URL'
      return
    }
    error.value = e
  }
}
const onCancelBtn = async (event: Event) => {
  // console.log('cancel')
  closePanel()
}

const onDeleteBtn = async (event: Event) => {
  // console.log('delete')
  try {
    await chrome.bookmarks.remove(props.id)
    closePanel()
  } catch (e: any) {
    if (e.toString().includes('non-empty folder')) {
      error.value = "Can't delete non-empty folder"
      return
    }
    error.value = e
  }
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
