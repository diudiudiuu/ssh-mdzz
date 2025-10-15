<template>
  <div class="auth-debug">
    <n-card title="认证状态调试" style="margin: 20px;">
      <n-space vertical>
        <div>
          <strong>认证 Store 状态：</strong>
          <pre>{{ JSON.stringify(authState, null, 2) }}</pre>
        </div>
        
        <div>
          <strong>后端状态检查：</strong>
          <n-button @click="checkBackendStatus" :loading="checking">检查后端状态</n-button>
          <pre v-if="backendStatus">{{ JSON.stringify(backendStatus, null, 2) }}</pre>
        </div>
        
        <div>
          <strong>操作：</strong>
          <n-space>
            <n-button @click="forceRecheck">强制重新检查</n-button>
            <n-button @click="clearAll" type="error">清除所有状态</n-button>
          </n-space>
        </div>
      </n-space>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMessage } from 'naive-ui'
import { 
  IsKeySet, 
  HasConfigs,
  HasValidSession,
  ClearSession
} from '@/../wailsjs/go/main/App'

const authStore = useAuthStore()
const message = useMessage()

const checking = ref(false)
const backendStatus = ref(null)

const authState = computed(() => ({
  isInitialized: authStore.isInitialized,
  isAuthenticated: authStore.isAuthenticated,
  hasKey: authStore.hasKey,
  encryptionKeyExists: !!authStore.encryptionKey
}))

async function checkBackendStatus() {
  checking.value = true
  try {
    const keySet = await IsKeySet()
    const hasConfigs = await HasConfigs()
    const hasSession = await HasValidSession()
    
    backendStatus.value = {
      keySet,
      hasConfigs,
      hasSession,
      timestamp: new Date().toISOString()
    }
    
    console.log('调试：后端状态检查结果:', backendStatus.value)
  } catch (error) {
    console.error('调试：后端状态检查失败:', error)
    message.error('后端状态检查失败: ' + error.message)
  } finally {
    checking.value = false
  }
}

async function forceRecheck() {
  try {
    console.log('调试：强制重新检查应用状态')
    const status = await authStore.initializeApp()
    console.log('调试：重新检查结果:', status)
    message.success('重新检查完成')
    await checkBackendStatus()
  } catch (error) {
    console.error('调试：重新检查失败:', error)
    message.error('重新检查失败: ' + error.message)
  }
}

async function clearAll() {
  try {
    console.log('调试：清除所有状态')
    await ClearSession()
    authStore.clearKey()
    message.success('所有状态已清除')
    await checkBackendStatus()
  } catch (error) {
    console.error('调试：清除状态失败:', error)
    message.error('清除状态失败: ' + error.message)
  }
}

// 组件挂载时自动检查
checkBackendStatus()
</script>

<style scoped>
.auth-debug {
  position: fixed;
  top: 10px;
  right: 10px;
  z-index: 9999;
  max-width: 400px;
  max-height: 80vh;
  overflow-y: auto;
}

pre {
  background: var(--bg-tertiary);
  padding: 10px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
  white-space: pre-wrap;
}
</style>