import OpenCrypto from 'opencrypto'

// Initialize new OpenCrypto instance
const crypt = new OpenCrypto()

export type BookmarkInfo = {
  title: string
  url: string | undefined
  id: string
}

export type BookmarkProcessedInfo = {
  title: string
  url: string | undefined
  level: number
  id: string
  open: boolean
}

export type BookmarkStoreInfo = {
  title: string
  url: string
}

export async function generateEncryptedPrivateKeyPair(password: string) {
  // Generate a new RSA key pair
  let keyPair = await crypt.getRSAKeyPair(
    2048,
    'SHA-512',
    'RSA-OAEP',
    ['encrypt', 'decrypt'],
    true
  )
  let encryptedPrivateKey = await crypt.encryptPrivateKey(
    keyPair.privateKey,
    password,
    64000,
    'SHA-512',
    'AES-GCM',
    256
  )

  let jwkPublicKey = await window.crypto.subtle.exportKey(
    'jwk',
    keyPair.publicKey
  )

  return {
    encryptedPrivateKey,
    jwkPublicKey,
  }
}

export async function getEncryptedLink(
  data: BookmarkStoreInfo,
  jwkPublicKey: string | undefined
) {
  return (
    baseURL +
    urlSupportIdentifier +
    '#' +
    (await encryptData(data, jwkPublicKey))
  )
}

async function encryptData(
  data: BookmarkStoreInfo,
  jwkPublicKey: string | undefined
) {
  let dataString = JSON.stringify(data)
  let dataArray = new TextEncoder().encode(dataString)

  let jwk
  if (!jwkPublicKey) {
    // get the jwt public key from storage
    let storedJwkPublicKey = await chrome.storage.sync.get(['jwkPublicKey'])

    if (!storedJwkPublicKey.jwkPublicKey) {
      throw new Error('No jwk public key found in storage')
    }
    jwk = JSON.parse(storedJwkPublicKey.jwkPublicKey)
  } else {
    jwk = JSON.parse(jwkPublicKey)
  }

  // console.log(jwk)

  // convert the stored jwk public key to CryptoKey
  let publicKey = await window.crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-512',
    },
    true,
    ['encrypt']
  )
  return await crypt.rsaEncrypt(publicKey, dataArray)
}

export async function decryptData(
  encryptedData: string,
  password: string,
  encryptedPrivateKey: string | undefined
) : Promise<BookmarkStoreInfo> {
  let privateKey

  if (encryptedPrivateKey) {
    privateKey = encryptedPrivateKey
  } else {
    let storedEncryptedPrivateKey = await chrome.storage.sync.get([
      'encryptedPrivateKey',
    ])

    if (!storedEncryptedPrivateKey.encryptedPrivateKey) {
      throw new Error('No encrypted private key found in storage')
    }

    privateKey = storedEncryptedPrivateKey.encryptedPrivateKey
  }

  // decrypt the stored private key
  let decryptedPrivateKey = await crypt.decryptPrivateKey(
    privateKey,
    password,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-512',
      usages: ['decrypt', 'unwrapKey'],
      isExtractable: true,
    }
  )

  let decryptedData = await crypt.rsaDecrypt(decryptedPrivateKey, encryptedData)

  return JSON.parse(new TextDecoder().decode(decryptedData))
}

export function processNodes(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  filter: string,
  filterLocked: boolean
) {
  const getNodes = (
    result: chrome.bookmarks.BookmarkTreeNode[],
    object: chrome.bookmarks.BookmarkTreeNode
  ) => {
    let lockFilterCondition = filterLocked
      ? object.url && isLockedURL(object.url)
      : true
    if (
      object.title &&
      object.title.toLowerCase().includes(filter.toLowerCase()) &&
      lockFilterCondition
    ) {
      // Folder or Link contains filter
      result.push(object)
      return result
    } else if (
      object.url &&
      object.url.toLowerCase().includes(filter.toLowerCase()) &&
      lockFilterCondition
    ) {
      // Link contains filter
      result.push(object)
      return result
    }
    if (Array.isArray(object.children)) {
      // Finds filter out children
      const nodes = object.children.reduce(getNodes, [])
      if (nodes.length) {
        result.push({
          children: nodes,
          title: object.title,
          url: object.url,
          id: object.id,
        })
      }
    }
    return result
  }

  let level = 0
  const getDivs = (
    result: BookmarkProcessedInfo[],
    object: chrome.bookmarks.BookmarkTreeNode
  ) => {
    result.push({
      title: object.title,
      url: object.url,
      level: level,
      id: object.id,
      open: true,
    })

    if (Array.isArray(object.children)) {
      level += 1
      const divs = object.children.reduce(getDivs, [])
      // console.log("Children divs", divs)
      result.push(...divs)
      level -= 1
    }
    return result
  }

  let filtered = nodes.reduce(getNodes, [])
  let divs = filtered.reduce(getDivs, [])

  return divs
}

export const DEFAULT_KEYTIMEOUT = 120000

export const urlSupportIdentifier = '?for=easy-private-bookmark'

export const baseURL = chrome.runtime.getURL('options.html')

export function generateNewURLFromFrag(frag: string) {
  return baseURL + urlSupportIdentifier + '#' + frag
}

export function isLockedURL(url: string) {
  return (
    url.includes(urlSupportIdentifier) ||
    (url.includes(baseURL) && url.includes('#')) ||
    (url.includes('chrome-extension://') && url.includes('options.html#'))
  )
}

export async function generateHashForPassword(password: string) {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const buffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(buffer)) // convert buffer to byte array
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('') // convert bytes to hex string
  return hashHex
}

const convertArrayBufferToNumber = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  const dv = new DataView(bytes.buffer)
  return dv.getUint16(0, true)
}
