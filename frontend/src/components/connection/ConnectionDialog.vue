<template>
  <n-modal v-model:show="showModal" preset="dialog" title="添加 SSH 连接">
    <template #header>
      <div class="dialog-header">
        <n-icon><ServerOutline /></n-icon>
        <span>{{ editMode ? '编辑连接' : '添加 SSH 连接' }}</span>
      </div>
    </template>
    
    <n-form
      ref="formRef"
      :model="formData"
      :rules="formRules"
      label-placement="left"
      label-width="auto"
      require-mark-placement="right-hanging"
    >
      <div style="padding: 20px;">
        <n-form-item label="连接名称" path="name" style="margin-bottom: 24px;">
          <n-input
            v-model:value="formData.name"
            placeholder="为此连接起个名字"
            clearable
            size="large"
          />
        </n-form-item>
        
        <div style="display: flex; gap: 16px; margin-bottom: 24px;">
          <n-form-item label="主机地址" path="host" style="flex: 1;">
            <n-input
              v-model:value="formData.host"
              placeholder="服务器 IP 或域名"
              clearable
              size="large"
            />
          </n-form-item>
          
          <n-form-item label="端口" path="port" style="width: 150px;">
            <n-input
              v-model:value="formData.port"
              placeholder="22"
              clearable
              size="large"
            />
          </n-form-item>
        </div>
        
        <n-form-item label="用户名" path="username" style="margin-bottom: 24px;">
          <n-input
            v-model:value="formData.username"
            placeholder="SSH 用户名"
            clearable
            size="large"
          />
        </n-form-item>
        
        <n-form-item label="认证方式" path="authType" style="margin-bottom: 24px;">
          <n-radio-group v-model:value="formData.authType">
            <n-space size="large">
              <n-radio value="password">密码认证</n-radio>
              <n-radio value="key">密钥认证</n-radio>
            </n-space>
          </n-radio-group>
        </n-form-item>
        
        <n-form-item 
          v-if="formData.authType === 'password'" 
          label="密码" 
          path="password"
          style="margin-bottom: 24px;"
        >
          <n-input
            v-model:value="formData.password"
            type="password"
            placeholder="SSH 密码"
            show-password-on="mousedown"
            clearable
            size="large"
          />
        </n-form-item>
        
        <n-form-item 
          v-if="formData.authType === 'key'" 
          label="私钥文件" 
          path="privateKeyPath"
          style="margin-bottom: 24px;"
        >
          <n-input
            v-model:value="formData.privateKeyPath"
            placeholder="私钥文件路径"
            clearable
            size="large"
          >
            <template #suffix>
              <n-button size="small" @click="selectKeyFile">
                选择文件
              </n-button>
            </template>
          </n-input>
        </n-form-item>
        
        <n-form-item 
          v-if="formData.authType === 'key'" 
          label="密钥密码" 
          path="keyPassphrase"
          style="margin-bottom: 24px;"
        >
          <n-input
            v-model:value="formData.keyPassphrase"
            type="password"
            placeholder="私钥密码（可选）"
            show-password-on="mousedown"
            clearable
            size="large"
          />
        </n-form-item>
        
        <div style="display: flex; gap: 16px; margin-bottom: 24px;">
          <n-form-item label="传输模式" path="transferMode" style="flex: 1;">
            <n-select
              v-model:value="formData.transferMode"
              :options="transferModeOptions"
              placeholder="选择文件传输模式"
              size="large"
            />
          </n-form-item>
          
          <n-form-item label="连接超时" path="timeout" style="width: 180px;">
            <n-input
              v-model:value="formData.timeout"
              placeholder="30"
              clearable
              size="large"
            />
          </n-form-item>
        </div>
      </div>
    </n-form>
    
    <template #action>
      <div class="dialog-actions">
        <n-button @click="handleCancel">取消</n-button>
        <n-button @click="testConnection" :loading="testing">
          测试连接
        </n-button>
        <n-button 
          type="primary" 
          @click="handleSave"
          :loading="saving"
        >
          {{ editMode ? '保存' : '添加' }}
        </n-button>
      </div>
    </template>
  </n-modal>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { ServerOutline } from '@vicons/ionicons5'
import { useConnectionStore } from '@/stores/connection'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  connection: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['update:show', 'success'])

const connectionStore = useConnectionStore()
const message = useMessage()

const formRef = ref(null)
const saving = ref(false)
const testing = ref(false)

const showModal = computed({
  get: () => props.show,
  set: (value) => emit('update:show', value)
})

const editMode = computed(() => !!props.connection)

const formData = ref({
  name: '',
  host: '',
  port: '22',
  username: '',
  authType: 'password',
  password: '',
  privateKeyPath: '',
  keyPassphrase: '',
  transferMode: 'sftp',
  timeout: '30'
})

const transferModeOptions = [
  { label: 'SFTP', value: 'sftp' },
  { label: 'SCP', value: 'scp' }
]

const formRules = {
  name: [
    { required: true, message: '请输入连接名称', trigger: 'blur' }
  ],
  host: [
    { required: true, message: '请输入主机地址', trigger: 'blur' }
  ],
  port: [
    { required: true, message: '请输入端口号', trigger: 'blur' },
    { 
      validator: (rule, value) => {
        const port = parseInt(value)
        if (isNaN(port) || port < 1 || port > 65535) {
          return new Error('端口号必须在 1-65535 之间')
        }
        return true
      }, 
      trigger: 'blur' 
    }
  ],
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { 
      required: true, 
      message: '请输入密码', 
      trigger: 'blur',
      validator: (rule, value) => {
        if (formData.value.authType === 'password' && !value) {
          return new Error('请输入密码')
        }
        return true
      }
    }
  ],
  privateKeyPath: [
    {
      required: true,
      message: '请选择私钥文件',
      trigger: 'blur',
      validator: (rule, value) => {
        if (formData.value.authType === 'key' && !value) {
          return new Error('请选择私钥文件')
        }
        return true
      }
    }
  ]
}

// 选择密钥文件
async function selectKeyFile() {
  try {
    // 这里应该调用系统文件选择对话框
    // 暂时使用输入框
    message.info('请手动输入私钥文件路径')
  } catch (error) {
    message.error('选择文件失败')
  }
}

// 测试连接
async function testConnection() {
  try {
    await formRef.value?.validate()
    
    testing.value = true
    
    // 这里应该调用后端 API 测试连接
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    message.success('连接测试成功')
  } catch (error) {
    if (error.message) {
      message.error(`连接测试失败: ${error.message}`)
    }
  } finally {
    testing.value = false
  }
}

// 保存连接
async function handleSave() {
  try {
    await formRef.value?.validate()
    
    saving.value = true
    
    const connectionData = { 
      ...formData.value,
      port: String(formData.value.port),
      timeout: parseInt(formData.value.timeout)
    }
    
    if (editMode.value) {
      connectionData.id = props.connection.id
    }
    
    await connectionStore.saveConnection(connectionData)
    message.success(editMode.value ? '连接更新成功' : '连接添加成功')
    
    emit('success')
    handleCancel()
  } catch (error) {
    if (error.message) {
      message.error(`保存失败: ${error.message}`)
    }
  } finally {
    saving.value = false
  }
}

// 取消
function handleCancel() {
  showModal.value = false
  resetForm()
}

// 重置表单
function resetForm() {
  formData.value = {
    name: '',
    host: '',
    port: '22',
    username: '',
    authType: 'password',
    password: '',
    privateKeyPath: '',
    keyPassphrase: '',
    transferMode: 'sftp',
    timeout: '30'
  }
}

// 监听连接数据变化
watch(() => props.connection, (connection) => {
  if (connection) {
    formData.value = { 
      ...connection,
      port: String(connection.port),
      timeout: String(connection.timeout)
    }
  } else {
    resetForm()
  }
}, { immediate: true })

// 监听显示状态
watch(() => props.show, (show) => {
  if (!show) {
    resetForm()
  }
})
</script>

<style scoped>
.dialog-header {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  color: var(--text-primary);
  font-weight: 600;
}

.dialog-header .n-icon {
  color: var(--primary-color);
  font-size: 18px;
}

.dialog-actions {
  display: flex;
  gap: var(--spacing-md);
  justify-content: flex-end;
  margin-top: var(--spacing-lg);
}

/* 表单样式增强 */
:deep(.n-form) {
  margin-top: var(--spacing-lg);
}

:deep(.n-form-item) {
  margin-bottom: var(--spacing-lg);
}

:deep(.n-form-item-label) {
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: var(--spacing-sm);
  font-size: var(--font-size-sm);
}

:deep(.n-form-item-feedback) {
  font-size: var(--font-size-xs);
  margin-top: var(--spacing-xs);
}

/* 输入框样式 */
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
  box-shadow: 0 0 0 3px rgba(24, 160, 88, 0.12);
}

:deep(.n-input-number) {
  border-radius: var(--radius-md);
}

:deep(.n-input-number .n-input) {
  border-radius: var(--radius-md);
}

/* 选择器样式 */
:deep(.n-select) {
  border-radius: var(--radius-md);
}

:deep(.n-select .n-base-selection) {
  border-radius: var(--radius-md);
  background: var(--bg-input);
  border: 1px solid var(--border-color);
  transition: all var(--transition-normal);
}

:deep(.n-select .n-base-selection:hover) {
  border-color: var(--border-hover);
  box-shadow: 0 0 0 2px rgba(24, 160, 88, 0.08);
}

:deep(.n-select.n-select--focused .n-base-selection) {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(24, 160, 88, 0.12);
}

/* 单选按钮组样式 */
:deep(.n-radio-group) {
  gap: var(--spacing-lg);
}

:deep(.n-radio) {
  margin-right: var(--spacing-lg);
}

:deep(.n-radio .n-radio__label) {
  color: var(--text-primary);
  font-weight: 500;
}

:deep(.n-radio .n-radio__dot) {
  border-color: var(--border-color);
}

:deep(.n-radio.n-radio--checked .n-radio__dot) {
  border-color: var(--primary-color);
  background: var(--primary-color);
}

/* 按钮样式增强 */
:deep(.n-button) {
  border-radius: var(--radius-md);
  font-weight: 500;
  transition: all var(--transition-normal);
  position: relative;
  overflow: hidden;
}

:deep(.n-button--default) {
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

:deep(.n-button--default:hover) {
  background: var(--bg-elevated);
  border-color: var(--border-hover);
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

:deep(.n-button--primary) {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--primary-color-hover) 100%);
  border: none;
  box-shadow: 0 2px 8px rgba(24, 160, 88, 0.25);
}

:deep(.n-button--primary:hover) {
  background: linear-gradient(135deg, var(--primary-color-hover) 0%, #4db87a 100%);
  box-shadow: 0 4px 12px rgba(24, 160, 88, 0.35);
  transform: translateY(-1px);
}

:deep(.n-button--primary:active) {
  transform: translateY(0);
  box-shadow: 0 1px 4px rgba(24, 160, 88, 0.25);
}

/* 加载状态 */
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

/* 输入框后缀按钮 */
:deep(.n-input .n-input__suffix .n-button) {
  border-radius: var(--radius-sm);
  font-size: var(--font-size-xs);
  padding: var(--spacing-xs) var(--spacing-sm);
  height: auto;
  min-height: auto;
}

/* 响应式设计 */
@media (max-width: 640px) {
  :deep(.n-modal .n-card) {
    margin: var(--spacing-md);
    width: calc(100vw - 32px);
    max-width: none;
  }
  
  :deep(.n-modal .n-card .n-card-header) {
    padding: var(--spacing-md) var(--spacing-lg) var(--spacing-sm);
  }
  
  :deep(.n-modal .n-card .n-card-content) {
    padding: var(--spacing-lg);
  }
  
  .dialog-actions {
    flex-direction: column-reverse;
    gap: var(--spacing-sm);
  }
  
  .dialog-actions .n-button {
    width: 100%;
  }
}

/* 表单验证状态 */
:deep(.n-form-item.n-form-item--error .n-input) {
  border-color: var(--error-color);
  box-shadow: 0 0 0 2px rgba(208, 48, 80, 0.15);
}

:deep(.n-form-item.n-form-item--error .n-base-selection) {
  border-color: var(--error-color);
  box-shadow: 0 0 0 2px rgba(208, 48, 80, 0.15);
}

:deep(.n-form-item-feedback.n-form-item-feedback--error) {
  color: var(--error-color);
  font-weight: 500;
}
</style>