import { createApp } from 'vue'
import App from './App.vue'
import './styles/tokens.css'
import './styles/base.css'
import './styles/scroll.css'
import './styles/ornaments.css'
import './styles/cursor.css'
import './styles/portrait.css'

// 首屏 HTML（山门主张）由 Vue 同步渲染，不等 WebGL 初始化。
// 3D 场景在 App.vue 里动态 import，保证赶时间的访客先看到主张与文字索引。
createApp(App).mount('#app')
