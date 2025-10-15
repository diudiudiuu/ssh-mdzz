import { createApp } from 'vue'
import { createPinia } from 'pinia'
import naive from 'naive-ui'
import router from './router'
import App from './App.vue'

// 导入全局样式
import './assets/styles/main.css'
import './assets/styles/naive-ui-overrides.css'
import './style.css'
import 'xterm/css/xterm.css'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(naive)

app.mount('#app')