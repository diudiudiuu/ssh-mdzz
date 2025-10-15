<template>
  <div class="key-setup">
    <div class="setup-container">
      <div class="setup-header">
        <div class="icon">🔐</div>
        <h1>欢迎使用 SSH MDZZ</h1>
        <p>首次使用需要设置加密密钥来保护您的连接信息</p>
      </div>

      <n-form
        ref="formRef"
        :model="formData"
        :rules="rules"
        size="large"
        label-placement="top"
      >
        <n-form-item label="设置加密密钥" path="key">
          <n-input
            v-model:value="formData.key"
            type="password"
            placeholder="请输入密钥（至少 6 个字符）"
            show-password-on="click"
            @keyup.enter="handleSetup"
          >
            <template #prefix>
              <n-icon><LockClosedOutline /></n-icon>
            </template>
          </n-input>
        </n-form-item>

        <n-form-item label="确认密钥" path="confirmKey">
          <n-input
            v-model:value="formData.confirmKey"
            type="password"
            placeholder="请再次输入密钥"
            show-password-on="click"
            @keyup.enter="handleSetup"
          >
            <template #prefix>
              <n-icon><LockClosedOutline /></n-icon>
            </template>
          </n-input>
        </n-form-item>

        <n-alert type="info" :bordered="false" style="margin-bottom: 20px">
          <template #icon>
            <n-icon><InformationCircleOutline /></n-icon>
          </template>
          <div class="alert-content">
            <strong>重要提示：</strong>
            <ul>
              <li>此密钥将用于加密存储您的 SSH 连接信息</li>
              <li>密钥仅保存在内存中，不会持久化到磁盘</li>
              <li>请务必记住此密钥，忘记后将无法访问已保存的连接</li>
              <li>建议使用强密码（包含字母、数字、特殊字符）</li>
            </ul>
          </div>
        </n-alert>

        <n-button
          type="primary"
          block
          size="large"
          :loading="loading"
          @click="handleSetup"
        >
          {{ loading ? '设置中...' : '完成设置' }}
        </n-button>
      </n-form>

      <div class="setup-footer">
        <n-text depth="3">
          设置完成后，您就可以开始添加和管理 SSH 连接了
        </n-text>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useMessage } from 'naive-ui'
import { LockClosedOutline, InformationCircleOutline } from '@vicons/ionicons5'

const router = useRouter()
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
      trigger: 'blur'
    }
  ]
}

async function handleSetup() {
  try {
    await formRef.value?.validate()
    loading.value = true

    console.log('开始设置密钥...')
    await authStore.setKey(formData.key)
    
    console.log('密钥设置成功')
    message.success('密钥设置成功！')
    
    // 不需要手动跳转，App.vue 会根据认证状态自动切换视图
    // 等待一下让用户看到成功消息
    await new Promise(resolve => setTimeout(resolve, 1000))
    
  } catch (error) {
    console.error('设置密钥失败:', error)
    message.error(error?.message || '设置密钥失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.key-setup {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.setup-container {
  width: 100%;
  max-width: 500px;
  background: var(--bg-secondary);
  border-radius: 16px;
  padding: 48px 40px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: fadeIn 0.5s ease;
}

.setup-header {
  text-align: center;
  margin-bottom: 40px;
}

.icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: pulse 2s ease-in-out infinite;
}

.setup-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.setup-header p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.alert-content ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
}

.alert-content li {
  margin: 6px 0;
  font-size: 13px;
  line-height: 1.6;
}

.setup-footer {
  text-align: center;
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
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

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}
</style>