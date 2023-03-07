# Easy Private Bookmarks

This is a Chrome extension that allows easy creation and management of password protected bookmarks. The private bookmarks are stored and synced like regular bookmarks and can even be quickly accessed without using the extension interface.

v2 includes complete bookmarks management suite.

If you need any help, please email to painttist@gmail.com or submit an issue on github.

Sorry but we can't help with password recovery.

# FAQ:

Q: I have just updated to version 2.0 and my old locked links can't be recognized or unlocked?

A: Sorry for the inconvenience. Please don't modify those bookmarks. We have fixed the auto migrate bug in version 2.1. After update to version 2.1. Go to the Options page (Right click on the icon -> Options) And then use the Manual Migrate feature to migrate those old links.

# Patch Notes

## v2.1.0
- Complete Bookmark Editing Features
  - Adding Folder
  - Changing Bookmark Title & URL
  - Changing Folder Title
  - Deleting Bookmarks & Folders
- Critical Bug Fixes
- Added Manual Migration
- UI improvements to better display remaining time of temp. key
- Many UX/UI detail improvements

## v2.0.0
- Rewrote from ground up to `revive` the codebase
  - The old codebase refused to compile :/
  - But now I can use great tools to super-charge my workflow :D
- Improves locking safety.
  - The public & private key process wasn't fully implemented, now it is! :D
  - And hence the migration required :/
- Adding Current Tab as Bookmark
- Adds `Peeking`. No more manually decrypting to see the link title!
- Many UI/UX refinements. Better color consistency & read-ability improvements
- Adds Icon (Favicon) preview for all URLs! :D

## v1.0.0
- First version!
- Locking Bookmarks
- Filteirng Bookmarks
- Searching Bookmarks





# Project Setups

## Install
```
pnpm install
```

### Compiles and hot-reloads for development
```
pnpm run dev
```

### Compiles and minifies for production
```
pnpm run build
```
