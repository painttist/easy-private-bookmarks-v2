import { BookMarkInfo } from './lib'

export const passwordKey = Symbol() as InjectionKey<{
  lockHash: Ref<string>
  unlockPassword: Ref<string>
}>

export const manageBookmarkKey = Symbol() as InjectionKey<{
  openFolder: (id: string) => void
  closeFolder: (id: string) => void
  updateBookmark: (newNode: BookMarkInfo) => Promise<void>
  deleteBookmark: (id: string) => void
}>
