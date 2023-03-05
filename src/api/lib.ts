import OpenCrypto from 'opencrypto'

// Initialize new OpenCrypto instance
const crypt = new OpenCrypto()

export type BookmarkInfo = {
  title: string
  url: string | undefined
  id: string
  peekState?: PeekState
}

export enum PeekState {
  None,
  Unlocking,
  Peeked,
  Failed,
}

export type BookmarkProcessedInfo = {
  title: string
  url: string | undefined
  level: number
  id: string
  open: boolean
  peekState: PeekState
}

export type BookmarkStoreInfo = {
  title: string
  url: string
}

export async function generateEncryptedPrivateKeyPair(password: string) {
  // Generate a new RSA key pair
  let keyPair = await crypt.getRSAKeyPair(
    4096,
    'SHA-256',
    'RSA-OAEP',
    ['encrypt', 'decrypt'],
    true
  )
  let encryptedPrivateKey = await crypt.encryptPrivateKey(
    keyPair.privateKey,
    password,
    64000,
    'SHA-256',
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
  let fragment = await encryptData(data, jwkPublicKey)
  if (!fragment) {
    return ''
  }
  return baseURL + '#' + fragment
}

async function encryptData(
  data: BookmarkStoreInfo,
  jwkPublicKey: string | undefined
): Promise<string> {
  let dataString = JSON.stringify(data)
  // console.log('Data to encrypt: ', dataString)
  let enc = new TextEncoder()
  let dataArray = enc.encode(dataString)

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
  let publicKey
  try {
    publicKey = await window.crypto.subtle.importKey(
      'jwk',
      jwk,
      {
        name: 'RSA-OAEP',
        hash: 'SHA-256',
      },
      true,
      ['encrypt']
    )
  } catch (error) {
    console.log("Can't import JWK public key")
    return ''
  }

  // console.log('Imported JWK public key', publicKey)

  // let encryptedBuffer
  // try {
  //   // console.log("Is secure context", window.isSecureContext)
  //   encryptedBuffer = await window.crypto.subtle.encrypt(
  //     {
  //       name: 'RSA-OAEP',
  //     },
  //     publicKey,
  //     dataArray
  //   )
  //   console.log('Encryption Successful')
  //   let encryptedString = new TextDecoder().decode(encryptedBuffer)
  // // console.log(encryptedString)
  // } catch (error) {
  //   console.log("Encryption failed", error)
  // }
  return await crypt.rsaEncrypt(publicKey, dataArray)
}

export async function decryptKey(privateKey: string, password: string) {
  return crypt.decryptPrivateKey(privateKey, password, {
    name: 'RSA-OAEP',
    hash: 'SHA-256',
    usages: ['decrypt', 'unwrapKey'],
    isExtractable: true,
  })
}

export async function decryptData(
  encryptedData: string,
  password: string,
  encryptedPrivateKey?: string
): Promise<BookmarkStoreInfo> {
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
  let decryptedPrivateKey = await decryptKey(privateKey, password)

  let decryptedData = await crypt.rsaDecrypt(decryptedPrivateKey, encryptedData)

  return JSON.parse(new TextDecoder().decode(decryptedData))
}

export async function processNodes(
  nodes: readonly chrome.bookmarks.BookmarkTreeNode[],
  filter: string,
  filterLocked: boolean,
  peeking: boolean,
  lockPassword: string,
  privateKey: string,
  peekCache: Map<string, BookmarkStoreInfo | undefined>,
  peekCallBack: (id: string, data: BookmarkStoreInfo | undefined) => void
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
      !filterLocked
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
  let delayNum = 0
  const getDivs = async (
    accum: Promise<BookmarkProcessedInfo[]>,
    object: chrome.bookmarks.BookmarkTreeNode
  ) => {
    let result = await accum
    if (
      peeking &&
      lockPassword &&
      privateKey &&
      object.url &&
      isLockedURL(object.url)
    ) {
      let encryptedData = object.url.split('#')[1]
      if (!encryptedData) {
        return result
      }

      console.log('Peeking', object.url)
      // decrypt the url

      if (peekCache.has(encryptedData)) {
        let decryptedData = peekCache.get(encryptedData)
        if (decryptedData !== undefined) {
          result.push({
            title: decryptedData.title,
            url: decryptedData.url,
            level: level,
            id: object.id,
            open: true,
            peekState: PeekState.Peeked,
          })
          return result
        }
      } else {
        decryptData(encryptedData, lockPassword, privateKey)
          .then(async (decryptedData) => {
            delayNum += 1
            // Slight delay for a cooler effect
            await new Promise((resolve) => setTimeout(resolve, delayNum * 50))
            peekCache.set(encryptedData, decryptedData)
            peekCallBack(object.id, decryptedData)
          })
          .catch((error) => {
            peekCache.set(encryptedData, undefined)
            peekCallBack(object.id, undefined)
            console.log('Error peeking', error)
          })
        result.push({
          title: object.title,
          url: object.url,
          level: level,
          id: object.id,
          open: true,
          peekState: PeekState.Unlocking,
        })
        return result
      }
    }

    result.push({
      title: object.title,
      url: object.url,
      level: level,
      id: object.id,
      open: true,
      peekState: PeekState.None,
    })

    if (Array.isArray(object.children)) {
      level += 1
      const divs = await object.children.reduce(getDivs, Promise.resolve([]))
      // console.log("Children divs", divs)
      result.push(...divs)
      level -= 1
    }
    return result
  }

  let filtered = nodes.reduce(getNodes, [])
  let divs = filtered.reduce(getDivs, Promise.resolve([]))

  return divs
}

export const DEFAULT_KEYTIMEOUT = 120000

// export const urlSupportIdentifier = '?for=easy-private-bookmark'

export const baseURL = chrome.runtime.getURL('/src/options/index.html')

export function generateNewURLFromFrag(frag: string) {
  return baseURL + '#' + frag
}

export function isLockedURL(url?: string) {
  if (!url) return false
  return (
    // url.includes(urlSupportIdentifier) ||
    // (url.includes('chrome-extension://') && url.includes('options.html#'))  ||
    (url.includes(baseURL) && url.includes('#'))
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
