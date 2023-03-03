<script setup lang="ts">
// const bookmarks = ref<chrome.bookmarks.BookmarkTreeNode[]>([])

import { manageBookmarkKey, passwordKey } from '../api/injectkeys'
import {
  BookMarkInfo,
  DEFAULT_KEYTIMEOUT,
  generateHashForPassword,
  generateNewURLFromFrag,
  isLockedURL,
  processNodes,
  urlSupportIdentifier,
} from '../api/lib'
import { decryptFragment, generateFragment } from '../api/link'

const bookmarks = ref<BookMarkInfo[]>([])
const rawInfo = ref<chrome.bookmarks.BookmarkTreeNode[] | undefined>(undefined)

const elmInput = ref<HTMLInputElement | null>(null)

const searchQuery = ref('')

chrome.bookmarks.getTree((tree) => {
  rawInfo.value = tree?.[0]?.children?.[0]?.children
  if (rawInfo.value) {
    bookmarks.value = processNodes(rawInfo.value, '')
  }
  // bookmarks.value =  || []
  // console.log(bookmarks.value)
})

const filtering = ref(false)

const testPassword = ref('12345687')
const lockHash = ref('')
const unloackPassword = ref('')

enum Modals {
  None,
  Lock,
  Unlock,
  WarnDeleteKey,
}

const activeModal = ref(Modals.None)

const elmModelUnlock = ref<HTMLElement | null>(null)
const elmModelLock = ref<HTMLElement | null>(null)

const urlBase = chrome.runtime.getURL('options.html')

async function initialize() {
  // get v1 stored plain password
  // await chrome.storage.sync.set({ 'lock-password': "t1f2000" })

  let data = await chrome.storage.sync.get('lock-password')
  let lockPassword = data['lock-password']
  if (!lockPassword) {
    let data = await chrome.storage.sync.get('lock-hash')
    if (data['lock-hash']) {
      lockHash.value = data['lock-hash']
      console.log('Lock Hash Loaded', lockHash.value)
    } else {
      activeModal.value = Modals.Lock
    }
    return // not v1
  } else {
    console.log('Migrating from v1')
    let bookmarksTree = await chrome.bookmarks.getTree()
    lockHash.value = await generateHashForPassword(lockPassword)
    console.log('Generates lock-hash from v1 password: ', lockHash.value)
    const updateTreeFromV1 = async (
      tree: chrome.bookmarks.BookmarkTreeNode[]
    ) => {
      for (let node of tree) {
        if (node.children) {
          await updateTreeFromV1(node.children)
        }
        if (!node.url) {
          continue
        }
        // console.log(isLockedURL(node.url))
        if (isLockedURL(node.url)) {
          let url = new URL(node.url)
          // let fragment = url.hash.slice(1)
          console.log('Processessing Locked URL with url: ', url)
          try {
            let output = await decryptFragment(url, lockPassword)
            if (output) {
              console.log('Decrypted fragment: ', output.decrypted)
              let url = output.decrypted
              let frag = await generateFragment(
                url,
                lockHash.value,
                node.title,
                true,
                true
              )
              console.log('New URL:', generateNewURLFromFrag(frag))
              // chrome.bookmarks.update(node.id, {
              //   url: generateNewURLFromFrag(frag),
              // })
            } else {
              console.log('Failed to decrypt fragment: ', url)
            }
          } catch (error) {
            console.log(error)
          }
        }
      }
    }

    let bookmarks = bookmarksTree?.[0]?.children?.[0]?.children

    if (bookmarks) {
      console.log('Bookmarks tree: ', bookmarks)
      await updateTreeFromV1(bookmarks)
    }
  }

  // remove the v1 stored plain password
  await chrome.storage.sync.remove('lock-password')
}

onBeforeMount(async () => {
  // chrome.storage.sync.get(['lockHash'], (result) => {
  //   lockHash.value = result.lockHash
  // })
  // lockHash.value = await generateHashForPassword(testPassword.value)
  // chrome.storage.sync.set({ 'lock-hash': lockHash.value })

  await initialize()

  // console.log(lockHash.value)
})

provide(passwordKey, { lockHash: lockHash, unlockPassword: testPassword })

provide(manageBookmarkKey, {
  openFolder: (id: string) => {
    // pass
    if (!bookmarks.value) return
    let folderIndex = bookmarks.value.findIndex((item) => {
      return item.id == id
    })
    let folderLevel = bookmarks.value[folderIndex].level
    let itemLevel = folderLevel + 1

    let newBookmarks = bookmarks.value.slice()

    chrome.bookmarks.getSubTree(id, (node) => {
      // console.log('Got node', node[0])
      if (!node[0].children) return
      newBookmarks.splice(
        folderIndex + 1,
        0,
        ...processNodes(node[0].children, searchQuery.value).map((item) => {
          item.level = item.level + itemLevel
          return item
        })
      )
      newBookmarks[folderIndex].open = true
      bookmarks.value = newBookmarks
    })
  },
  closeFolder: (id: string) => {
    // find node with id then delete all its children
    if (!bookmarks.value) return

    let folderIndex = bookmarks.value.findIndex((item) => {
      return item.id == id
    })
    let folderLevel = bookmarks.value[folderIndex].level

    let newBookmarks = bookmarks.value.slice()

    // console.log('Level:', folderLevel)
    var i = folderIndex + 1
    while (newBookmarks[i].level > folderLevel) {
      newBookmarks.splice(i, 1)
    }
    newBookmarks[folderIndex].open = false
    bookmarks.value = newBookmarks
  },
  updateBookmark: async (newNode: BookMarkInfo) => {
    if (!bookmarks.value) return

    console.log(
      'Updating bookmark: ',
      newNode.title,
      ' with url: ',
      newNode.url,
      ' and id: ',
      newNode.id,
      ''
    )
    try {
      await chrome.bookmarks.update(newNode.id, {
        title: newNode.title,
        url: newNode.url,
      })
    } catch (error) {
      console.log(error)
      return
    }

    let tree = await chrome.bookmarks.getTree()
    rawInfo.value = tree?.[0]?.children?.[0]?.children

    let item = await chrome.bookmarks.getSubTree(newNode.id)
    console.log(
      'getSubTree: ',
      item[0].title,
      ' with url: ',
      item[0].url,
      ' and id: ',
      item[0].id,
      ''
    )

    if (rawInfo.value) {
      bookmarks.value = processNodes(rawInfo.value, searchQuery.value)
    }

    // let bookmarkIndex = bookmarks.value.findIndex((item) => {
    //   return item.id == newNode.id
    // })
    // let newBookmarks = bookmarks.value.slice()
    // newBookmarks[bookmarkIndex] = newNode

    // bookmarks.value[bookmarkIndex] = newNode
  },
  deleteBookmark: async (id: string) => {
    if (!bookmarks.value) return

    try {
      await chrome.bookmarks.remove(id)
    } catch (error) {
      console.log(error)
      return
    }

    let tree = await chrome.bookmarks.getTree()
    rawInfo.value = tree?.[0]?.children?.[0]?.children

    let bookmarkIndex = bookmarks.value.findIndex((item) => {
      return item.id == id
    })
    let newBookmarks = bookmarks.value.slice()
    newBookmarks.splice(bookmarkIndex, 1)
    bookmarks.value = newBookmarks
  },
})

function onInputFocus() {
  // resets filtering and clear the searchQuery if currently filtering
  if (filtering.value) {
    toggleFilter()
  }
}

function toggleFilter() {
  if (rawInfo.value === undefined) {
    return
  }
  filtering.value = !filtering.value
  if (filtering.value) {
    searchQuery.value = '[ Locked URL ]'
    let baseURL = chrome.runtime.getURL('options.html')
    // bookmarks.value = processNodes(rawInfo.value, baseURL + '#')
    bookmarks.value = processNodes(rawInfo.value, 'locked')
  } else {
    searchQuery.value = ''
    bookmarks.value = processNodes(rawInfo.value, '')
  }
}

function updateSearch(e: KeyboardEvent) {
  searchQuery.value = (e.target as HTMLInputElement).value
  // console.log(searchQuery.value)
  if (rawInfo.value === undefined) {
    return
  }
  bookmarks.value = processNodes(rawInfo.value, searchQuery.value)
}

function clearSearch(e: KeyboardEvent) {
  if (searchQuery.value !== '') {
    e.preventDefault()
    searchQuery.value = ''
  }
}

async function updateLockHash({
  newPassword,
  updateChrome,
}: {
  newPassword: string
  updateChrome: boolean
}) {
  let newHash = ''
  if (newPassword === '') {
    if (updateChrome) {
      chrome.storage.sync.remove('lock-hash', () => {
        console.log('Chrome Storage Remove Lock Hash')
      })
      lockHash.value = ''
    }
  } else {
    newHash = await generateHashForPassword(newPassword)
    lockHash.value = newHash

    if (updateChrome) {
      chrome.storage.sync.set({ 'lock-hash': newHash }, () => {
        console.log('Chrome Storage Set Lock Hash')
      })
    }
  }
  activeModal.value = Modals.None
}

async function updateUnlockPassword({
  newPassword,
  updateChrome,
}: {
  newPassword: string
  updateChrome: boolean
}) {
  if (updateChrome) {
    await chrome.storage.local.set({ 'unlock-password': newPassword })

    let data = await chrome.storage.sync.get('option-key-timeout')

    let keyTimeout = data['option-key-timeout']

    let expireTime = 0
    if (!keyTimeout) {
      await chrome.storage.sync.set({
        'option-key-timeout': DEFAULT_KEYTIMEOUT,
      })
      expireTime = Date.now() + DEFAULT_KEYTIMEOUT // ms
    } else {
      expireTime = Date.now() + keyTimeout // ms
    }

    await chrome.storage.local.set({ 'expire-time': expireTime })
    console.log('Set expried time done')
  }

  console.log('Updated Unlock Password')
  unloackPassword.value = newPassword
  activeModal.value = Modals.None
}

function handleCogClick() {
  console.log(activeModal.value)
}

onMounted(() => {
  elmInput.value?.focus()

  chrome.storage.local.get('expire-time', (data) => {
    let expireTime = data['expire-time']
    console.log('expireTime', expireTime)
    console.log('currentTime', Date.now())
    console.log('seconds till expire', (expireTime - Date.now()) / 1000)

    if (!expireTime) {
      // first time open
      // activeModal.value = Modals.Lock
    } else if (expireTime > Date.now()) {
      // The key is still ok
      chrome.storage.local.get('unlock-password', (data) => {
        let lockPassword = data['unlock-password']
        if (lockPassword)
          updateUnlockPassword({
            newPassword: lockPassword,
            updateChrome: false,
          })
      })
    } else {
      // key is expired
      chrome.storage.local.remove('unlock-password')
    }
  })
})
</script>

<template>
  <modal-password
    ref="elmModelLock"
    :opened="activeModal == Modals.Lock"
    :message="'One-time Lock Setup'"
    :requiresConfirm="true"
    :inputPlaceholders="['Set a password', 'Confirm']"
    @panel-confirm="updateLockHash"
    @panel-close="activeModal = Modals.None"
  >
  </modal-password>
  <modal-password
    ref="elmModelUnlock"
    :opened="activeModal == Modals.Unlock"
    :message="'Need a key to unlock'"
    :requiresConfirm="false"
    :inputPlaceholders="['Password please']"
    @panel-confirm="updateUnlockPassword"
    @panel-close="activeModal = Modals.None"
  >
  </modal-password>
  <modal-warning
    ref="elmModeleWarning"
    :opened="activeModal == Modals.WarnDeleteKey"
    :message="`- This won\'t unlock bookmarks.
- Removes hash for locking without password.
- Need a password to lock again.
- Existing passwords won't change. `"
    @panel-confirm="updateLockHash"
    @panel-close="activeModal = Modals.None"
  >
  </modal-warning>
  <div class="p-2 bg-gray-100 w-full">
    <div class="w-full flex gap-2">
      <button
        :title="`${lockHash == '' ? 'Add Lock' : 'Remove Lock'}`"
        class="p-2 text-base rounded transition-colors duration-200"
        :class="{
          'bg-blue-200 text-blue-800 hover:text-black': lockHash == '',
          'bg-purple-200 text-purple-900 hover:text-purple-700': lockHash != '',
        }"
        @click="
          lockHash == ''
            ? (activeModal = Modals.Lock)
            : (activeModal = Modals.WarnDeleteKey)
        "
      >
        <icon-mdi-lock-open v-if="lockHash == ''" />
        <icon-mdi-lock v-if="lockHash != ''" />
      </button>
      <button
        title="Filter Locked URL"
        class="p-2 text-base rounded transition-colors duration-200"
        :class="{}"
        @click="handleCogClick"
      >
        <icon-mdi-cog />
      </button>
      <button
        title="Filter Locked URL"
        class="p-2 text-base rounded transition-colors duration-200"
        :class="{
          'bg-yellow-400 hover:bg-yellow-300 text-yellow-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500':
            filtering,
          'bg-white hover:bg-gray-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400':
            !filtering,
        }"
        @click="toggleFilter"
      >
        <icon-mdi-filter />
      </button>
      <div class="relative w-full">
        <input
          ref="elmInput"
          :value="searchQuery"
          @focus="onInputFocus"
          @keyup="updateSearch"
          @keydown.esc="clearSearch"
          class="h-full w-full pl-8 text-base bg-white focus:outline-blue-400 rounded"
          :class="{
            '': !filtering,
            'border-2 border-yellow-400 italic': filtering,
          }"
        />
        <icon-mdi-magnify
          class="absolute top-1/2 left-2 transform -translate-y-1/2 text-base"
        />
      </div>
    </div>
    <bookmarks-scroll
      v-if="bookmarks.length > 0"
      :list="bookmarks"
    />
  </div>
</template>

<style scoped></style>
