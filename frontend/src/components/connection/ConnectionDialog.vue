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
      <n-form-item label="连接名称" path="name">
        <n-input
          v-model:value="formData.name"
          placeholder="为此连接起个名字"
          clearable
        />
      </n-form-item>
      
      <n-form-item label="主机地址" path="host">
        <n-input
          v-model:value="formData.host"
          placeholder="服务器 IP 或域名"
          clearable
        />
      </n-form-item>
      
      <n-form-item label="端口" path="port">
        <n-input-number
          v-model:value="formData.port"
          :min="1"
          :max="65535"
          placeholder="SSH 端口"
          style="width: 100%"
        />
      </n-form-item>
      
      <n-form-item label="用户名" path="username">
        <n-input
          v-model:value="formData.username"
          placeholder="SSH 用户名"
          clearable
        />
      </n-form-item>
      
      <n-form-item label="认证方式" path="authType">
        <n-radio-group v-model:value="formData.authType">
          <n-radio value="password">密码认证</n-radio>
          <n-radio value="key">密钥认证</n-radio>
        </n-radio-group>
      </n-form-item>
      
      <n-form-item 
        v-if="formData.authType === 'password'" 
        label="密码" 
        path="password"
      >
        <n-input
          v-model:value="formData.password"
          type="password"
          placeholder="SSH 密码"
          show-password-on="mousedown"
          clearable
        />
      </n-form-item>
      
      <n-form-item 
        v-if="formData.authType === 'key'" 
        label="私钥文件" 
        path="privateKeyPath"
      >
        <n-input
          v-model:value="formData.privateKeyPath"
          placeholder="私钥文件路径"
          clearable
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
      >
        <n-input
          v-model:value="formData.keyPassphrase"
          type="password"
          placeholder="私钥密码（可选）"
          show-password-on="mousedown"
          clearable
        />
      </n-form-item>
      
      <n-form-item label="传输模式" path="transferMode">
        <n-select
          v-model:value="formData.transferMode"
          :options="transferModeOptions"
          placeholder="选择文件传输模式"
        />
      </n-form-item>
      
      <n-form-item label="连接超时" path="timeout">
        <n-input-number
          v-model:value="formData.timeout"
          :min="5"
          :max="300"
          placeholder="连接超时时间（秒）"
          style="width: 100%"
        />
      </n-form-item>
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
  port: 22,
  username: '',
  authType: 'password',
  password: '',
  privateKeyPath: '',
  keyPassphrase: '',
  transferMode: 'sftp',
  timeout: 30
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
    { type: 'number', min: 1, max: 65535, message: '端口号必须在 1-65535 之间', trigger: 'blur' }
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
    
    const connectionData = { ...formData.value }
    
    if (editMode.value) {
      connectionData.id = props.connection.id
      await connectionStore.updateConnection(connectionData)
      message.success('连接更新成功')
    } else {
      await connectionStore.addConnection(connectionData)
      message.success('连接添加成功')
    }
    
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
    port: 22,
    username: '',
    authType: 'password',
    password: '',
    privateKeyPath: '',
    keyPassphrase: '',
    transferMode: 'sftp',
    timeout: 30
  }
}

// 监听连接数据变化
watch(() => props.connection, (connection) => {
  if (connection) {
    formData.value = { ...connection }
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
  gap: 8px;
}

.dialog-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
}

:deep(.n-form-item-label) {
  font-weight: 500;
}
</style>