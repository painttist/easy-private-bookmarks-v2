<template>
  <div
    class="group align-left cursor-default h-full w-full flex"
    :style="{ 'padding-left': node.level * 1.2 + 'em' }"
    :class="{
      'hover:text-blue-500': !locked,
    }"
  >
    <!-- Link -->
    <div
      class="w-full min-w-0 cursor-pointer flex items-center gap-1 hover:bg-white pl-2 rounded transition-colors duration-100"
      @click="handleLinkClick"
      :class="{
        locked: locked,
        url: !isFolder,
        folder: isFolder,
        match: true,
      }"
    >
      <!-- Icon before text -->
      <div class="w-5 flex justify-end">
        <div
          v-if="isFolder"
          class="py-1.5"
        >
          <icon-mdi-folder-open
            v-if="node.open"
            class="block text-yellow-400 text-base"
          ></icon-mdi-folder-open>
          <icon-mdi-folder
            v-if="!node.open"
            class="block text-yellow-400 text-base"
          ></icon-mdi-folder>
        </div>
        <img
          v-if="!isFolder && !locked"
          :src="faviconUrl"
          class="w-4 h-4"
        />
        <icon-mdi-lock
          v-if="!isFolder && locked"
          class="text-base text-purple-500"
        ></icon-mdi-lock>
      </div>
      <!-- Text -->
      <div
        class="whitespace-nowrap overflow-hidden text-ellipsis w-full"
        :class="{
          'text-purple-500': locked,
        }"
      >
        {{ node.title || node.url?.match(/\w*\.?\w*\.\w*/)?.[0] }}
      </div>
      <!-- Controls -->
      <div
        v-if="!isFolder"
        class="group-hover:opacity-100 flex-shrink-0 opacity-0 transition-all overflow-hidden duration-100 h-full flex items-center gap-1 text-base"
      >
        <div
          @click="handleLock"
          class="transition-colors duration-100 rounded py-1.5 px-1.5"
          :class="{
            'hover:bg-blue-200 text-blue-500': !locked,
            'hover:bg-purple-200 text-purple-500': locked,
          }"
        >
          <icon-mdi-lock-open
            v-if="!locked"
            class=""
          ></icon-mdi-lock-open>
          <icon-mdi-lock
            v-if="locked"
            class=""
          ></icon-mdi-lock>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { manageBookmarkKey, passwordKey } from '../api/injectkeys'
import {
  BookmarkInfo,
  BookmarkProcessedInfo,
  generateHashForPassword,
  isLockedURL,
  urlSupportIdentifier,
} from '../api/lib'

import { generateFragment, decryptFragment } from '../api/link'
const urlBase = chrome.runtime.getURL('options.html')

const props = defineProps<{
  node: BookmarkProcessedInfo
}>()

const locked = computed(() => props.node.url && isLockedURL(props.node.url))
const isFolder = computed(() => !props.node.url)

const faviconUrl = computed(() => {
  console.log('Get favicon')
  return (
    (props.node.url &&
      `https://www.google.com/s2/favicons?domain=${
        new URL(props.node.url).hostname
      }`) ||
    ''
  )
})

const {
  openFolder,
  closeFolder,
  updateBookmark,
  deleteBookmark,
  lockBookmark,
  unlockBookmark,
} = inject(manageBookmarkKey, {
  openFolder: (id: string) => {},
  closeFolder: (id: string) => {},
  updateBookmark: async (newNode: BookmarkInfo) => {},
  deleteBookmark: function (id: string): void {
    throw new Error('Function not implemented.')
  },
  lockBookmark(info) {},
  unlockBookmark(info) {},
})

async function handleLock(e: Event) {
  e.stopPropagation()
  // chrome.bookmarks.update(node.id, {
  //   title: "Locked"
  // }, (node) => { console.log(node) })

  if (!props.node.url) {
    // Is Folder
  } else if (!locked.value) {
    // To Lock
    lockBookmark(props.node)
  } else if (locked.value) {
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
