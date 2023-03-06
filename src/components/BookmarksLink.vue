<template>
  <div
    class="group align-left cursor-default h-full w-full flex relative transition-colors"
    :style="{ 'padding-left': node.level * 1.2 + 'em' }"
    :class="{
      'hover:text-blue-500': !locked,
      'border-b-[1px] border-blue-500': previewInsert,
    }"
  >
    <!-- Link -->
    <div
      class="w-full min-w-0 cursor-pointer flex items-center gap-1 hover:bg-white pl-2 rounded transition-colors duration-100"
      @click="handleLinkClick"
      :class="{}"
    >
      <!-- Icon before text -->
      <div class="w-4 flex justify-center shrink-0">
        <div
          v-if="isFolder"
          class="py-1.5"
        >
          <icon-material-symbols-folder-open
            v-if="node.open"
            class="block text-yellow-400 text-base"
          ></icon-material-symbols-folder-open>
          <icon-material-symbols-folder
            v-if="!node.open"
            class="block text-yellow-400 text-base"
          ></icon-material-symbols-folder>
        </div>
        <img
          v-if="!isFolder && !locked"
          :src="faviconUrl"
          class="w-4 h-4"
        />
        <icon-material-symbols-lock
          v-if="!isFolder && locked"
          class="text-base"
          :class="{
            'text-purple-500': !isCorrupted,
            'text-red-500': isCorrupted,
          }"
        ></icon-material-symbols-lock>
      </div>
      <!-- Text -->
      <div
        class="whitespace-nowrap overflow-hidden text-ellipsis w-full"
        :class="{
          'text-purple-500': locked && !isCorrupted,
          'text-red-500': isCorrupted,
        }"
      >
        {{
          isCorrupted
            ? 'Corrupted'
            : isUnlocking
            ? 'Peeking inside ...'
            : node.title || node.url?.match(/\w*\.?\w*\.\w*/)?.[0]
        }}
      </div>
      <!-- Controls -->
      <div
        class="group-hover:opacity-100 flex-shrink-0 opacity-0 transition-all overflow-hidden duration-100 h-full flex items-center gap-1 text-base"
      ><div
          @click.stop="handleAddFolder"
          @mouseenter="previewInsert = true"
          @mouseleave="previewInsert = false"
          class="transition-colors duration-100 rounded py-1.5 px-1.5 hover:bg-blue-200 text-blue-500"
        >
          <icon-material-symbols-create-new-folder />
        </div>
        <div
          @click.stop="handleEditLink"
          class="transition-colors duration-100 rounded py-1.5 px-1.5 hover:bg-blue-200 text-blue-500"
        >
          <icon-material-symbols-edit />
        </div>
        
        <div
          @click.stop="handleAddLink"
          @mouseenter="previewInsert = true"
          @mouseleave="previewInsert = false"
          class="transition-colors duration-100 rounded py-1.5 px-1.5 hover:bg-blue-200 text-blue-500"
        >
          <icon-material-symbols-bookmark-add />
        </div>
        <div
          @click="handleLock"
          v-if="!isFolder"
          class="transition-colors duration-100 rounded py-1.5 px-1.5"
          :class="{
            'hover:bg-blue-200 text-blue-500': !locked,
            'hover:bg-purple-200 text-purple-500': locked,
          }"
        >
          <icon-material-symbols-lock-open
            v-if="!locked"
            class=""
          ></icon-material-symbols-lock-open>
          <icon-material-symbols-lock
            v-if="locked"
            class=""
          ></icon-material-symbols-lock>
        </div>
      </div>
      
      
    </div>
  </div>
</template>

<script lang="ts" setup>
import { manageBookmarkKey } from '../api/injectkeys'
import {
  BookmarkInfo,
  BookmarkProcessedInfo,
  isLockedURL,
  PeekState,
} from '../api/lib'

const props = defineProps<{
  node: BookmarkProcessedInfo
}>()

const isUnlocking = computed(() => {
  return props.node.peekState === PeekState.Unlocking
  // return peekInfo?.peeking.value && isLockedURL(props.node.url)
})

const isCorrupted = computed(() => {
  return props.node.peekState === PeekState.Failed
})

const locked = computed(
  () =>
    (props.node.url && isLockedURL(props.node.url)) ||
    props.node.peekState !== PeekState.None
)
const isFolder = computed(() => !props.node.url)

const faviconUrl = computed(() => {
  // console.log('Get favicon')
  return (
    (props.node.url &&
      `https://www.google.com/s2/favicons?domain=${
        new URL(props.node.url).hostname
      }`) ||
    ''
  )
})

const { openFolder, closeFolder, lockBookmark, unlockBookmark, addLink, editLink, addFolder } =
  inject(manageBookmarkKey, {
    openFolder: (id: string) => {},
    closeFolder: (id: string) => {},
    updateBookmark: async (newNode: BookmarkInfo) => {},
    deleteBookmark: function (id: string): void {
      throw new Error('Function not implemented.')
    },
    lockBookmark(info) {},
    unlockBookmark(info) {},
    addLink(info) {},
    addFolder(info) {},
    editLink(info) {},
  })

const previewInsert = ref(false)

async function handleEditLink() {
  editLink(props.node.id)
}

async function handleAddFolder() {
  addFolder(props.node.id)
}

async function handleAddLink() {
  addLink(props.node.id)
}

async function handleLock(e: Event) {
  e.stopPropagation()

  if (!props.node.url) return

  if (!locked.value) {
    // To Lock
    lockBookmark(props.node)
  } else {
    // To UnLock
    unlockBookmark(props.node)
  }
}

function setUpRetry() {
  // emitter.on('panel-confirm', () => {
  //   emitter.off('panel-close')
  //   emitter.off('panel-confirm')
  //   handleLock()
  // })
  // emitter.on('panel-close', () => {
  //   emitter.off('panel-close')
  //   emitter.off('panel-confirm')
  // })
}

function handleLinkClick() {
  if (!props.node.url) {
    // Handle Open / Closing Folders
    if (props.node.open === false) {
      openFolder(props.node.id)
    } else {
      closeFolder(props.node.id)
    }
    return
  }
  chrome.tabs.create({ url: props.node.url })
}
</script>
