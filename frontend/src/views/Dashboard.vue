<template>
  <div class="dashboard">
    <!-- 左侧面板 - 会话管理器和文件浏览器 -->
    <div class="left-panel">


      <!-- 主要内容区域 - 使用 n-split 实现可拖拽调整 -->
      <n-split
        direction="horizontal"
        :default-size="0.5"
        :min="0.2"
        :max="0.8"
        class="panel-content"
      >
        <!-- 会话区域 -->
        <template #1>
          <div class="session-area" :class="{ collapsed: activeConnection && isConnected && sessionCollapsed }">
            <!-- 会话标题 -->
            <div class="section-header">
              <div class="section-actions">
                <!-- 添加连接按钮 -->
                <n-button 
                  size="small"
                  color="#0078d4"
                  @click="showAddConnection = true"
                >
                  <template #icon>
                    <n-icon><AddOutline /></n-icon>
                  </template>
                </n-button>
                <!-- 连接后显示的收缩按钮 -->
                <n-button 
                  v-if="activeConnection && isConnected"
                  size="small"
                  color="#666"
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
            
            <!-- 会话列表 -->
            <div v-show="!sessionCollapsed || !(activeConnection && isConnected)" class="connections">
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
        </template>

        <!-- 文件浏览器区域 -->
        <template #2>
          <div v-if="activeConnection && isConnected" class="file-area">
            <div class="section-header">
              <div class="section-actions">
                <!-- 刷新按钮 -->
                <n-button 
                  size="small"
                  color="#0078d4"
                  @click="refreshFiles"
                >
                  <template #icon>
                    <n-icon><RefreshOutline /></n-icon>
                  </template>
                </n-button>
                
                <!-- 新建文件夹按钮 -->
                <n-button 
                  size="small"
                  color="#f0a020"
                  @click="showCreateFolderDialog = true"
                >
                  <template #icon>
                    <n-icon><FolderOutline /></n-icon>
                  </template>
                </n-button>
              </div>
            </div>
            
            <div class="file-browser-container">
              <FileBrowser 
                :config-id="activeConnection.id"
                :initial-path="currentPath"
                @path-change="handlePathChange"
              />
            </div>
          </div>
        </template>
      </n-split>
    </div>

    <!-- 右侧主内容区 -->
    <div class="right-panel">
      <!-- 直接显示终端，无标签页 -->
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
            <n-button 
              @click="showAddConnection = true"
            >
              添加新连接
            </n-button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 添加连接对话框 -->
    <ConnectionDialog 
      v-model:show="showAddConnection"
      @success="handleConnectionAdded"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import { useMessage } from 'naive-ui'
import { 
  AddOutline,
  RefreshOutline,
  TerminalOutline,
  ServerOutline,
  RadioButtonOnOutline,
  RadioButtonOffOutline,
  FolderOutline,
  ChevronDownOutline,
  ChevronUpOutline
} from '@vicons/ionicons5'

import FileBrowser from '@/components/file/FileBrowser.vue'
import SSHTerminal from '@/components/terminal/SSHTerminal.vue'
import ConnectionDialog from '@/components/connection/ConnectionDialog.vue'

const connectionStore = useConnectionStore()
const message = useMessage()

const activeConnection = ref(null)
const currentPath = ref('/')
const showAddConnection = ref(false)
const sessionCollapsed = ref(false)
const showCreateFolderDialog = ref(false)
const sessionWidth = ref(175) // 默认宽度
const isResizing = ref(false)

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
      // 连接成功后自动收缩会话列表
      sessionCollapsed.value = true
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
  // TODO: 实现右键菜单
  message.info('右键菜单功能开发中')
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

// 开始拖拽调整宽度
function startResize(e) {
  isResizing.value = true
  const startX = e.clientX
  const startWidth = sessionWidth.value
  
  function handleMouseMove(e) {
    if (!isResizing.value) return
    
    const deltaX = e.clientX - startX
    const newWidth = Math.max(100, Math.min(300, startWidth + deltaX))
    sessionWidth.value = newWidth
  }
  
  function handleMouseUp() {
    isResizing.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
  }
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 处理连接添加成功
function handleConnectionAdded() {
  connectionStore.loadConnections()
}

onMounted(() => {
  // 加载连接列表
  connectionStore.loadConnections()
})
</script>

<style scoped>
.dashboard {
  display: flex;
  height: 100vh;
  background: #fff;
}

.left-panel {
  width: 350px;
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  background: #f5f5f5;
}

.right-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}



.panel-content {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.session-area {
  border-right: 1px solid #ddd;
  display: flex;
  flex-direction: column;
  background: #fff;
  transition: width 0.3s ease;
  flex-shrink: 0;
}

.session-area.collapsed {
  width: 120px !important;
}

.resize-handle {
  width: 4px;
  background: #ddd;
  cursor: col-resize;
  transition: background-color 0.2s;
  flex-shrink: 0;
}

.resize-handle:hover {
  background: #0078d4;
}

.file-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #fff;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid #ddd;
  background: #e8e8e8;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  font-weight: 600;
  color: #333;
}

.section-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.section-actions .n-button {
  color: #0078d4;
}

.section-actions .n-button:hover {
  background: #e6f3ff;
}

.connections {
  flex: 1;
  overflow-y: auto;
  background: #fff;
}

.file-browser-container {
  flex: 1;
  overflow: hidden;
  background: #fff;
}

.connection-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  cursor: pointer;
  transition: background-color 0.2s;
  border-bottom: 1px solid #f0f0f0;
}

.connection-item:hover {
  background: #e6f3ff;
}

.connection-item.active {
  background: #cce7ff;
  border-left: 3px solid #0078d4;
}

.connection-item.connected .connection-icon {
  animation: pulse 2s infinite;
}

.connection-icon {
  flex-shrink: 0;
}

.connection-info {
  flex: 1;
  min-width: 0;
}

.connection-name {
  font-weight: 500;
  color: #333;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.connection-details {
  font-size: 11px;
  color: #666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active-connection-mini {
  padding: 8px 12px;
}

.mini-connection {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: #e6f3ff;
  border-radius: 4px;
  border-left: 3px solid #0078d4;
}

.mini-name {
  font-size: 12px;
  font-weight: 500;
  color: #333;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.terminal-container {
  flex: 1;
  overflow: hidden;
}

.welcome-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}

.welcome-content {
  text-align: center;
  max-width: 400px;
}

.welcome-content h2 {
  margin: 20px 0 10px;
  color: #333;
  font-size: 24px;
}

.welcome-content p {
  color: #666;
  margin-bottom: 30px;
  font-size: 14px;
}

.quick-actions {
  display: flex;
  justify-content: center;
}

/* 连接状态动画 */
@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

/* 滚动条样式 */
.connections::-webkit-scrollbar {
  width: 6px;
}

.connections::-webkit-scrollbar-track {
  background: #f1f3f4;
}

.connections::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

.connections::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>