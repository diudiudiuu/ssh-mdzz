<template>
  <div class="key-setup-page">
    <div class="setup-container">
      <div class="setup-header">
        <div class="icon">🔐</div>
        <h1>设置加密密钥</h1>
        <p>为了保护您的 SSH 连接信息安全，请设置一个加密密钥</p>
      </div>

      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        size="large"
        label-placement="top"
      >
        <n-form-item path="key" style="margin-bottom: 32px;">
          <n-input
            v-model:value="formData.key"
            type="password"
            placeholder="请输入密钥（至少 6 个字符）"
            show-password-on="click"
            size="large"
            style="height: 48px; font-size: 16px;"
            @keyup.enter="handleSetup"
          />
        </n-form-item>

        <n-form-item path="confirmKey" style="margin-bottom: 40px;">
          <n-input
            v-model:value="formData.confirmKey"
            type="password"
            placeholder="请再次输入密钥"
            show-password-on="click"
            size="large"
            style="height: 48px; font-size: 16px;"
            @keyup.enter="handleSetup"
          />
        </n-form-item>

        <n-button
          type="primary"
          block
          size="large"
          :loading="loading"
          :disabled="!isFormValid"
          style="height: 48px; font-size: 16px; margin-top: 20px;"
          @click="handleSetup"
        >
          {{ loading ? '设置中...' : '完成设置' }}
        </n-button>
      </n-form>

      <div class="setup-footer">
        <n-text depth="3">
          <n-icon><ShieldCheckmarkOutline /></n-icon>
          设置完成后，您就可以开始添加和管理 SSH 连接了
        </n-text>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMessage } from 'naive-ui'
import { 
  LockClosedOutline, 
  InformationCircleOutline,
  ShieldCheckmarkOutline
} from '@vicons/ionicons5'

const authStore = useAuthStore()
const message = useMessage()

const formRef = ref(null)
const loading = ref(false)

const formData = reactive({
  key: '',
  confirmKey: ''
})

const rules = {
  key: [
    {
      required: true,
      message: '请输入密钥',
      trigger: 'blur'
    },
    {
      min: 6,
      message: '密钥长度至少为 6 个字符',
      trigger: 'blur'
    }
  ],
  confirmKey: [
    {
      required: true,
      message: '请确认密钥',
      trigger: 'blur'
    },
    {
      validator: (rule, value) => {
        return value === formData.key
      },
      message: '两次输入的密钥不一致',
      trigger: ['blur', 'input']
    }
  ]
}

const isFormValid = computed(() => {
  return formData.key.length >= 6 && 
         formData.confirmKey === formData.key
})

async function handleSetup() {
  try {
    await formRef.value?.validate()
    loading.value = true
    await authStore.setKey(formData.key)
    message.success('密钥设置成功！')
    formData.key = ''
    formData.confirmKey = ''
  } catch (error) {
    message.error(error?.message || '设置密钥失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.key-setup-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: var(--bg-primary);
  padding-top: max(40px, var(--safe-area-inset-top));
  padding-left: max(40px, var(--safe-area-inset-left));
  padding-right: max(40px, var(--safe-area-inset-right));
  padding-bottom: max(40px, var(--safe-area-inset-bottom));
  min-height: calc(100vh - var(--safe-area-inset-top) - var(--safe-area-inset-bottom));
}

.key-setup-page::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 30% 20%, rgba(24, 160, 88, 0.1) 0%, transparent 50%),
              radial-gradient(circle at 70% 80%, rgba(32, 128, 240, 0.08) 0%, transparent 50%);
  pointer-events: none;
}

.setup-container {
  width: 100%;
  max-width: 800px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 60px;
  box-shadow: var(--shadow-lg);
}

.setup-container::before {
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

.setup-header {
  text-align: center;
  margin-bottom: 60px;
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
  animation: pulse 3s ease-in-out infinite;
}

.setup-header h1 {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.setup-header p {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 auto;
}



.setup-footer {
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

.setup-footer .n-icon {
  color: var(--success-color);
  font-size: 16px;
}

/* 表单样式增强 */
:deep(.n-form-item) {
  margin-bottom: 32px;
}

:deep(.n-form-item-blank) {
  min-height: 24px;
}

:deep(.n-form-item-label) {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
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

:deep(.n-button--primary:hover:not(.n-button--disabled)) {
  background: linear-gradient(135deg, var(--primary-color-hover) 0%, #4db87a 100%);
  box-shadow: 0 6px 16px rgba(24, 160, 88, 0.4);
  transform: translateY(-1px);
}

:deep(.n-button--primary:active) {
  transform: translateY(0);
  box-shadow: 0 2px 8px rgba(24, 160, 88, 0.3);
}

:deep(.n-button--disabled) {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
  box-shadow: none !important;
}

:deep(.n-alert) {
  border-radius: var(--radius-md);
  border: 1px solid rgba(32, 128, 240, 0.2);
  background: rgba(32, 128, 240, 0.05);
  backdrop-filter: blur(10px);
}

/* 响应式设计 */
@media (max-width: 640px) {
  .key-setup-page {
    padding: var(--spacing-md);
  }
  
  .setup-container {
    padding: var(--spacing-xl) var(--spacing-lg);
  }
  
  .icon {
    font-size: 56px;
  }
  
  .setup-header h1 {
    font-size: var(--font-size-2xl);
  }
  
  .setup-header p {
    font-size: var(--font-size-sm);
  }
  
  .password-strength {
    flex-direction: column;
    align-items: stretch;
    gap: var(--spacing-xs);
  }
  
  .strength-label,
  .strength-text {
    text-align: center;
  }
}

/* 动画增强 */
.setup-container {
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

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
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