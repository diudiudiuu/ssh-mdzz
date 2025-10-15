<template>
  <div class="setup-view">
    <div class="setup-container">
      <div class="setup-header">
        <div class="icon">⚙️</div>
        <h1>初始设置</h1>
        <p>完成以下设置以开始使用 SSH MDZZ</p>
      </div>

      <n-steps
        :current="currentStep"
        :status="stepStatus"
        size="small"
        style="margin-bottom: 40px"
      >
        <n-step title="设置密钥" description="保护您的连接信息" />
        <n-step title="创建连接" description="添加第一个 SSH 连接" />
        <n-step title="完成设置" description="开始使用应用" />
      </n-steps>

      <!-- 步骤 1: 设置密钥 -->
      <div v-if="currentStep === 1" class="step-content">
        <KeySetup @success="handleKeySetupSuccess" />
      </div>

      <!-- 步骤 2: 创建连接 -->
      <div v-else-if="currentStep === 2" class="step-content">
        <div class="connection-setup">
          <div class="setup-info">
            <h3>添加 SSH 连接</h3>
            <p>添加您的第一个 SSH 连接配置，或者跳过此步骤稍后添加。</p>
          </div>
          
          <n-space vertical :size="16" style="margin-top: 32px">
            <n-button
              type="primary"
              size="large"
              block
              @click="showConnectionDialog = true"
            >
              添加 SSH 连接
            </n-button>
            
            <n-button
              text
              size="large"
              block
              @click="handleSkipConnection"
            >
              跳过，稍后添加
            </n-button>
          </n-space>
        </div>
        
        <!-- 连接对话框 -->
        <ConnectionDialog
          v-model:show="showConnectionDialog"
          @success="handleConnectionSuccess"
        />
      </div>

      <!-- 步骤 3: 完成设置 -->
      <div v-else-if="currentStep === 3" class="step-content">
        <div class="completion-content">
          <div class="completion-icon">🎉</div>
          <h2>设置完成！</h2>
          <p>您已成功完成初始设置，现在可以开始使用 SSH MDZZ 了</p>
          
          <n-space vertical :size="16" style="margin-top: 32px">
            <n-button
              type="primary"
              size="large"
              block
              @click="handleFinish"
            >
              开始使用
            </n-button>
            
            <n-button
              text
              size="large"
              block
              @click="currentStep = 2"
            >
              返回添加更多连接
            </n-button>
          </n-space>
        </div>
      </div>
    </div>
  </div>
</template>
<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useConnectionStore } from '@/stores/connection'
import { useMessage } from 'naive-ui'
import KeySetup from '@/components/auth/KeySetup.vue'
import ConnectionDialog from '@/components/connection/ConnectionDialog.vue'

const router = useRouter()
const authStore = useAuthStore()
const connectionStore = useConnectionStore()
const message = useMessage()

const currentStep = ref(1)
const keySetupComplete = ref(false)
const connectionCreated = ref(false)
const showConnectionDialog = ref(false)

const stepStatus = computed(() => {
  if (currentStep.value === 1) return 'process'
  if (currentStep.value === 2) return keySetupComplete.value ? 'process' : 'wait'
  if (currentStep.value === 3) return 'finish'
  return 'wait'
})

function handleKeySetupSuccess() {
  keySetupComplete.value = true
  currentStep.value = 2
  message.success('密钥设置成功！')
}

function handleConnectionSuccess() {
  connectionCreated.value = true
  currentStep.value = 3
  message.success('连接创建成功！')
}

function handleSkipConnection() {
  currentStep.value = 3
  message.info('已跳过连接创建，您可以稍后添加')
}

function handleFinish() {
  router.push('/')
  message.success('欢迎使用 SSH MDZZ！')
}
</script>

<style scoped>
.setup-view {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--bg-primary);
}

.setup-container {
  width: 100%;
  max-width: 600px;
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
  animation: rotate 3s linear infinite;
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

.step-content {
  animation: slideIn 0.3s ease;
}

.completion-content {
  text-align: center;
  padding: 40px 20px;
}

.completion-icon {
  font-size: 80px;
  margin-bottom: 24px;
  animation: bounce 1s ease;
}

.completion-content h2 {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.completion-content p {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.connection-setup {
  text-align: center;
  padding: 20px;
}

.setup-info h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}

.setup-info p {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.6;
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

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}
</style>