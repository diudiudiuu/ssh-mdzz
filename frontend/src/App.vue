<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <div id="app">
            <!-- 调试组件 -->
            <AuthDebug v-if="showDebug" />

            <!-- 加载中 -->
            <div v-if="!authStore.isInitialized" class="loading-screen">
              <n-spin size="large" />
              <p>加载中...</p>
            </div>

            <!-- 需要设置密钥（首次使用） -->
            <KeySetupPage v-else-if="needSetup" />

            <!-- 需要验证密钥（已设置密钥，需要输入） -->
            <KeyVerifyPage 
              v-else-if="!authStore.isAuthenticated" 
              :has-valid-session="hasValidSession"
            />

            <!-- 主应用 -->
            <div v-else class="app-container">
              <AppHeader 
                @new-session="handleNewSession"
                @refresh="handleRefresh"
                @toggle-files="handleToggleFiles"
                @toggle-terminal="handleToggleTerminal"
              />
              
              <div class="app-content">
                <div class="main-content">
                  <router-view v-slot="{ Component }">
                    <transition name="fade" mode="out-in">
                      <component :is="Component" />
                    </transition>
                  </router-view>
                </div>
              </div>
            </div>
          </div>
        </n-notification-provider>
      </n-dialog-provider>
    </n-message-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { darkTheme } from 'naive-ui'
import { useAuthStore } from './stores/auth'
import { useConnectionStore } from './stores/connection'
import KeySetupPage from './views/KeySetupPage.vue'
import KeyVerifyPage from './views/KeyVerifyPage.vue'
import AppHeader from './components/layout/AppHeader.vue'
import AuthDebug from './components/debug/AuthDebug.vue'

const authStore = useAuthStore()
const connectionStore = useConnectionStore()

const needSetup = ref(false)
const hasValidSession = ref(false)
const showDebug = ref(false)

// Naive UI 主题配置
const themeOverrides = {
  common: {
    primaryColor: '#18a058',
    primaryColorHover: '#36ad6a',
    primaryColorPressed: '#0c7a43',
    primaryColorSuppl: '#36ad6a',
    errorColor: '#d03050',
    warningColor: '#f0a020',
    successColor: '#18a058',
    infoColor: '#2080f0',
    // 深色主题背景色
    bodyColor: '#101014',
    popoverColor: '#18181c',
    cardColor: '#18181c',
    modalColor: '#18181c',
    baseColor: '#000000',
    inputColor: '#222226',
    // 边框颜色
    borderColor: 'rgba(255, 255, 255, 0.1)',
    dividerColor: 'rgba(255, 255, 255, 0.1)',
    // 文字颜色
    textColorBase: 'rgba(255, 255, 255, 0.85)',
    textColor1: 'rgba(255, 255, 255, 0.85)',
    textColor2: 'rgba(255, 255, 255, 0.65)',
    textColor3: 'rgba(255, 255, 255, 0.45)',
    textColorDisabled: 'rgba(255, 255, 255, 0.25)',
    placeholderColor: 'rgba(255, 255, 255, 0.3)',
    // 圆角
    borderRadius: '8px',
    borderRadiusSmall: '6px',
    // 阴影
    boxShadow1: '0 1px 2px -2px rgba(0, 0, 0, .8), 0 3px 6px 0 rgba(0, 0, 0, .6), 0 5px 12px 4px rgba(0, 0, 0, .4)',
    boxShadow2: '0 3px 6px -4px rgba(0, 0, 0, .8), 0 6px 16px 0 rgba(0, 0, 0, .6), 0 9px 28px 8px rgba(0, 0, 0, .4)',
    boxShadow3: '0 6px 16px -9px rgba(0, 0, 0, .8), 0 9px 28px 0 rgba(0, 0, 0, .6), 0 12px 48px 16px rgba(0, 0, 0, .4)'
  },
  Button: {
    textColor: 'rgba(255, 255, 255, 0.85)',
    textColorHover: 'rgba(255, 255, 255, 0.95)',
    textColorPressed: 'rgba(255, 255, 255, 0.85)',
    textColorFocus: 'rgba(255, 255, 255, 0.95)',
    textColorDisabled: 'rgba(255, 255, 255, 0.25)',
    color: '#28282e',
    colorHover: '#333339',
    colorPressed: '#1e1e22',
    colorFocus: '#333339',
    colorDisabled: '#18181c',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderHover: '1px solid rgba(255, 255, 255, 0.2)',
    borderPressed: '1px solid rgba(255, 255, 255, 0.1)',
    borderFocus: '1px solid rgba(255, 255, 255, 0.2)',
    borderDisabled: '1px solid rgba(255, 255, 255, 0.05)'
  },
  Input: {
    color: '#222226',
    colorFocus: '#28282e',
    colorDisabled: '#18181c',
    textColor: 'rgba(255, 255, 255, 0.85)',
    placeholderColor: 'rgba(255, 255, 255, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderHover: '1px solid rgba(255, 255, 255, 0.2)',
    borderFocus: '1px solid #18a058',
    borderDisabled: '1px solid rgba(255, 255, 255, 0.05)'
  },
  Card: {
    color: '#18181c',
    colorModal: '#18181c',
    colorPopover: '#18181c',
    colorEmbedded: '#222226',
    textColor: 'rgba(255, 255, 255, 0.85)',
    titleTextColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
    actionColor: '#222226'
  }
}

// 工具栏事件处理
function handleNewSession() {
  // 触发新建会话事件，可以通过事件总线或其他方式通知 Dashboard
  console.log('新建会话')
}

function handleRefresh() {
  // 刷新连接列表
  if (authStore.isAuthenticated) {
    connectionStore.loadConnections()
    connectionStore.loadActiveSessions()
  }
}

function handleToggleFiles() {
  // 切换到文件管理视图
  console.log('切换文件管理')
}

function handleToggleTerminal() {
  // 切换到终端视图
  console.log('切换终端')
}

// 监听认证状态变化
watch(() => authStore.isAuthenticated, async (isAuthenticated) => {
  if (isAuthenticated) {
    needSetup.value = false
    await connectionStore.loadConnections()
    await connectionStore.loadActiveSessions()
    connectionStore.startSessionRefresh()
  }
})

onMounted(async () => {
  try {
    console.log('App.vue: 开始初始化应用')
    const status = await authStore.initializeApp()
    console.log('App.vue: 初始化状态:', status)
    
    needSetup.value = status.needSetup
    hasValidSession.value = status.hasValidSession

    console.log('App.vue: 设置状态变量:', {
      needSetup: needSetup.value,
      hasValidSession: hasValidSession.value,
      isAuthenticated: authStore.isAuthenticated
    })

    if (authStore.isAuthenticated) {
      await connectionStore.loadConnections()
      await connectionStore.loadActiveSessions()
      connectionStore.startSessionRefresh()
    }
  } catch (error) {
    console.error('App.vue: 初始化失败:', error)
  }
})
</script>

<style>
.loading-screen {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  background: var(--bg-primary);
  color: var(--text-secondary);
}

.app-container {
  width: 100%;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--bg-primary);
}

.app-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.main-content {
  flex: 1;
  overflow-y: auto;
  background: var(--bg-primary);
}

/* 路由过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>