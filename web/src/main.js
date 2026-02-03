import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import 'semantic-ui-css/semantic.min.css'
import './styles/index.scss'

const app = createApp(App)
app.use(createPinia())
app.use(router)
app.mount('#app')
