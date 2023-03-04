<script setup lang="ts">
// const bookmarks = ref<chrome.bookmarks.BookmarkTreeNode[]>([])

import { manageBookmarkKey } from '../api/injectkeys'
import { migrate, getKeyPair, removeKeyPair, storeKeyPair } from '../api/keys'
import {
  BookmarkInfo,
  DEFAULT_KEYTIMEOUT,
  decryptData,
  getEncryptedLink,
  generateEncryptedPrivateKeyPair,
  processNodes,
  BookmarkProcessedInfo,
  decryptKey,
} from '../api/lib'

const bookmarks = ref<BookmarkProcessedInfo[]>([])
const rawInfo = ref<chrome.bookmarks.BookmarkTreeNode[] | undefined>(undefined)

const elmInput = ref<HTMLInputElement | null>(null)

const searchQuery = ref('')
const filtering = ref(false)

chrome.bookmarks.getTree((tree) => {
  rawInfo.value = tree?.[0]?.children?.[0]?.children
  if (rawInfo.value) {
    bookmarks.value = processNodes(rawInfo.value, '', filtering.value)
  }
})

const publickKey = ref('')
const privateKeyEncrypted = ref('')

const isLockEmpty = computed(() => {
  return !privateKeyEncrypted.value || !publickKey.value
})

const unloackPassword = ref('')

const isPasswordEmpty = computed(() => {
  return !unloackPassword.value
})

enum Modals {
  None,
  Lock,
  Unlock,
  Retry,
  WarnRemoveLock,
  WarnDeleteKey,
}

const activeModal = ref(Modals.None)

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

  if (isLockEmpty.value) {
    activeModal.value = Modals.Lock
    return
  }

  try {
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
  } catch (error) {
    console.log("Couldn't lock bookmark", error)
  }
}

const peakBookmark = async (info: BookmarkInfo) => {
  if (!info.url) return

  if (isLockEmpty.value) {
    activeModal.value = Modals.Unlock
    return
  }

  let storedInfo = await decryptLockedLinkv2(
    info.url,
    unloackPassword.value,
    privateKeyEncrypted.value
  )

  if (!storedInfo) return

  updateBookmark({
    id: info.id,
    title: storedInfo.title,
    url: storedInfo.url,
  })
}

const unlockBookmarkResolve: any = ref(null)

const unlockBookmark = async (info: BookmarkInfo) => {
  if (!info.url) return

  console.log("Unlock Bookmark")

  console.log('isPasswordEmpty.value', isPasswordEmpty.value)

  let result = true
  if (isPasswordEmpty.value) {
    activeModal.value = Modals.Unlock
    let p = new Promise<boolean>((resolve) => {
      if (unlockBookmarkResolve.value !== null)
        unlockBookmarkResolve.value(false)
      console.log('resolve', resolve)
      unlockBookmarkResolve.value = resolve
    })
    console.log("Promise!", p)
    result = await p
  }
  if (result === false) return

  try {
    let storedInfo = await decryptLockedLinkv2(
      info.url,
      unloackPassword.value,
      privateKeyEncrypted.value
    )

    if (!storedInfo) return

    updateBookmark({
      id: info.id,
      title: storedInfo.title,
      url: storedInfo.url,
    })
  } catch (error) {
    console.log('Cannot decrypt bookmark')
    activeModal.value = Modals.Retry
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

// MODALS RELATED

async function verifyPassword(password: string): Promise<boolean> {
  let encryptedPrivateKey = privateKeyEncrypted.value
  if (encryptedPrivateKey === '' || password === '') {
    return false
  }
  try {
    await decryptKey(encryptedPrivateKey, password)
    updateUnlockPassword(password, true)
    return true
  } catch (error) {
    console.log('Cannot decrypt private key [retry]')
    return false
  }
}

async function verifyRetryPassword(password: string) {
  let success = await verifyPassword(password)
  if (success) {
    clearModal()
  } else {
    activeModal.value = Modals.Retry
  }
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

function handleBtnKeyClick() {

  if (unlockBookmarkResolve.value !== null)
    unlockBookmarkResolve.value(false)

  if (isPasswordEmpty.value) {
    activeModal.value = Modals.Unlock
  } else {
    activeModal.value = Modals.WarnDeleteKey
  }
}

async function updateUnlockPassword(
  newPassword: string,
  updateChrome: boolean
) {
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

  if (unlockBookmarkResolve.value !== null) {
    console.log('Trying to resolve')
    unlockBookmarkResolve.value(true)
    unlockBookmarkResolve.value = null
  } else {
    console.log('Resolve Value:', unlockBookmarkResolve.value)
  }
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
    } else if (expireTime > Date.now()) {
      // The key is still ok
      chrome.storage.local.get('unlock-password', (data) => {
        let lockPassword = data['unlock-password']
        if (lockPassword) updateUnlockPassword(lockPassword, false)
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
    :opened="activeModal == Modals.Lock"
    :message="'One-time Lock Setup'"
    :requiresConfirm="true"
    :inputPlaceholders="['Set a password', 'Confirm']"
    @panel-confirm="setNewPassword($event, true).then(clearModal)"
    @panel-close="clearModal"
  >
  </modal-password>
  <modal-password
    :opened="activeModal == Modals.Unlock"
    :message="'Enter Password'"
    :requiresConfirm="false"
    :inputPlaceholders="['password']"
    @panel-confirm="
      verifyPassword($event).then((success) =>
        success ? clearModal() : (activeModal = Modals.Retry)
      )
    "
    @panel-close="clearModal"
  >
  </modal-password>
  <modal-password
    :opened="activeModal == Modals.Retry"
    :message="'Password Incorrect'"
    :requiresConfirm="false"
    :inputPlaceholders="['password']"
    @panel-confirm="verifyRetryPassword"
    @panel-close="clearModal"
  >
  </modal-password>
  <modal-warning
    :opened="activeModal == Modals.WarnRemoveLock"
    :isDanger="true"
    :title="'Remove Lock?'"
    :message="`- Locked bookmarks will be lost!
- The same password won't unlock again.
- Please unlock all bookmarks first to keep them`"
    @panel-confirm="setNewPassword('', true).then(clearModal)"
    @panel-close="clearModal"
  >
  </modal-warning>
  <modal-warning
    :opened="activeModal == Modals.WarnDeleteKey"
    :isDanger="false"
    :title="'Delete Tempary Key?'"
    :message="`Key will automatically be deleted after ${
      DEFAULT_KEYTIMEOUT / 1000
    } seconds. Confirm to delete now?`"
    @panel-confirm="updateUnlockPassword('', true).then(clearModal)"
    @panel-close="clearModal"
  >
  </modal-warning>
  <div class="p-2 bg-gray-100 w-full">
    <div class="w-full flex gap-2">
      <button
        :title="`${isLockEmpty ? 'Add Lock' : 'Remove Lock'}`"
        class="p-2 text-base rounded transition-colors"
        :class="{
          'bg-blue-200 text-blue-600 hover:text-blue-800': isLockEmpty,
          'bg-purple-200 text-purple-600 hover:text-purple-800': !isLockEmpty,
        }"
        @click="
          isLockEmpty
            ? (activeModal = Modals.Lock)
            : (activeModal = Modals.WarnRemoveLock)
        "
      >
        <icon-mdi-lock-open v-if="isLockEmpty" />
        <icon-mdi-lock v-if="!isLockEmpty" />
      </button>
      <button
        :title="
          isPasswordEmpty ? 'Add Tempary Password' : 'Remove Tempary Password'
        "
        class="p-2 text-base rounded transition-colors duration-200"
        :class="{
          'hover:bg-white text-gray-800 hover:text-black': isPasswordEmpty,
          'bg-purple-200 text-purple-900 hover:text-purple-700':
            !isPasswordEmpty,
        }"
        @click="
          handleBtnKeyClick
        "
      >
        <icon-material-symbols-key-off v-if="isPasswordEmpty" />
        <icon-material-symbols-key v-if="!isPasswordEmpty" />
      </button>
      <button
        title="Filter Locked URL"
        class="p-2 text-base rounded transition-colors duration-200"
        :class="{}"
        @click="activeModal = Modals.Unlock"
      >
        <icon-mdi-eye />
      </button>
      <button
        title="Filter Locked URL"
        class="p-2 text-base rounded transition-colors duration-200"
        :class="{}"
        @click=""
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
          'bg-amber-200 hover:text-amber-800 text-amber-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500':
            filtering,
          'hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400':
            !filtering,
        }"
        @click="toggleFilter"
      >
        <icon-material-symbols-filter-alt v-if="filtering" />
        <icon-material-symbols-filter-alt-off v-if="!filtering" />
      </button>
    </div>
    <div class="h-[400px] mt-2">
      <div
        class="transition-vertical ease-[cubic-bezier(0.25, 1, 0.5, 1)] duration-200 overflow-hidden bg-gray-100"
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
