<template>
  <n-config-provider :theme="darkTheme" :theme-overrides="themeOverrides">
    <n-message-provider>
      <n-dialog-provider>
        <n-notification-provider>
          <div id="app">
            <!-- 加载中 -->
            <div v-if="!authStore.isInitialized" class="loading-screen">
              <n-spin size="large" />
              <p>加载中...</p>
            </div>

            <!-- 需要设置密钥 -->
            <KeySetup v-else-if="needSetup" />

            <!-- 需要验证密钥 -->
            <KeyVerify 
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
import { ref, onMounted, computed } from 'vue'
import { darkTheme } from 'naive-ui'
import { useAuthStore } from './stores/auth'
import { useConnectionStore } from './stores/connection'
import KeySetup from './components/auth/KeySetup.vue'
import KeyVerify from './components/auth/KeyVerify.vue'
import AppHeader from './components/layout/AppHeader.vue'

const authStore = useAuthStore()
const connectionStore = useConnectionStore()

const needSetup = ref(false)
const hasValidSession = ref(false)

// Naive UI 主题配置
const themeOverrides = {
  common: {
    primaryColor: '#18a058',
    primaryColorHover: '#36ad6a',
    primaryColorPressed: '#0c7a43',
    errorColor: '#d03050',
    warningColor: '#f0a020',
    successColor: '#18a058',
    infoColor: '#2080f0'
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

onMounted(async () => {
  try {
    const status = await authStore.initializeApp()
    needSetup.value = status.needSetup
    hasValidSession.value = status.hasValidSession

    console.log('App 初始化状态:', {
      needSetup: needSetup.value,
      hasValidSession: hasValidSession.value,
      isAuthenticated: authStore.isAuthenticated
    })

    // 如果已认证，加载连接列表和活动会话
    if (authStore.isAuthenticated) {
      await connectionStore.loadConnections()
      await connectionStore.loadActiveSessions()
      connectionStore.startSessionRefresh()
    }
  } catch (error) {
    console.error('初始化失败:', error)
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