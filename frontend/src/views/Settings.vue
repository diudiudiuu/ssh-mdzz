<template>
  <div class="settings-view">
    <div class="settings-header">
      <h1>设置</h1>
      <p>配置应用程序的各项参数</p>
    </div>

    <div class="settings-content">
      <n-tabs
        v-model:value="activeTab"
        type="line"
        animated
        class="settings-tabs"
      >
        <!-- 通用设置 -->
        <n-tab-pane name="general" tab="🔧 通用">
          <div class="settings-section">
            <h3>外观</h3>
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>主题</n-text>
                  <n-text depth="3">选择应用程序的外观主题</n-text>
                </div>
                <n-select
                  v-model:value="settings.theme"
                  :options="themeOptions"
                  style="width: 120px"
                />
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>语言</n-text>
                  <n-text depth="3">选择界面语言</n-text>
                </div>
                <n-select
                  v-model:value="settings.language"
                  :options="languageOptions"
                  style="width: 120px"
                />
              </div>
            </div>
          </div>

          <n-divider />

          <div class="settings-section">
            <h3>连接</h3>
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>自动重连</n-text>
                  <n-text depth="3">连接断开时自动尝试重连</n-text>
                </div>
                <n-switch v-model:value="settings.autoReconnect" />
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>心跳间隔</n-text>
                  <n-text depth="3">保持连接活跃的间隔时间（秒）</n-text>
                </div>
                <n-input-number
                  v-model:value="settings.keepAliveInterval"
                  :min="10"
                  :max="300"
                  :step="10"
                  style="width: 120px"
                />
              </div>
            </div>
          </div>

          <n-divider />

          <div class="settings-section">
            <h3>确认提示</h3>
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>删除连接时确认</n-text>
                  <n-text depth="3">删除连接配置前显示确认对话框</n-text>
                </div>
                <n-switch v-model:value="settings.confirmOnDelete" />
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>断开连接时确认</n-text>
                  <n-text depth="3">断开活动连接前显示确认对话框</n-text>
                </div>
                <n-switch v-model:value="settings.confirmOnDisconnect" />
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- 终端设置 -->
        <n-tab-pane name="terminal" tab="💻 终端">
          <div class="settings-section">
            <h3>字体</h3>
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>字体大小</n-text>
                  <n-text depth="3">终端文字的大小</n-text>
                </div>
                <n-input-number
                  v-model:value="terminalSettings.fontSize"
                  :min="8"
                  :max="32"
                  style="width: 120px"
                />
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>字体族</n-text>
                  <n-text depth="3">终端使用的字体</n-text>
                </div>
                <n-select
                  v-model:value="terminalSettings.fontFamily"
                  :options="fontFamilyOptions"
                  style="width: 200px"
                />
              </div>
            </div>
          </div>

          <n-divider />

          <div class="settings-section">
            <h3>光标</h3>
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>光标样式</n-text>
                  <n-text depth="3">终端光标的显示样式</n-text>
                </div>
                <n-select
                  v-model:value="terminalSettings.cursorStyle"
                  :options="cursorStyleOptions"
                  style="width: 120px"
                />
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>光标闪烁</n-text>
                  <n-text depth="3">启用光标闪烁动画</n-text>
                </div>
                <n-switch v-model:value="terminalSettings.cursorBlink" />
              </div>
            </div>
          </div>

          <n-divider />

          <div class="settings-section">
            <h3>其他</h3>
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>滚动缓冲区</n-text>
                  <n-text depth="3">终端历史记录行数</n-text>
                </div>
                <n-input-number
                  v-model:value="terminalSettings.scrollback"
                  :min="100"
                  :max="50000"
                  :step="100"
                  style="width: 120px"
                />
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>终端主题</n-text>
                  <n-text depth="3">终端颜色主题</n-text>
                </div>
                <n-select
                  v-model:value="terminalSettings.theme"
                  :options="terminalThemeOptions"
                  style="width: 120px"
                />
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- 安全设置 -->
        <n-tab-pane name="security" tab="🔒 安全">
          <div class="settings-section">
            <h3>加密密钥</h3>
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>当前密钥</n-text>
                  <n-text depth="3">用于加密存储连接信息的密钥</n-text>
                </div>
                <n-text code>{{ keyHint }}</n-text>
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>更改密钥</n-text>
                  <n-text depth="3">更改加密密钥（需要重新输入所有连接信息）</n-text>
                </div>
                <n-button
                  type="warning"
                  ghost
                  @click="showChangeKey = true"
                >
                  更改密钥
                </n-button>
              </div>
            </div>
          </div>

          <n-divider />

          <div class="settings-section">
            <h3>数据管理</h3>
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>导出配置</n-text>
                  <n-text depth="3">导出连接配置到文件</n-text>
                </div>
                <n-button
                  type="info"
                  ghost
                  @click="exportConfigs"
                >
                  导出配置
                </n-button>
              </div>

              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong>导入配置</n-text>
                  <n-text depth="3">从文件导入连接配置</n-text>
                </div>
                <n-button
                  type="info"
                  ghost
                  @click="importConfigs"
                >
                  导入配置
                </n-button>
              </div>
            </div>
          </div>

          <n-divider />

          <div class="settings-section">
            <h3>危险操作</h3>
            <div class="setting-group">
              <div class="setting-item">
                <div class="setting-info">
                  <n-text strong type="error">清除所有数据</n-text>
                  <n-text depth="3">删除所有连接配置和设置</n-text>
                </div>
                <n-button
                  type="error"
                  ghost
                  @click="clearAllData"
                >
                  清除数据
                </n-button>
              </div>
            </div>
          </div>
        </n-tab-pane>

        <!-- 关于 -->
        <n-tab-pane name="about" tab="ℹ️ 关于">
          <div class="about-content">
            <div class="app-info">
              <div class="app-icon">🔐</div>
              <h2>SSH MDZZ</h2>
              <p class="version">版本 1.0.0</p>
              <p class="description">
                一个现代化的 SSH 连接管理工具，提供安全的连接存储、
                内嵌终端模拟器和文件传输功能。
              </p>
            </div>

            <div class="features">
              <h3>主要特性</h3>
              <ul>
                <li>🔒 AES-256 加密存储连接信息</li>
                <li>💻 内嵌 xterm.js 终端模拟器</li>
                <li>📁 支持 SFTP/SCP 文件传输</li>
                <li>🔄 智能会话管理和保活</li>
                <li>🎨 现代化的用户界面</li>
                <li>⚡ 基于 Wails 的原生性能</li>
              </ul>
            </div>

            <div class="tech-stack">
              <h3>技术栈</h3>
              <div class="tech-items">
                <n-tag type="info">Wails v2</n-tag>
                <n-tag type="success">Go</n-tag>
                <n-tag type="primary">Vue 3</n-tag>
                <n-tag type="warning">Naive UI</n-tag>
                <n-tag>xterm.js</n-tag>
              </div>
            </div>

            <div class="links">
              <n-space :size="16">
                <n-button text type="primary">
                  <template #icon>
                    <n-icon><LogoGithub /></n-icon>
                  </template>
                  GitHub
                </n-button>
                <n-button text type="primary">
                  <template #icon>
                    <n-icon><DocumentTextOutline /></n-icon>
                  </template>
                  文档
                </n-button>
              </n-space>
            </div>
          </div>
        </n-tab-pane>
      </n-tabs>
    </div>

    <!-- 更改密钥对话框 -->
    <n-modal
      v-model:show="showChangeKey"
      preset="card"
      title="更改加密密钥"
      :style="{ width: '500px' }"
    >
      <n-alert type="warning" :bordered="false" style="margin-bottom: 16px">
        更改密钥后，所有现有连接配置将被清除，您需要重新添加连接。
      </n-alert>
      
      <n-form ref="keyFormRef" :model="keyForm" :rules="keyRules">
        <n-form-item label="新密钥" path="newKey">
          <n-input
            v-model:value="keyForm.newKey"
            type="password"
            placeholder="输入新的加密密钥"
            show-password-on="click"
          />
        </n-form-item>
        
        <n-form-item label="确认密钥" path="confirmKey">
          <n-input
            v-model:value="keyForm.confirmKey"
            type="password"
            placeholder="再次输入新密钥"
            show-password-on="click"
          />
        </n-form-item>
      </n-form>

      <template #action>
        <n-space justify="end">
          <n-button @click="showChangeKey = false">取消</n-button>
          <n-button
            type="warning"
            :loading="changingKey"
            @click="handleChangeKey"
          >
            确认更改
          </n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>
<script setup>
import { ref, computed, reactive } from 'vue'

import { useAuthStore } from '@/stores/auth'
import { useConnectionStore } from '@/stores/connection'

import { useDialog, useMessage } from 'naive-ui'
import {
  LogoGithub,
  DocumentTextOutline
} from '@vicons/ionicons5'

// 临时设置数据，后续可以创建专门的 settings store
const settings = reactive({
  theme: 'dark',
  autoReconnect: true,
  keepAliveInterval: 30,
  confirmOnDelete: true,
  confirmOnDisconnect: false
})
const authStore = useAuthStore()
const connectionStore = useConnectionStore()

const dialog = useDialog()
const message = useMessage()

const activeTab = ref('general')
const showChangeKey = ref(false)
const changingKey = ref(false)
const keyFormRef = ref(null)

// 终端设置
const terminalSettings = reactive({
  fontSize: 14,
  fontFamily: 'Consolas',
  theme: 'dark',
  cursorBlink: true
})
const keyHint = computed(() => {
  const key = authStore.getKey?.() || ''
  if (!key || key.length < 3) return ''
  return key.substring(0, 2) + '*'.repeat(key.length - 2)
})

const keyForm = reactive({
  newKey: '',
  confirmKey: ''
})

const keyRules = {
  newKey: [
    { required: true, message: '请输入新密钥', trigger: 'blur' },
    { min: 6, message: '密钥长度至少为 6 个字符', trigger: 'blur' }
  ],
  confirmKey: [
    { required: true, message: '请确认密钥', trigger: 'blur' },
    {
      validator: (rule, value) => value === keyForm.newKey,
      message: '两次输入的密钥不一致',
      trigger: 'blur'
    }
  ]
}

const themeOptions = [
  { label: '深色', value: 'dark' },
  { label: '浅色', value: 'light' }
]

const languageOptions = [
  { label: '中文', value: 'zh-CN' },
  { label: 'English', value: 'en-US' }
]

const fontFamilyOptions = [
  { label: 'Monaco', value: 'Monaco, monospace' },
  { label: 'Menlo', value: 'Menlo, monospace' },
  { label: 'Consolas', value: 'Consolas, monospace' },
  { label: 'Ubuntu Mono', value: 'Ubuntu Mono, monospace' },
  { label: 'Courier New', value: 'Courier New, monospace' }
]

const cursorStyleOptions = [
  { label: '块状', value: 'block' },
  { label: '下划线', value: 'underline' },
  { label: '竖线', value: 'bar' }
]

const terminalThemeOptions = [
  { label: '深色', value: 'dark' },
  { label: '浅色', value: 'light' },
  { label: 'Dracula', value: 'dracula' }
]

async function handleChangeKey() {
  try {
    await keyFormRef.value?.validate()
    changingKey.value = true

    // 清除所有连接配置
    const connections = connectionStore.connections
    for (const conn of connections) {
      await connectionStore.deleteConnection(conn.id)
    }

    // 设置新密钥
    await authStore.setKey(keyForm.newKey)
    
    message.success('密钥更改成功，所有连接配置已清除')
    showChangeKey.value = false
    
    // 重置表单
    keyForm.newKey = ''
    keyForm.confirmKey = ''
  } catch (error) {
    message.error('更改密钥失败: ' + error.message)
  } finally {
    changingKey.value = false
  }
}

async function exportConfigs() {
  try {
    const configs = connectionStore.connections
    if (configs.length === 0) {
      message.warning('没有可导出的连接配置')
      return
    }

    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      configs: configs.map(config => ({
        ...config,
        password: '******' // 不导出密码
      }))
    }

    const dataStr = JSON.stringify(exportData, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    
    const a = document.createElement('a')
    a.href = url
    a.download = `ssh-mdzz-configs-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    message.success('配置导出成功')
  } catch (error) {
    message.error('导出失败: ' + error.message)
  }
}

function importConfigs() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.json'
  
  input.onchange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!data.version || !data.configs) {
        throw new Error('无效的配置文件格式')
      }

      message.info('导入功能需要手动重新输入密码信息')
    } catch (error) {
      message.error('导入失败: ' + error.message)
    }
  }
  
  input.click()
}

function clearAllData() {
  dialog.error({
    title: '清除所有数据',
    content: '此操作将删除所有连接配置、设置和缓存数据，且不可恢复。确定要继续吗？',
    positiveText: '确定清除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        // 清除所有连接
        const connections = connectionStore.connections
        for (const conn of connections) {
          await connectionStore.deleteConnection(conn.id)
        }

        // 重置设置
        Object.assign(settings, {
          theme: 'dark',
          autoReconnect: true,
          keepAliveInterval: 30,
          confirmOnDelete: true,
          confirmOnDisconnect: false
        })
        
        // 清除认证
        authStore.clearKey()

        message.success('所有数据已清除')
      } catch (error) {
        message.error('清除数据失败: ' + error.message)
      }
    }
  })
}
</script>

<style scoped>
.settings-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  padding: 24px;
  overflow-y: auto;
}

.settings-header {
  margin-bottom: 32px;
}

.settings-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.settings-header p {
  color: var(--text-secondary);
  font-size: 16px;
}

.settings-content {
  flex: 1;
}

.settings-tabs {
  height: 100%;
}

.settings-tabs :deep(.n-tabs-pane-wrapper) {
  padding: 24px 0;
}

.settings-section {
  margin-bottom: 32px;
}

.settings-section h3 {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.setting-info {
  flex: 1;
  margin-right: 16px;
}

.setting-info .n-text:first-child {
  display: block;
  margin-bottom: 4px;
}

.about-content {
  max-width: 600px;
  margin: 0 auto;
  text-align: center;
}

.app-info {
  margin-bottom: 48px;
}

.app-icon {
  font-size: 80px;
  margin-bottom: 16px;
}

.app-info h2 {
  font-size: 32px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.version {
  font-size: 16px;
  color: var(--text-secondary);
  margin-bottom: 16px;
}

.description {
  font-size: 16px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.features {
  margin-bottom: 48px;
  text-align: left;
}

.features h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
  text-align: center;
}

.features ul {
  list-style: none;
  padding: 0;
}

.features li {
  padding: 8px 0;
  font-size: 16px;
  color: var(--text-secondary);
}

.tech-stack {
  margin-bottom: 48px;
}

.tech-stack h3 {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 16px;
}

.tech-items {
  display: flex;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
}

.links {
  margin-top: 32px;
}
</style>