<template>
  <div class="key-verify">
    <div class="verify-container">
      <div class="verify-header">
        <div class="icon">🔓</div>
        <h1>{{ hasValidSession ? '欢迎回来' : '解锁应用' }}</h1>
        <p>{{ hasValidSession ? '检测到有效会话，请输入密钥以继续使用' : '请输入您的加密密钥以访问 SSH 连接配置' }}</p>
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
            placeholder="请输入您的加密密钥"
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
    
    console.log('密钥验证成功')
    message.success('密钥验证成功！')
    
    // 清除表单数据（安全考虑）
    formData.key = ''
    
    // App.vue 会自动检测到 isAuthenticated 变化并切换到主应用
    // 不需要手动路由跳转
    
  } catch (error) {
    console.error('验证密钥失败:', error)
    errorMessage.value = error.message || '密钥验证失败，请检查密钥是否正确'
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
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--bg-primary) 0%, #0a0a0e 100%);
  position: relative;
  
  /* macOS 安全区域适配 */
  padding-top: max(var(--spacing-lg), var(--safe-area-inset-top));
  padding-left: max(var(--spacing-lg), var(--safe-area-inset-left));
  padding-right: max(var(--spacing-lg), var(--safe-area-inset-right));
  padding-bottom: max(var(--spacing-lg), var(--safe-area-inset-bottom));
  
  /* 确保内容不被系统 UI 遮挡 */
  min-height: calc(100vh - var(--safe-area-inset-top) - var(--safe-area-inset-bottom));
}

.key-verify::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 70% 30%, rgba(24, 160, 88, 0.08) 0%, transparent 50%),
              radial-gradient(circle at 30% 70%, rgba(32, 128, 240, 0.06) 0%, transparent 50%);
  pointer-events: none;
}

.verify-container {
  width: 100%;
  max-width: 480px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: var(--radius-xl);
  padding: var(--spacing-2xl) var(--spacing-xl);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(20px);
  position: relative;
  z-index: 1;
}

.verify-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-radius: var(--radius-xl);
  pointer-events: none;
}

.verify-header {
  text-align: center;
  margin-bottom: var(--spacing-xl);
  position: relative;
  z-index: 1;
}

.icon {
  font-size: 72px;
  margin-bottom: var(--spacing-lg);
  display: inline-block;
  background: linear-gradient(135deg, #18a058 0%, #36ad6a 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  filter: drop-shadow(0 2px 4px rgba(24, 160, 88, 0.3));
  animation: bounce 3s ease-in-out infinite;
}

.verify-header h1 {
  font-size: var(--font-size-3xl);
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: var(--spacing-md);
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, var(--text-primary) 0%, rgba(255, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.verify-header p {
  font-size: var(--font-size-md);
  color: var(--text-secondary);
  line-height: var(--line-height-relaxed);
  max-width: 380px;
  margin: 0 auto;
}

.error-message {
  margin-top: var(--spacing-lg);
  animation: shake 0.5s ease;
}

.verify-footer {
  text-align: center;
  margin-top: var(--spacing-xl);
  padding-top: var(--spacing-lg);
  border-top: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-sm);
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  position: relative;
  z-index: 1;
}

.verify-footer .n-icon {
  color: var(--success-color);
  font-size: 16px;
}

/* 表单样式增强 */
:deep(.n-form-item) {
  margin-bottom: var(--spacing-lg);
}

:deep(.n-input) {
  border-radius: var(--radius-md);
  transition: all var(--transition-normal);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
}

:deep(.n-input:hover) {
  border-color: var(--border-hover);
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.08);
}

:deep(.n-input.n-input--focus) {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(24, 160, 88, 0.15);
}

:deep(.n-button) {
  border-radius: var(--radius-md);
  font-weight: 600;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

:deep(.n-button--primary) {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-hover) 100%);
  border: none;
  box-shadow: 0 4px 12px rgba(24, 160, 88, 0.3);
}

:deep(.n-button--primary:hover) {
  background: linear-gradient(135deg, var(--primary-color-hover) 0%, #4db87a 100%);
  box-shadow: 0 6px 16px rgba(24, 160, 88, 0.4);
  transform: translateY(-1px);
}

:deep(.n-button--primary:active) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(24, 160, 88, 0.3);
}

:deep(.n-button[text]) {
  color: var(--text-secondary);
  transition: all var(--transition-normal);
}

:deep(.n-button[text]:hover) {
  color: var(--primary-color);
  background: rgba(24, 160, 88, 0.05);
}

:deep(.n-alert) {
  border-radius: var(--radius-md);
  backdrop-filter: blur(10px);
  border: 1px solid;
}

:deep(.n-alert--success) {
  border-color: rgba(24, 160, 88, 0.2);
  background: rgba(24, 160, 88, 0.05);
}

:deep(.n-alert--error) {
  border-color: rgba(208, 48, 80, 0.2);
  background: rgba(208, 48, 80, 0.05);
}

:deep(.n-alert--warning) {
  border-color: rgba(240, 160, 32, 0.2);
  background: rgba(240, 160, 32, 0.05);
}

/* 模态框样式 */
:deep(.n-modal .n-card) {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  border-radius: var(--radius-xl);
  backdrop-filter: blur(20px);
}

:deep(.n-modal .n-card .n-card-header) {
  border-bottom: 1px solid var(--border-color);
  padding: var(--spacing-lg) var(--spacing-xl) var(--spacing-md);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-radius: var(--radius-xl) var(--radius-xl) 0 0;
}

:deep(.n-modal .n-card .n-card-content) {
  padding: var(--spacing-xl);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .key-verify {
    padding: var(--spacing-md);
  }
  
  .verify-container {
    padding: var(--spacing-xl) var(--spacing-lg);
  }
  
  .icon {
    font-size: 56px;
  }
  
  .verify-header h1 {
    font-size: var(--font-size-2xl);
  }
  
  .verify-header p {
    font-size: var(--font-size-sm);
  }
  
  :deep(.n-modal .n-card) {
    margin: var(--spacing-md);
    width: calc(100vw - 32px);
    max-width: none;
  }
}

/* 动画增强 */
.verify-container {
  animation: fadeInUp 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(30px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes bounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-8px);
  }
}

@keyframes shake {
  0%, 100% { 
    transform: translateX(0); 
  }
  10%, 30%, 50%, 70%, 90% { 
    transform: translateX(-4px); 
  }
  20%, 40%, 60%, 80% { 
    transform: translateX(4px); 
  }
}

/* 加载状态优化 */
:deep(.n-button--loading) {
  position: relative;
}

:deep(.n-button--loading::after) {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(100%);
  }
}
</style>