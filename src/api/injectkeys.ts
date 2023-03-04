import { BookmarkInfo } from './lib'

export const manageBookmarkKey = Symbol() as InjectionKey<{
  openFolder: (id: string) => void
  closeFolder: (id: string) => void
  updateBookmark: (newNode: BookmarkInfo) => Promise<void>
  lockBookmark: (info: BookmarkInfo) => Promise<void>
  unlockBookmark: (info: BookmarkInfo) => Promise<void>
  deleteBookmark: (id: string) => void
}>

export const peekInfoKey = Symbol() as InjectionKey<{
  peeking: Ref<boolean>
}>