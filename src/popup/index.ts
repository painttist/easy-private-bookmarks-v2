import { createApp } from 'vue'
import '../assets/base.css'
import './index.css'
import App from './index.vue'
import VueVirtualScroller from 'vue-virtual-scroller'

import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

createApp(App).use(VueVirtualScroller).mount('#app')
