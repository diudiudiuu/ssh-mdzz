<template>
  <div class="key-verify-page">
    <div class="verify-container">
      <div class="verify-header">
        <div class="icon">🔓</div>
        <h1>输入密钥</h1>
        <p>请输入您的加密密钥以访问应用</p>
      </div>

      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        size="large"
      >
        <n-form-item path="key" style="margin-bottom: 40px;">
          <n-input
            v-model:value="formData.key"
            type="password"
            placeholder="请输入您的加密密钥"
            show-password-on="click"
            size="large"
            style="height: 48px; font-size: 16px;"
            autofocus
            @keyup.enter="handleVerify"
          />
        </n-form-item>

        <n-button
          type="primary"
          block
          size="large"
          :loading="loading"
          style="height: 48px; font-size: 16px; margin-top: 20px;"
          @click="handleVerify"
        >
          {{ loading ? '验证中...' : '解锁' }}
        </n-button>
      </n-form>

      <div v-if="errorMessage" class="error-message">
        <n-alert type="error" :bordered="false">
          {{ errorMessage }}
        </n-alert>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMessage } from 'naive-ui'

const props = defineProps({
  hasValidSession: {
    type: Boolean,
    default: false
  }
})

const authStore = useAuthStore()
const message = useMessage()

const formRef = ref(null)
const loading = ref(false)
const errorMessage = ref('')

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
    await authStore.verifyKey(formData.key)
    message.success('密钥验证成功！')
    formData.key = ''
  } catch (error) {
    errorMessage.value = error.message || '密钥验证失败，请检查密钥是否正确'
    formData.key = ''
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.key-verify-page {
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

.verify-container {
  width: 100%;
  max-width: 800px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 16px;
  padding: 60px;
  box-shadow: var(--shadow-lg);
}

.verify-header {
  text-align: center;
  margin-bottom: 60px;
}

.icon {
  font-size: 64px;
  margin-bottom: 24px;
}

.verify-header h1 {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.verify-header p {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.5;
  margin: 0 auto;
}

.error-message {
  margin-top: 20px;
}

:deep(.n-form-item) {
  margin-bottom: 32px;
}

:deep(.n-form-item-blank) {
  min-height: 24px;
}

:deep(.n-input) {
  border-radius: 8px;
  background: var(--bg-input);
  border: 1px solid var(--border-color);
}

:deep(.n-button) {
  border-radius: 8px;
  font-weight: 600;
}

:deep(.n-button--primary) {
  background: var(--primary-color);
  border: none;
}

:deep(.n-alert) {
  border-radius: 8px;
}

@media (max-width: 640px) {
  .key-verify-page {
    padding: 20px;
  }
  
  .verify-container {
    padding: 40px 30px;
  }
  
  .icon {
    font-size: 48px;
  }
  
  .verify-header h1 {
    font-size: 24px;
  }
  
  .verify-header p {
    font-size: 14px;
  }
}
</style>