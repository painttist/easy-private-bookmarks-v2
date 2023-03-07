import {
  generateEncryptedPrivateKeyPair,
  isLockedURL,
  BookmarkStoreInfo,
  getEncryptedLink,
  isLockedURLv1,
} from './lib'
import { decryptFragment } from './link'

export async function getKeyPair() {
  let data = await chrome.storage.sync.get([
    'jwkPublicKey',
    'encryptedPrivateKey',
  ])
  let jwkPublicKey = data['jwkPublicKey']
  let encryptedPrivateKey = data['encryptedPrivateKey']

  if (jwkPublicKey && encryptedPrivateKey) {
    return {
      jwkPublicKey: jwkPublicKey,
      encryptedPrivateKey: encryptedPrivateKey,
    }
  } else {
    return undefined
  }
}

export async function removeKeyPair() {
  await chrome.storage.sync.remove(['jwkPublicKey', 'encryptedPrivateKey'])
}

export async function storeKeyPair(
  publicKey: string | JsonWebKey,
  privateKey: string
) {
  if (typeof publicKey === 'string') {
    await chrome.storage.sync.set({ jwkPublicKey: publicKey })
  } else {
    await chrome.storage.sync.set({ jwkPublicKey: JSON.stringify(publicKey) })
  }
  // Save the jwt public key to storage
  // Save the encrypted private key to storage
  await chrome.storage.sync.set({ encryptedPrivateKey: privateKey })
}

export async function migrateWithPassword(lockPassword: string) {
  let bookmarksTree = await chrome.bookmarks.getTree()

  let keyPair = await getKeyPair()

  if (!keyPair) {
    keyPair = await generateEncryptedPrivateKeyPair(lockPassword)
    await storeKeyPair(keyPair.jwkPublicKey, keyPair.encryptedPrivateKey)
  }

  if (!keyPair) {
    throw new Error('Failed to generate key pair')
  }

  let countLockedURL = 0
  let countUnlockSuccess = 0
  let countUpdated = 0

  const updateTreeFromV1 = async (
    tree: chrome.bookmarks.BookmarkTreeNode[]
  ) => {
    for (let node of tree) {
      if (node.children) {
        // Recurse
        await updateTreeFromV1(node.children)
      }
      if (!node.url) {
        // Folder
        continue
      }
      if (isLockedURLv1(node.url)) {
        let url = new URL(node.url)
        countLockedURL += 1
        let output
        try {
          output = await decryptFragment(url, lockPassword)
        } catch (error) {
          console.log('Decrypt Fragment Failed', error)
        }
        if (output) {
          countUnlockSuccess += 1
          // let url = output.decrypted
          let data: BookmarkStoreInfo = {
            url: output.decrypted,
            title: output.hint,
          }

          // console.log('Decrypted', url)

          let newLink
          try {
            newLink = await getEncryptedLink(data, keyPair?.jwkPublicKey)
          } catch (error) {
            console.log('Get Encrypted Link Failed', error)
          }

          if (newLink) {
            console.log('New Link', newLink)
            countUpdated += 1
            await chrome.bookmarks.update(node.id, {
              url: newLink,
            })
          }
        }
      }
    }
  }

  let bookmarks = bookmarksTree?.[0]?.children?.[0]?.children

  if (bookmarks) {
    // console.log('Bookmarks tree: ', bookmarks)
    await updateTreeFromV1(bookmarks)
    console.log(
      'Processed',
      countLockedURL,
      ' | Success: ',
      countUnlockSuccess,
      ' | Updated: ',
      countUpdated
    )
  }

  return {
    countLockedURL,
    countUnlockSuccess,
    countUpdated,
  }
}

export async function migrate() {
  // try get v1 stored plain password
  let data = await chrome.storage.sync.get('lock-password')
  let lockPassword = data['lock-password']
  if (lockPassword) {
    console.log('Migrating from v1')

    migrateWithPassword(lockPassword)

    // remove the v1 stored plain password
    await chrome.storage.sync.remove('lock-password')
  }
}
