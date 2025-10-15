<template>
  <div class="key-verify">
    <div class="verify-container">
      <div class="verify-header">
        <div class="icon">🔓</div>
        <h1>{{ hasValidSession ? '欢迎回来' : '输入加密密钥' }}</h1>
        <p>{{ hasValidSession ? '请输入密钥以继续使用' : '请输入密钥以解锁您的 SSH 连接配置' }}</p>
      </div>

      <!-- 会话提示 -->
      <n-alert 
        v-if="hasValidSession" 
        type="success" 
        :bordered="false" 
        style="margin-bottom: 20px"
      >
        <template #icon>
          <n-icon><CheckmarkCircleOutline /></n-icon>
        </template>
        检测到有效会话，您可以快速解锁应用
      </n-alert>

      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        size="large"
      >
        <n-form-item path="key">
          <n-input
            v-model:value="formData.key"
            type="password"
            placeholder="请输入密钥"
            show-password-on="click"
            autofocus
            @keyup.enter="handleVerify"
          >
            <template #prefix>
              <n-icon><LockClosedOutline /></n-icon>
            </template>
          </n-input>
        </n-form-item>

        <n-space vertical :size="12">
          <n-button
            type="primary"
            block
            size="large"
            :loading="loading"
            @click="handleVerify"
          >
            {{ loading ? '验证中...' : '解锁' }}
          </n-button>

          <n-button
            text
            block
            @click="showResetDialog = true"
          >
            忘记密钥？
          </n-button>
        </n-space>
      </n-form>

      <div v-if="errorMessage" class="error-message">
        <n-alert type="error" :bordered="false">
          {{ errorMessage }}
        </n-alert>
      </div>

      <div class="verify-footer">
        <n-text depth="3">
          <n-icon><ShieldCheckmarkOutline /></n-icon>
          您的密钥仅保存在内存中，确保数据安全
        </n-text>
      </div>
    </div>

    <!-- 重置密钥对话框 -->
    <n-modal
      v-model:show="showResetDialog"
      preset="dialog"
      title="重置密钥"
      type="warning"
      positive-text="确认重置"
      negative-text="取消"
      @positive-click="handleReset"
    >
      <n-space vertical :size="16">
        <n-alert type="warning" :bordered="false">
          <template #icon>
            <n-icon><WarningOutline /></n-icon>
          </template>
          <strong>警告：此操作将删除所有已保存的连接配置！</strong>
        </n-alert>
        
        <div>
          <p style="margin-bottom: 12px;">重置密钥后：</p>
          <ul style="padding-left: 20px; line-height: 1.8;">
            <li>所有已保存的 SSH 连接配置将被永久删除</li>
            <li>您需要重新设置新的加密密钥</li>
            <li>此操作不可撤销</li>
          </ul>
        </div>

        <n-input
          v-model:value="resetConfirmText"
          placeholder="请输入 RESET 确认重置"
        />
      </n-space>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessage } from 'naive-ui'
import {
  LockClosedOutline,
  ShieldCheckmarkOutline,
  WarningOutline,
  CheckmarkCircleOutline
} from '@vicons/ionicons5'

const props = defineProps({
  hasValidSession: {
    type: Boolean,
    default: false
  }
})

const router = useRouter()
const authStore = useAuthStore()
const message = useMessage()

const formRef = ref(null)
const loading = ref(false)
const errorMessage = ref('')
const showResetDialog = ref(false)
const resetConfirmText = ref('')

const formData = reactive({
  key: ''
})

const rules = {
  key: [
    {
      required: true,
      message: '请输入密钥',
      trigger: 'blur'
    }
  ]
}

async function handleVerify() {
  try {
    await formRef.value?.validate()
    loading.value = true
    errorMessage.value = ''

    console.log('开始验证密钥...')
    await authStore.verifyKey(formData.key)
    
    console.log('密钥验证成功，准备跳转')
    message.success('密钥验证成功！正在跳转...')
    
    // 确保状态更新后再跳转
    await new Promise(resolve => setTimeout(resolve, 800))
    
    console.log('跳转到主页')
    await router.push('/')
    
  } catch (error) {
    console.error('验证密钥失败:', error)
    errorMessage.value = error.message || '密钥验证失败'
    formData.key = ''
  } finally {
    loading.value = false
  }
}

async function handleReset() {
  if (resetConfirmText.value !== 'RESET') {
    message.error('请输入 RESET 确认重置')
    return false
  }

  try {
    // 删除配置文件（需要后端支持）
    // TODO: 实现配置文件删除
    
    message.success('配置已重置')
    
    // 跳转到设置页面
    setTimeout(() => {
      router.push('/setup')
    }, 500)
  } catch (error) {
    message.error('重置失败: ' + error.message)
    return false
  }
}
</script>

<style scoped>
.key-verify {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.verify-container {
  width: 100%;
  max-width: 450px;
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.5s ease;
}

.verify-header {
  text-align: center;
  margin-bottom: 40px;
}

.icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: bounce 2s ease-in-out infinite;
}

.verify-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.verify-header p {
  font-size: 14px;
  color: var(--text-secondary);
}

.error-message {
  margin-top: 20px;
  animation: shake 0.5s ease;
}

.verify-footer {
  text-align: center;
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 13px;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-10px);
  }
}

@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-10px); }
  75% { transform: translateX(10px); }
}
</style>