<template>
  <div
    class="group align-left cursor-default h-full w-full flex"
    :style="{ 'padding-left': node.level * 1.2 + 'em' }"
    :class='{
      "hover:text-blue-500": !locked,
    }'
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
        <button
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
        </button>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { manageBookmarkKey, passwordKey } from '../api/injectkeys'
import {
  BookMarkInfo,
  generateHashForPassword,
  isLockedURL,
  urlSupportIdentifier,
} from '../api/lib'

import { generateFragment, decryptFragment } from '../api/link'
const urlBase = chrome.runtime.getURL('options.html')

const props = defineProps<{
  node: BookMarkInfo
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

const passwordInfo = inject(passwordKey)

const { openFolder, closeFolder, updateBookmark, deleteBookmark } = inject(
  manageBookmarkKey,
  {
    openFolder: (id: string) => {},
    closeFolder: (id: string) => {},
    updateBookmark: async (newNode: BookMarkInfo) => {},
    deleteBookmark: function (id: string): void {
      throw new Error('Function not implemented.')
    },
  }
)

async function handleLock(e: Event) {
  e.stopPropagation()
  // chrome.bookmarks.update(node.id, {
  //   title: "Locked"
  // }, (node) => { console.log(node) })

  if (passwordInfo) {
    const { lockHash, unlockPassword } = passwordInfo
    if (!props.node.url) {
      // Is Folder
    } else if (!locked.value) {
      // To Lock
      if (lockHash.value == '') {
        // emitter.emit('need-lock-password')
        console.log('lockhash is empty')
        return
      }

      let frag = await generateFragment(
        props.node.url,
        lockHash.value,
        props.node.title,
        true,
        true
      )

      console.log('Updating', props.node)

      await updateBookmark({
        title: 'Locked',
        url: urlBase + urlSupportIdentifier + '#' + frag,
        id: props.node.id,
        level: props.node.level,
        open: props.node.open,
      })
    } else if (locked.value) {
      // To UnLock
      console.log('Unlock')

      if (!unlockPassword) {
        // emitter.emit('need-key')
        setUpRetry()
        return
      }
      let pwd = await generateHashForPassword(unlockPassword.value)
      let output
      try {
        console.log('hash for unlock', pwd)
        output = await decryptFragment(props.node.url, pwd)
        console.log(props.node.url, pwd, output)
        let url = output?.decrypted
        let title = output?.hint
        console.log('Unlocking', url, title)
        await updateBookmark({
          title: title,
          url: url,
          id: props.node.id,
          level: props.node.level,
          open: props.node.open,
        })
      } catch (e) {
        console.log(e)
        // emitter.emit('error-unlock', e.message)
        setUpRetry()
      }
    }
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
  console.log('Open', props.node.url)
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
