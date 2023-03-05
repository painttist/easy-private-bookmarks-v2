<template>
  <!-- <button @click="handleScrollTo(100)">Scroll to 100</button> -->
  <div>
    <recycle-scroller
      class="scrollbar h-[400px] pr-1.5"
      :items="list"
      ref="scrollerRef"
      :item-size="30"
      key-field="id"
      v-slot="{ item }"
    >
      <!-- <div>
        {{ item.title }}
      </div> -->
      <bookmarks-link :node="item"></bookmarks-link>
    </recycle-scroller>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  list: chrome.bookmarks.BookmarkTreeNode[]
}>()

const scrollerRef = ref<any>(null)

function handleScrollTo(index: number) {
  scrollerRef.value.scrollToItem(index)
}
</script>
