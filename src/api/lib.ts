export type BookMarkInfo = {
  title: string
  url: string | undefined
  level: number
  id: string
  open: boolean
}

export function processNodes(
  nodes: chrome.bookmarks.BookmarkTreeNode[],
  filter: string
) {
  const getNodes = (
    result: chrome.bookmarks.BookmarkTreeNode[],
    object: chrome.bookmarks.BookmarkTreeNode
  ) => {
    if (
      object.title &&
      object.title.toLowerCase().includes(filter.toLowerCase())
    ) {
      result.push(object)
      // console.log("Title Has String in |", object.title);
      return result
    } else if (
      object.url &&
      object.url.toLowerCase().includes(filter.toLowerCase())
    ) {
      result.push(object)
      // console.log("URL Has String in |", object.title);
      return result
    }
    if (Array.isArray(object.children)) {
      // console.log("Start reduce")
      const nodes = object.children.reduce(getNodes, [])
      // console.log("Finished reduce")
      if (nodes.length) {
        // console.log("Object with children added", object.title);
        // console.log("Object reduced children", nodes)
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
    result: BookMarkInfo[],
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

  // console.log('Start reduce')
  const startReduceTime = Date.now()
  let filtered = nodes.reduce(getNodes, [])
  const finishDuration = Date.now() - startReduceTime
  // console.log('Finished in: ', finishDuration, 'ms')
  // console.log(filtered)

  // console.log('Start reduce Divs')
  const startReduceDivTime = Date.now()
  let divs = filtered.reduce(getDivs, [])
  // console.log('Finished in: ', Date.now() - startReduceDivTime, 'ms')
  // console.log(divs)

  return divs
  // return new Promise( ( resolve, reject ) => {
  //   setTimeout( () => resolve( 'success' ), 2000 );
  // } )
  // console.log("Finished Filter", filtered)
  // console.log("Original", array)
  // return filtered;
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
