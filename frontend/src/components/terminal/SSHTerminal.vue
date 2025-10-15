<template>
  <div class="ssh-terminal">
    <div class="terminal-header">
      <div class="terminal-info">
        <n-icon><TerminalOutline /></n-icon>
        <span>SSH 终端</span>
      </div>
      <div class="terminal-actions">
        <n-button size="small" @click="clearTerminal">
          <template #icon>
            <n-icon><TrashOutline /></n-icon>
          </template>
          清空
        </n-button>
        <n-button size="small" @click="reconnect">
          <template #icon>
            <n-icon><RefreshOutline /></n-icon>
          </template>
          重连
        </n-button>
      </div>
    </div>
    
    <div class="terminal-container" ref="terminalContainer">
      <div class="terminal-output" ref="terminalOutput">
        <div 
          v-for="(line, index) in terminalLines" 
          :key="index"
          class="terminal-line"
          :class="line.type"
        >
          <span class="line-prefix" v-if="line.type === 'command'">$ </span>
          <span class="line-content">{{ line.content }}</span>
        </div>
      </div>
      
      <div class="terminal-input">
        <span class="input-prefix">$ </span>
        <input
          ref="commandInput"
          v-model="currentCommand"
          @keydown="handleKeyDown"
          @keyup="handleKeyUp"
          class="command-input"
          placeholder="输入命令..."
          :disabled="isExecuting"
        />
      </div>
    </div>
    
    <!-- 连接状态 -->
    <div class="terminal-status">
      <n-tag 
        :type="connectionStatus === 'connected' ? 'success' : 'error'"
        size="small"
      >
        {{ connectionStatus === 'connected' ? '已连接' : '未连接' }}
      </n-tag>
      <span class="status-text">{{ statusText }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useMessage } from 'naive-ui'
import { 
  TerminalOutline, 
  TrashOutline, 
  RefreshOutline 
} from '@vicons/ionicons5'
import { useConnectionStore } from '@/stores/connection'

const props = defineProps({
  configId: {
    type: String,
    required: true
  }
})

const connectionStore = useConnectionStore()
const message = useMessage()

const terminalContainer = ref(null)
const terminalOutput = ref(null)
const commandInput = ref(null)

const terminalLines = ref([
  { type: 'info', content: '正在连接到 SSH 服务器...' }
])
const currentCommand = ref('')
const commandHistory = ref([])
const historyIndex = ref(-1)
const isExecuting = ref(false)
const connectionStatus = ref('connecting')
const statusText = ref('正在连接...')

// 模拟执行命令
async function executeCommand(command) {
  if (!command.trim()) return
  
  isExecuting.value = true
  
  // 添加命令到历史
  commandHistory.value.unshift(command)
  if (commandHistory.value.length > 100) {
    commandHistory.value.pop()
  }
  
  // 显示命令
  terminalLines.value.push({
    type: 'command',
    content: command
  })
  
  try {
    // 这里应该调用后端 API 执行 SSH 命令
    // 暂时模拟一些常见命令的输出
    const output = await simulateCommand(command)
    
    if (output) {
      terminalLines.value.push({
        type: 'output',
        content: output
      })
    }
  } catch (error) {
    terminalLines.value.push({
      type: 'error',
      content: `错误: ${error.message}`
    })
  } finally {
    isExecuting.value = false
    currentCommand.value = ''
    historyIndex.value = -1
    
    // 滚动到底部
    await nextTick()
    scrollToBottom()
  }
}

// 模拟命令执行（后续替换为真实的 SSH 命令执行）
async function simulateCommand(command) {
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const cmd = command.trim().toLowerCase()
  
  if (cmd === 'pwd') {
    return '/root'
  } else if (cmd === 'whoami') {
    return 'root'
  } else if (cmd === 'date') {
    return new Date().toString()
  } else if (cmd.startsWith('ls')) {
    return 'file1.txt  file2.txt  directory1/  directory2/'
  } else if (cmd === 'clear') {
    terminalLines.value = []
    return null
  } else if (cmd === 'help') {
    return `可用命令:
pwd     - 显示当前目录
whoami  - 显示当前用户
date    - 显示当前时间
ls      - 列出文件
clear   - 清空终端
help    - 显示帮助`
  } else {
    return `bash: ${command}: command not found`
  }
}

// 处理键盘事件
function handleKeyDown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (currentCommand.value.trim() && !isExecuting.value) {
      executeCommand(currentCommand.value)
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (historyIndex.value < commandHistory.value.length - 1) {
      historyIndex.value++
      currentCommand.value = commandHistory.value[historyIndex.value] || ''
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (historyIndex.value > 0) {
      historyIndex.value--
      currentCommand.value = commandHistory.value[historyIndex.value] || ''
    } else if (historyIndex.value === 0) {
      historyIndex.value = -1
      currentCommand.value = ''
    }
  } else if (event.key === 'Tab') {
    event.preventDefault()
    // TODO: 实现命令自动补全
  }
}

function handleKeyUp(event) {
  // 处理其他按键事件
}

// 清空终端
function clearTerminal() {
  terminalLines.value = []
}

// 重新连接
async function reconnect() {
  try {
    connectionStatus.value = 'connecting'
    statusText.value = '正在重新连接...'
    
    await connectionStore.connect(props.configId)
    
    connectionStatus.value = 'connected'
    statusText.value = '连接成功'
    
    terminalLines.value.push({
      type: 'info',
      content: '重新连接成功'
    })
    
    message.success('重新连接成功')
  } catch (error) {
    connectionStatus.value = 'disconnected'
    statusText.value = '连接失败'
    
    terminalLines.value.push({
      type: 'error',
      content: `连接失败: ${error.message}`
    })
    
    message.error(`连接失败: ${error.message}`)
  }
}

// 滚动到底部
function scrollToBottom() {
  if (terminalOutput.value) {
    terminalOutput.value.scrollTop = terminalOutput.value.scrollHeight
  }
}

// 监听连接状态
watch(() => props.configId, async (newConfigId) => {
  if (newConfigId) {
    connectionStatus.value = 'connected'
    statusText.value = '已连接'
    
    terminalLines.value.push({
      type: 'info',
      content: `已连接到 ${newConfigId}`
    })
  }
}, { immediate: true })

onMounted(() => {
  // 聚焦输入框
  if (commandInput.value) {
    commandInput.value.focus()
  }
  
  // 模拟连接成功
  setTimeout(() => {
    connectionStatus.value = 'connected'
    statusText.value = '连接成功'
    terminalLines.value.push({
      type: 'info',
      content: '欢迎使用 SSH 终端！输入 help 查看可用命令。'
    })
  }, 1000)
})

onUnmounted(() => {
  // 清理资源
})
</script>

<style scoped>
.ssh-terminal {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: #2d2d30;
  border-bottom: 1px solid #3e3e42;
}

.terminal-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
}

.terminal-actions {
  display: flex;
  gap: 8px;
}

.terminal-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.terminal-output {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  line-height: 1.4;
  font-size: 14px;
}

.terminal-line {
  margin-bottom: 4px;
  word-wrap: break-word;
}

.terminal-line.command {
  color: #569cd6;
}

.terminal-line.output {
  color: #d4d4d4;
}

.terminal-line.error {
  color: #f44747;
}

.terminal-line.info {
  color: #4ec9b0;
}

.line-prefix {
  color: #569cd6;
  font-weight: bold;
}

.terminal-input {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #252526;
  border-top: 1px solid #3e3e42;
}

.input-prefix {
  color: #569cd6;
  font-weight: bold;
  margin-right: 8px;
}

.command-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #d4d4d4;
  font-family: inherit;
  font-size: 14px;
}

.command-input::placeholder {
  color: #6a6a6a;
}

.command-input:disabled {
  opacity: 0.6;
}

.terminal-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: #2d2d30;
  border-top: 1px solid #3e3e42;
  font-size: 12px;
}

.status-text {
  color: #cccccc;
}

/* 滚动条样式 */
.terminal-output::-webkit-scrollbar {
  width: 8px;
}

.terminal-output::-webkit-scrollbar-track {
  background: #2d2d30;
}

.terminal-output::-webkit-scrollbar-thumb {
  background: #464647;
  border-radius: 4px;
}

.terminal-output::-webkit-scrollbar-thumb:hover {
  background: #5a5a5c;
}
</style>