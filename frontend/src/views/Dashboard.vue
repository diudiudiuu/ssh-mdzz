<template>
  <div class="dashboard">
    <!-- 左右两栏布局 -->
    <n-split
      direction="horizontal"
      :default-size="0.4"
      :min="0.2"
      :max="0.6"
      class="main-split"
    >
      <!-- 左侧面板：会话和文件 -->
      <template #1>
        <div class="left-panel">
          <n-split
            direction="vertical"
            :default-size="sessionCollapsed ? 0.2 : (showFiles ? 0.5 : 1)"
            :min="0.1"
            :max="0.9"
            class="left-split"
          >
            <!-- 会话区域 -->
            <template #1>
              <div class="session-panel">
                <div class="panel-header">
                  <span class="panel-title">会话</span>
                  <div class="panel-actions">
                    <n-button size="tiny" @click="showAddConnection = true">
                      <template #icon>
                        <n-icon><AddOutline /></n-icon>
                      </template>
                    </n-button>
                    <n-button 
                      v-if="activeConnection && isConnected"
                      size="tiny"
                      @click="toggleSessionCollapse"
                    >
                      <template #icon>
                        <n-icon>
                          <ChevronDownOutline v-if="sessionCollapsed" />
                          <ChevronUpOutline v-else />
                        </n-icon>
                      </template>
                    </n-button>
                  </div>
                </div>
                
                <div class="panel-content">
                  <!-- 会话列表 -->
                  <div v-show="!sessionCollapsed" class="connections">
                    <div 
                      v-for="config in connectionStore.connections" 
                      :key="config.id"
                      class="connection-item"
                      :class="{ 
                        active: activeConnection?.id === config.id,
                        connected: getConnectionStatus(config.id) === 'connected'
                      }"
                      @dblclick="connectToSSH(config)"
                      @contextmenu="handleRightClick($event, config)"
                    >
                      <div class="connection-icon">
                        <n-icon 
                          size="16" 
                          :color="getConnectionStatus(config.id) === 'connected' ? '#18a058' : '#666'"
                        >
                          <RadioButtonOnOutline v-if="getConnectionStatus(config.id) === 'connected'" />
                          <RadioButtonOffOutline v-else />
                        </n-icon>
                      </div>
                      <div class="connection-info">
                        <div class="connection-name">{{ config.name }}</div>
                        <div class="connection-details">
                          {{ config.username }}@{{ config.host }}:{{ config.port }}
                        </div>
                      </div>
                    </div>
                  </div>

                  <!-- 收缩后的活动连接显示 -->
                  <div v-if="sessionCollapsed && activeConnection && isConnected" class="active-connection-mini">
                    <div class="mini-connection">
                      <n-icon size="16" color="#18a058">
                        <RadioButtonOnOutline />
                      </n-icon>
                      <span class="mini-name">{{ activeConnection.name }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </template>

            <!-- 文件浏览器区域 -->
            <template #2>
              <div v-if="showFiles" class="file-panel">
                <div class="panel-header">
                  <span class="panel-title">文件</span>
                  <div class="panel-actions" v-if="activeConnection && isConnected">
                    <n-button size="tiny" @click="refreshFiles">
                      <template #icon>
                        <n-icon><RefreshOutline /></n-icon>
                      </template>
                    </n-button>
                    <n-button size="tiny" @click="showCreateFolderDialog = true">
                      <template #icon>
                        <n-icon><FolderOutline /></n-icon>
                      </template>
                    </n-button>
                  </div>
                </div>
                
                <div class="panel-content">
                  <div v-if="activeConnection && isConnected">
                    <FileBrowser 
                      :key="`${activeConnection.id}-${currentPath}`"
                      :config-id="activeConnection.id"
                      :initial-path="currentPath"
                      @path-change="handlePathChange"
                    />
                  </div>
                  <div v-else class="file-placeholder">
                    <n-empty description="请先连接到服务器">
                      <template #icon>
                        <n-icon size="48" color="#666">
                          <FolderOutline />
                        </n-icon>
                      </template>
                    </n-empty>
                  </div>
                </div>
              </div>
            </template>
          </n-split>
        </div>
      </template>

      <!-- 右侧面板：终端 -->
      <template #2>
        <div class="terminal-panel">
          <div class="panel-header">
            <span class="panel-title">终端</span>
            <div class="panel-actions" v-if="activeConnection && isConnected">
              <n-button size="tiny" @click="clearTerminal">
                <template #icon>
                  <n-icon><CloseOutline /></n-icon>
                </template>
              </n-button>
              <n-button size="tiny" @click="reconnectSSH">
                <template #icon>
                  <n-icon><RefreshOutline /></n-icon>
                </template>
              </n-button>
              <n-button size="tiny" type="error" @click="deleteConnection">
                <template #icon>
                  <n-icon><TrashOutline /></n-icon>
                </template>
              </n-button>
            </div>
          </div>
          
          <div class="panel-content">
            <div v-if="activeConnection && isConnected" class="terminal-container">
              <SSHTerminal :config-id="activeConnection.id" />
            </div>
            
            <!-- 默认欢迎页 -->
            <div v-else class="welcome-screen">
              <div class="welcome-content">
                <n-icon size="64" color="#666">
                  <TerminalOutline />
                </n-icon>
                <h2>SSH 管理工具</h2>
                <p>双击左侧的连接开始使用</p>
                
                <div class="quick-actions">
                  <n-button @click="showAddConnection = true">
                    添加新连接
                  </n-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>
    </n-split>
    
    <!-- 添加连接对话框 -->
    <ConnectionDialog 
      v-model:show="showAddConnection"
      @success="handleConnectionAdded"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import { useMessage, useDialog } from 'naive-ui'
import { 
  AddOutline,
  RefreshOutline,
  TerminalOutline,
  ServerOutline,
  RadioButtonOnOutline,
  RadioButtonOffOutline,
  FolderOutline,
  ChevronDownOutline,
  ChevronUpOutline,
  TrashOutline,
  CloseOutline
} from '@vicons/ionicons5'

import FileBrowser from '@/components/file/FileBrowser.vue'
import SSHTerminal from '@/components/terminal/SSHTerminal.vue'
import ConnectionDialog from '@/components/connection/ConnectionDialog.vue'

const connectionStore = useConnectionStore()
const message = useMessage()
const dialog = useDialog()

const activeConnection = ref(null)
const currentPath = ref('/')
const showAddConnection = ref(false)
const sessionCollapsed = ref(false)
const showCreateFolderDialog = ref(false)
const showFiles = ref(false)

const isConnected = computed(() => {
  if (!activeConnection.value || !connectionStore.activeSessions) return false
  return connectionStore.activeSessions.some(s => 
    s.configId === activeConnection.value.id && s.isActive
  )
})

// 获取连接状态
function getConnectionStatus(configId) {
  if (!connectionStore.activeSessions) return 'disconnected'
  const session = connectionStore.activeSessions.find(s => s.configId === configId)
  return session?.isActive ? 'connected' : 'disconnected'
}

// 连接到 SSH
async function connectToSSH(config) {
  try {
    activeConnection.value = config
    
    // 如果还没连接，先建立连接
    if (!isConnected.value) {
      await connectionStore.createSession(config.id)
      message.success(`已连接到 ${config.name}`)
      
      // 手动刷新活动会话列表
      await connectionStore.loadActiveSessions()
      
      // 等待一下让会话状态更新
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // 连接成功后自动收缩会话列表，展开文件列表
      sessionCollapsed.value = true
      showFiles.value = true
      
      // 获取用户主目录作为初始路径
      try {
        const homeDir = await window.go.main.App.GetRemoteHome(config.id)
        currentPath.value = homeDir || '/'
      } catch (error) {
        console.error('获取主目录失败:', error)
        currentPath.value = '/'
      }
      
      console.log('连接成功，状态:', {
        activeConnection: activeConnection.value?.name,
        isConnected: isConnected.value,
        showFiles: showFiles.value,
        sessionCollapsed: sessionCollapsed.value,
        currentPath: currentPath.value,
        activeSessions: connectionStore.activeSessions
      })
    }
    
  } catch (error) {
    console.error('连接失败:', error)
    message.error(`连接失败: ${error.message}`)
  }
}



// 切换会话收缩状态
function toggleSessionCollapse() {
  sessionCollapsed.value = !sessionCollapsed.value
}

// 右键菜单
function handleRightClick(e, config) {
  e.preventDefault()
  showConnectionContextMenu(e, config)
}

// 显示连接右键菜单
function showConnectionContextMenu(e, config) {
  // 使用 Naive UI 的 dropdown 组件显示右键菜单
  // 这里可以添加编辑、删除等选项
}

// 处理路径变化
function handlePathChange(newPath) {
  currentPath.value = newPath
}

// 刷新文件列表
function refreshFiles() {
  // 触发文件浏览器刷新
  // 这里可以通过事件或者重新加载组件来实现
}

// 清除终端
function clearTerminal() {
  // 发送清屏命令到终端
  // 这里需要与 SSHTerminal 组件通信
  message.info('清除终端')
}

// 重连 SSH
async function reconnectSSH() {
  if (!activeConnection.value) return
  
  try {
    // 先关闭当前连接
    await connectionStore.closeSession(activeConnection.value.id)
    
    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 500))
    
    // 重新连接
    await connectionStore.createSession(activeConnection.value.id)
    message.success('重连成功')
  } catch (error) {
    console.error('重连失败:', error)
    message.error(`重连失败: ${error.message}`)
  }
}

// 删除连接
async function deleteConnection() {
  if (!activeConnection.value) return
  
  // 显示确认对话框
  dialog.warning({
    title: '确认删除',
    content: `确定要删除连接 "${activeConnection.value.name}" 吗？此操作不可撤销。`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        const connectionId = activeConnection.value.id
        
        // 先断开连接
        if (isConnected.value) {
          await connectionStore.closeSession(connectionId)
        }
        
        // 删除连接配置
        await connectionStore.deleteConnection(connectionId)
        message.success('连接已删除')
        
        // 重置状态
        sessionCollapsed.value = false
        showFiles.value = false
        activeConnection.value = null
      } catch (error) {
        console.error('删除连接失败:', error)
        message.error(`删除连接失败: ${error.message}`)
      }
    }
  })
}



// 处理连接添加成功
function handleConnectionAdded() {
  connectionStore.loadConnections()
}

onMounted(() => {
  // 加载连接列表
  connectionStore.loadConnections()
  
  // 加载活动会话
  connectionStore.loadActiveSessions()
  
  // 启动定期刷新活动会话
  const stopRefresh = connectionStore.startSessionRefresh()
  
  // 组件卸载时停止刷新
  onUnmounted(() => {
    stopRefresh()
  })
})
</script>

<style scoped>
.dashboard {
  height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  padding-left: var(--safe-area-inset-left);
  padding-right: var(--safe-area-inset-right);
  padding-bottom: var(--safe-area-inset-bottom);
  min-height: calc(100vh - var(--safe-area-inset-top) - var(--safe-area-inset-bottom));
}

.main-split,
.left-split {
  height: 100%;
}

.left-panel {
  height: 100%;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
}

.session-panel,
.file-panel,
.terminal-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.file-panel {
  border-top: 1px solid var(--border-color);
}

.panel-header {
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border-color);
  flex-shrink: 0;
}

.panel-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.panel-actions {
  display: flex;
  gap: 4px;
}

.panel-content {
  flex: 1;
  overflow: hidden;
}

.file-placeholder {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.connections {
  flex: 1;
  overflow-y: auto;
  padding: 4px;
}

.connection-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: relative;
  margin: 2px var(--spacing-xs);
  border-radius: var(--radius-sm);
}

.connection-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  border-radius: var(--radius-sm);
  transition: all var(--transition-normal);
  pointer-events: none;
}

.connection-item:hover {
  background: var(--bg-elevated);
  transform: translateX(2px);
  box-shadow: var(--shadow-sm);
}

.connection-item:hover::before {
  background: linear-gradient(135deg, rgba(24, 160, 88, 0.1) 0%, rgba(24, 160, 88, 0.05) 100%);
}

.connection-item.active {
  background: rgba(24, 160, 88, 0.15);
  border-left: 3px solid var(--primary-color);
  transform: translateX(2px);
  box-shadow: var(--shadow-md);
}

.connection-item.active::before {
  background: linear-gradient(135deg, rgba(24, 160, 88, 0.2) 0%, rgba(24, 160, 88, 0.1) 100%);
}

.connection-item.connected .connection-icon {
  animation: pulse 2s infinite;
}

.connection-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.05);
  transition: all var(--transition-normal);
}

.connection-item.connected .connection-icon {
  background: rgba(24, 160, 88, 0.2);
  box-shadow: 0 0 8px rgba(24, 160, 88, 0.3);
}

.connection-info {
  flex: 1;
  min-width: 0;
}

.connection-name {
  font-weight: 600;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-bottom: 2px;
}

.connection-details {
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--font-family-mono);
}

.active-connection-mini {
  padding: var(--spacing-sm) var(--spacing-md);
  position: relative;
  z-index: 1;
}

.mini-connection {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm);
  background: rgba(24, 160, 88, 0.1);
  border-radius: var(--radius-md);
  border-left: 3px solid var(--primary-color);
  backdrop-filter: blur(10px);
  box-shadow: var(--shadow-sm);
  transition: all var(--transition-normal);
}

.mini-connection:hover {
  background: rgba(24, 160, 88, 0.15);
  transform: translateY(-1px);
  box-shadow: var(--shadow-md);
}

.mini-name {
  font-size: var(--font-size-xs);
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terminal-container {
  flex: 1;
  overflow: hidden;
  background: var(--bg-primary);
  border-radius: var(--radius-lg) 0 0 0;
  position: relative;
}

.terminal-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.02) 0%, transparent 100%);
  pointer-events: none;
  border-radius: var(--radius-lg) 0 0 0;
}

.welcome-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-primary);
  position: relative;
}

.welcome-screen::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(circle at 50% 50%, rgba(24, 160, 88, 0.05) 0%, transparent 70%);
  pointer-events: none;
}

.welcome-content {
  text-align: center;
  max-width: 480px;
  padding: var(--spacing-xl);
  background: var(--bg-secondary);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  backdrop-filter: blur(20px);
  position: relative;
  z-index: 1;
}

.welcome-content::before {
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

.welcome-content > * {
  position: relative;
  z-index: 1;
}

.welcome-content .n-icon {
  margin-bottom: var(--spacing-lg);
  color: var(--primary-color);
  filter: drop-shadow(0 2px 8px rgba(24, 160, 88, 0.3));
}

.welcome-content h2 {
  margin: var(--spacing-lg) 0 var(--spacing-md);
  color: var(--text-primary);
  font-size: var(--font-size-3xl);
  font-weight: 700;
  background: linear-gradient(135deg, var(--text-primary) 0%, rgba(255, 255, 255, 0.8) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.welcome-content p {
  color: var(--text-secondary);
  margin-bottom: var(--spacing-xl);
  font-size: var(--font-size-md);
  line-height: var(--line-height-relaxed);
}

.quick-actions {
  display: flex;
  justify-content: center;
}

/* 按钮样式增强 */
:deep(.section-actions .n-button) {
  border-radius: var(--radius-sm);
  transition: all var(--transition-normal);
  backdrop-filter: blur(10px);
}

:deep(.section-actions .n-button:hover) {
  transform: translateY(-1px);
  box-shadow: var(--shadow-sm);
}

/* 分割器样式 */
:deep(.n-split .n-split-bar) {
  background: var(--border-color);
  width: 1px;
  transition: all var(--transition-normal);
}

:deep(.n-split .n-split-bar:hover) {
  background: var(--primary-color);
  width: 2px;
}

/* 连接状态动画增强 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

/* 滚动条样式 */
.connections::-webkit-scrollbar {
  width: 6px;
}

.connections::-webkit-scrollbar-track {
  background: transparent;
  border-radius: var(--radius-sm);
}

.connections::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-sm);
  transition: background var(--transition-normal);
}

.connections::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* 响应式设计 */
@media (max-width: 1024px) {
  .left-panel {
    width: 320px;
  }
  
  .session-area.collapsed {
    width: 120px !important;
  }
}

@media (max-width: 768px) {
  .dashboard {
    flex-direction: column;
  }
  
  .left-panel {
    width: 100%;
    height: 200px;
    border-right: none;
    border-bottom: 1px solid var(--border-color);
  }
  
  .right-panel {
    flex: 1;
  }
  
  .panel-content {
    flex-direction: column;
  }
  
  .session-area {
    border-right: none;
    border-bottom: 1px solid var(--border-color);
    height: 100px;
  }
  
  .session-area.collapsed {
    width: 100% !important;
    height: 60px !important;
  }
  
  .file-area {
    height: 100px;
  }
  
  .welcome-content {
    margin: var(--spacing-md);
    padding: var(--spacing-lg);
  }
  
  .welcome-content h2 {
    font-size: var(--font-size-2xl);
  }
}

/* 加载和过渡动画 */
.dashboard {
  animation: fadeIn 0.5s ease-out;
}

.connection-item {
  animation: slideInLeft 0.3s ease-out;
}

.connection-item:nth-child(1) { animation-delay: 0.1s; }
.connection-item:nth-child(2) { animation-delay: 0.2s; }
.connection-item:nth-child(3) { animation-delay: 0.3s; }
.connection-item:nth-child(4) { animation-delay: 0.4s; }
.connection-item:nth-child(5) { animation-delay: 0.5s; }

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes slideInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* 深色主题特定样式 */
.welcome-content {
  box-shadow: var(--shadow-lg), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.connection-item.active {
  box-shadow: var(--shadow-md), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}

.mini-connection {
  box-shadow: var(--shadow-sm), inset 0 1px 0 rgba(255, 255, 255, 0.1);
}
</style>