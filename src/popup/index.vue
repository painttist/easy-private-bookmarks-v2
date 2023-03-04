<script setup lang="ts">
// const bookmarks = ref<chrome.bookmarks.BookmarkTreeNode[]>([])

import { manageBookmarkKey, passwordKey } from '../api/injectkeys'
import { migrate, getKeyPair, removeKeyPair, storeKeyPair } from '../api/keys'
import {
  BookmarkInfo,
  BookmarkStoreInfo,
  DEFAULT_KEYTIMEOUT,
  decryptData,
  generateHashForPassword,
  generateNewURLFromFrag,
  getEncryptedLink,
  generateEncryptedPrivateKeyPair,
  isLockedURL,
  processNodes,
  urlSupportIdentifier,
  BookmarkProcessedInfo,
} from '../api/lib'
import { decryptFragment, generateFragment } from '../api/link'

const bookmarks = ref<BookmarkProcessedInfo[]>([])
const rawInfo = ref<chrome.bookmarks.BookmarkTreeNode[] | undefined>(undefined)

const elmInput = ref<HTMLInputElement | null>(null)
const elmScrollContainer = ref<HTMLElement | null>(null)

const searchQuery = ref('')
const filtering = ref(false)

chrome.bookmarks.getTree((tree) => {
  rawInfo.value = tree?.[0]?.children?.[0]?.children
  if (rawInfo.value) {
    bookmarks.value = processNodes(rawInfo.value, '', filtering.value)
  }
})

const testPassword = ref('12345687')

const publickKey = ref('')
const privateKeyEncrypted = ref('')

const isLockEmpty = computed(() => {
  return !privateKeyEncrypted.value || !publickKey.value
})

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
  // migrate from v1
  await migrate()

  let keyPair = await getKeyPair()
  if (keyPair) {
    console.log('Key pair found')
    console.log(keyPair)
    publickKey.value = keyPair.jwkPublicKey
    privateKeyEncrypted.value = keyPair.encryptedPrivateKey
  } else {
    console.log('Key pair not found')
    // prompt user to create a new key pair
    activeModal.value = Modals.Lock
  }
}

function decryptLockedLinkv2(
  url: string,
  password: string,
  encryptedPrivateKey: string | undefined
) {
  let urlObj = new URL(url)
  let fragment = urlObj.hash.slice(1)
  let data = decryptData(fragment, password, encryptedPrivateKey)
  return data
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

const openFolder = (id: string) => {
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
      ...processNodes(node[0].children, searchQuery.value, filtering.value).map(
        (item) => {
          item.level = item.level + itemLevel
          return item
        }
      )
    )
    newBookmarks[folderIndex].open = true
    bookmarks.value = newBookmarks
  })
}

const closeFolder = (id: string) => {
  // find node with id then delete all its children
  if (!bookmarks.value) return

  let folderIndex = bookmarks.value.findIndex((item) => {
    return item.id == id
  })
  let folderLevel = bookmarks.value[folderIndex].level
  let newBookmarks = bookmarks.value.slice()

  var i = folderIndex + 1
  while (
    i < newBookmarks.length &&
    newBookmarks[i].level &&
    newBookmarks[i].level > folderLevel
  ) {
    newBookmarks.splice(i, 1)
  }
  newBookmarks[folderIndex].open = false
  bookmarks.value = newBookmarks
}

const updateBookmark = async (newNode: BookmarkInfo) => {
  if (!bookmarks.value) return

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

  if (rawInfo.value) {
    bookmarks.value = processNodes(
      rawInfo.value,
      searchQuery.value,
      filtering.value
    )
  }
}

const deleteBookmark = async (id: string) => {
  if (!bookmarks.value) return

  try {
    await chrome.bookmarks.remove(id)
  } catch (error) {
    console.log(error)
    return
  }

  let tree = await chrome.bookmarks.getTree()
  rawInfo.value = tree?.[0]?.children?.[0]?.children

  if (rawInfo.value) {
    bookmarks.value = processNodes(
      rawInfo.value,
      searchQuery.value,
      filtering.value
    )
  }
}

const lockBookmark = async (info: BookmarkInfo) => {
  if (!info.url) return

  let newLink = await getEncryptedLink(
    {
      url: info.url,
      title: info.title,
    },
    publickKey.value
  )

  if (!newLink) return

  updateBookmark({
    id: info.id,
    title: 'Locked',
    url: newLink,
  })
}
const unlockBookmark = async (info: BookmarkInfo) => {
  if (!info.url) return
  try {
    let storedInfo = await decryptLockedLinkv2(
      info.url,
      testPassword.value,
      privateKeyEncrypted.value
    )

    if (!storedInfo) return

    updateBookmark({
      id: info.id,
      title: storedInfo.title,
      url: storedInfo.url,
    })
  } catch (error) {
    console.log(error)
  }
}

provide(manageBookmarkKey, {
  openFolder,
  closeFolder,
  updateBookmark,
  deleteBookmark,
  lockBookmark,
  unlockBookmark,
})

function onInputFocus() {
  // resets filtering and clear the searchQuery if currently filtering
  // if (filtering.value) {
  //   toggleFilter()
  // }
}

function updateSearch(e: KeyboardEvent) {
  searchQuery.value = (e.target as HTMLInputElement).value
  // console.log(searchQuery.value)
  if (rawInfo.value === undefined) {
    return
  }
  bookmarks.value = processNodes(
    rawInfo.value,
    searchQuery.value,
    filtering.value
  )
}

function clearSearch(e: KeyboardEvent) {
  if (searchQuery.value !== '') {
    e.preventDefault()
    searchQuery.value = ''
  }
}

function toggleFilter() {
  if (rawInfo.value === undefined) {
    return
  }
  filtering.value = !filtering.value
  if (filtering.value) {
    // searchQuery.value = '[ Locked URL ]'
  } else {
    // searchQuery.value = ''
  }
  bookmarks.value = processNodes(
    rawInfo.value,
    searchQuery.value,
    filtering.value
  )
}

async function setNewPassword(newPassword: string, updateChrome: boolean) {
  if (newPassword === '') {
    if (updateChrome) {
      removeKeyPair()
      publickKey.value = ''
      privateKeyEncrypted.value = ''
    }
  } else {
    let keyPair = await generateEncryptedPrivateKeyPair(newPassword)
    if (updateChrome) {
      storeKeyPair(keyPair.jwkPublicKey, keyPair.encryptedPrivateKey)
      publickKey.value = JSON.stringify(keyPair.jwkPublicKey)
      privateKeyEncrypted.value = keyPair.encryptedPrivateKey
    }
  }
}

function clearModal() {
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

async function handleAddClick() {
  // genereate a new key pair
  let keyPair = await generateEncryptedPrivateKeyPair(testPassword.value)
  await storeKeyPair(keyPair.jwkPublicKey, keyPair.encryptedPrivateKey)
  publickKey.value = JSON.stringify(keyPair.jwkPublicKey)
  privateKeyEncrypted.value = keyPair.encryptedPrivateKey
}

function handleDeleteClick() {
  removeKeyPair()
  publickKey.value = ''
  privateKeyEncrypted.value = ''
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
    @panel-confirm="setNewPassword($event, true).then(clearModal)"
    @panel-close="clearModal"
  >
  </modal-password>
  <modal-password
    ref="elmModelUnlock"
    :opened="activeModal == Modals.Unlock"
    :message="'Need a key to unlock'"
    :requiresConfirm="false"
    :inputPlaceholders="['Password please']"
    @panel-confirm="updateUnlockPassword"
    @panel-close="clearModal"
  >
  </modal-password>
  <modal-warning
    ref="elmModeleWarning"
    :opened="activeModal == Modals.WarnDeleteKey"
    :title="'Delete Key?'"
    :message="`- This won\'t unlock bookmarks.
- Removes hash for locking without password.
- Need a password to lock again.
- Existing passwords won't change. `"
    @panel-confirm="setNewPassword('', true).then(clearModal)"
    @panel-close="clearModal"
  >
  </modal-warning>
  <div class="p-2 bg-gray-100 w-full">
    <div class="w-full flex gap-2">
      <button
        :title="`${isLockEmpty ? 'Add Lock' : 'Remove Lock'}`"
        class="p-2 text-base rounded transition-colors"
        :class="{
          'bg-blue-200 text-blue-800 hover:text-black': isLockEmpty,
          'bg-purple-200 text-purple-900 hover:text-purple-700': !isLockEmpty,
        }"
        @click="
          isLockEmpty
            ? (activeModal = Modals.Lock)
            : (activeModal = Modals.WarnDeleteKey)
        "
      >
        <icon-mdi-lock-open v-if="isLockEmpty" />
        <icon-mdi-lock v-if="!isLockEmpty" />
      </button>
      <button
        title="Filter Locked URL"
        class="p-2 text-base rounded transition-colors duration-200"
        :class="{}"
        @click="handleAddClick"
      >
        <icon-mdi-key />
      </button>
      <button
        title="Filter Locked URL"
        class="p-2 text-base rounded transition-colors duration-200"
        :class="{}"
        @click="handleDeleteClick"
      >
        <icon-mdi-delete />
      </button>
      <div class="relative w-full">
        <input
          ref="elmInput"
          :value="searchQuery"
          @focus="onInputFocus"
          @keyup="updateSearch"
          @keydown.esc="clearSearch"
          class="h-full w-full pl-8 text-base bg-white focus:outline-blue-400 rounded"
        />
        <icon-mdi-magnify
          class="absolute top-1/2 left-2 transform -translate-y-1/2 text-base"
        />
      </div>
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
    </div>
    <div class="h-[400px]">
      <div
        class="transition-vertical ease-[cubic-bezier(0.25, 1, 0.5, 1)] duration-200 overflow-hidden bg-gray-100"
        ref="elmScrollContainer"
        :class="{
          'h-0': bookmarks.length == 0,
          'h-[400px]': bookmarks.length > 0,
        }"
      >
        <bookmarks-scroll
          v-if="bookmarks.length > 0"
          :list="bookmarks"
        />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
