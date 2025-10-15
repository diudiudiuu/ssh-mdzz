import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import Dashboard from '@/views/Dashboard.vue'
import Setup from '@/views/Setup.vue'
import Settings from '@/views/Settings.vue'

const routes = [
  {
    path: '/',
    name: 'Dashboard',
    component: Dashboard,
    meta: { requiresAuth: true }
  },
  {
    path: '/setup',
    name: 'Setup',
    component: Setup
  },
  {
    path: '/settings',
    name: 'Settings',
    component: Settings,
    meta: { requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

// 路由守卫
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 如果应用还未初始化，等待初始化完成
  if (!authStore.isInitialized) {
    try {
      await authStore.initializeApp()
    } catch (error) {
      console.error('应用初始化失败:', error)
    }
  }
  
  // 检查是否需要认证
  if (to.meta.requiresAuth) {
    if (!authStore.isAuthenticated) {
      // 未认证，重定向到设置页面
      next('/setup')
      return
    }
  }
  
  // 如果已认证但访问设置页面，重定向到首页
  if (to.name === 'Setup' && authStore.isAuthenticated) {
    next('/')
    return
  }
  
  next()
})

export default router