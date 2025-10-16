<template>
  <div class="ssh-terminal">
    <!-- 终端头部工具栏 -->
    <div class="terminal-header">
      <div class="terminal-info">
        <n-icon size="16" color="#4ec9b0">
          <TerminalOutline />
        </n-icon>
        <span>SSH Terminal - {{ configId }}</span>
      </div>
      <div class="terminal-actions">
        <n-button size="small" quaternary @click="toggleTerminalMode"
          :title="useInteractiveMode ? '切换到简单模式' : '切换到交互模式'">
          <template #icon>
            <n-icon>
              <TerminalOutline v-if="!useInteractiveMode" />
              <CodeOutline v-else />
            </n-icon>
          </template>
        </n-button>
        <n-button v-if="useInteractiveMode" size="small" quaternary @click="runDiagnostics" title="运行诊断测试">
          <template #icon>
            <n-icon>
              <BugOutline />
            </n-icon>
          </template>
        </n-button>
        <n-button size="small" quaternary @click="clearTerminal" title="清空终端">
          <template #icon>
            <n-icon>
              <TrashOutline />
            </n-icon>
          </template>
        </n-button>
        <n-button size="small" quaternary @click="reconnect" title="重新连接" :loading="connectionStatus === 'connecting'">
          <template #icon>
            <n-icon>
              <RefreshOutline />
            </n-icon>
          </template>
        </n-button>
      </div>
    </div>

    <div class="terminal-container" ref="terminalContainer">
      <!-- 交互式终端 (使用 xterm.js) -->
      <div v-if="useInteractiveMode" ref="xtermContainer" class="xterm-container"></div>

      <!-- 简单终端 (原有实现) -->
      <div v-else class="simple-terminal">
        <div class="terminal-output" ref="terminalOutput">
          <div v-for="(line, index) in terminalLines" :key="index" class="terminal-line" :class="line.type"
            v-html="formatLine(line)" />
        </div>

        <!-- 命令输入行 -->
        <div class="terminal-input-line">
          <span class="prompt">{{ currentPrompt }}</span>
          <div class="input-container">
            <input ref="commandInput" v-model="currentCommand" @keydown="handleKeyDown" @input="handleInput"
              @focus="showCompletions && updateCompletions()" class="command-input" :disabled="isExecuting"
              autocomplete="off" spellcheck="false" placeholder="输入命令... (Tab键自动补全)" />
            <div class="cursor" :class="{ blinking: !isExecuting }"></div>
          </div>
        </div>
      </div>

      <!-- Tab 补全提示弹窗 -->
      <div v-if="completions.length > 0 && showCompletions" class="completions-popup" ref="completionsPopup">
        <div class="completions-header">
          <span class="completions-title">
            {{ completionType === 'command' ? '命令补全' : '文件补全' }}
          </span>
          <span class="completions-hint">
            ↑↓ 选择 • Tab/Enter 确认 • Esc 取消
          </span>
        </div>
        <div class="completions-list">
          <div v-for="(completion, index) in completions" :key="index" class="completion-item" :class="{
            active: index === selectedCompletion,
            'is-command': completion.type === 'command',
            'is-file': completion.type === 'file',
            'is-directory': completion.type === 'directory'
          }" @click="selectCompletion(completion)" @mouseenter="selectedCompletion = index">
            <div class="completion-icon">
              <span v-if="completion.type === 'command'">⚡</span>
              <span v-else-if="completion.type === 'directory'">📁</span>
              <span v-else-if="completion.type === 'file'">📄</span>
              <span v-else>•</span>
            </div>
            <div class="completion-content">
              <div class="completion-text">{{ completion.text }}</div>
              <div v-if="completion.description" class="completion-description">
                {{ completion.description }}
              </div>
            </div>
            <div class="completion-type-badge">
              {{ completion.type }}
            </div>
          </div>
        </div>
        <div class="completions-footer">
          <span class="completions-count">
            {{ selectedCompletion + 1 }} / {{ completions.length }}
          </span>
        </div>
      </div>

      <!-- 命令提示信息 -->
      <div v-if="showCommandHint && currentCommandInfo" class="command-hint">
        <div class="hint-header">
          <span class="hint-command">{{ currentCommandInfo.command }}</span>
          <span class="hint-description">{{ currentCommandInfo.description }}</span>
        </div>
        <div class="hint-usage" v-if="currentCommandInfo.usage">
          <strong>用法:</strong> {{ currentCommandInfo.usage }}
        </div>
        <div class="hint-examples" v-if="currentCommandInfo.examples">
          <strong>示例:</strong>
          <div v-for="example in currentCommandInfo.examples" :key="example" class="hint-example">
            {{ example }}
          </div>
        </div>
      </div>
    </div>

    <!-- 状态栏 -->
    <div class="terminal-status">
      <div class="status-left">
        <div class="connection-indicator" :class="connectionStatus">
          <div class="indicator-dot"></div>
        </div>
        <span class="status-text">{{ statusText }}</span>
        <span class="separator">|</span>
        <span class="current-path">{{ currentPath }}</span>
      </div>
      <div class="status-right">
        <span class="session-info">
          <span class="session-time">{{ sessionTime }}</span>
          <span class="separator">|</span>
          <span class="command-count">{{ commandHistory.length }} 条命令</span>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useMessage } from 'naive-ui'
import {
  TerminalOutline,
  TrashOutline,
  RefreshOutline,
  CodeOutline,
  BugOutline
} from '@vicons/ionicons5'
import { useConnectionStore } from '@/stores/connection'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { SearchAddon } from 'xterm-addon-search'
import { WebLinksAddon } from 'xterm-addon-web-links'

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
const xtermContainer = ref(null)

// 终端模式切换
const useInteractiveMode = ref(false)

// xterm.js 相关
let xterm = null
let fitAddon = null
let searchAddon = null
let webLinksAddon = null

const terminalLines = ref([
  { type: 'info', content: '正在连接到 SSH 服务器...', timestamp: new Date() }
])
const currentCommand = ref('')
const commandHistory = ref([])
const historyIndex = ref(-1)
const isExecuting = ref(false)
const connectionStatus = ref('connecting')
const statusText = ref('正在连接...')
const currentPrompt = ref('user@server:~$ ')
const currentPath = ref('~')
const sessionTime = ref('00:00:00')

// Tab 补全相关
const completions = ref([])
const showCompletions = ref(false)
const selectedCompletion = ref(0)
const completionType = ref('command')
const completionsPopup = ref(null)

// 命令提示相关
const showCommandHint = ref(false)
const currentCommandInfo = ref(null)

// 扩展的命令数据库
const commandDatabase = {
  // 文件和目录操作
  'ls': {
    command: 'ls',
    description: '列出目录内容',
    usage: 'ls [选项] [目录]',
    examples: ['ls -la', 'ls -lh /home', 'ls --color=auto'],
    options: ['-l', '-a', '-h', '-t', '-r', '--color']
  },
  'cd': {
    command: 'cd',
    description: '切换目录',
    usage: 'cd [目录]',
    examples: ['cd /home/user', 'cd ..', 'cd ~', 'cd -']
  },
  'pwd': {
    command: 'pwd',
    description: '显示当前工作目录',
    usage: 'pwd',
    examples: ['pwd']
  },
  'mkdir': {
    command: 'mkdir',
    description: '创建目录',
    usage: 'mkdir [选项] 目录名',
    examples: ['mkdir newdir', 'mkdir -p path/to/dir', 'mkdir -m 755 dir']
  },
  'rmdir': {
    command: 'rmdir',
    description: '删除空目录',
    usage: 'rmdir [选项] 目录名',
    examples: ['rmdir emptydir', 'rmdir -p path/to/empty/dir']
  },
  'rm': {
    command: 'rm',
    description: '删除文件或目录',
    usage: 'rm [选项] 文件或目录',
    examples: ['rm file.txt', 'rm -rf directory', 'rm -i *.txt']
  },
  'cp': {
    command: 'cp',
    description: '复制文件或目录',
    usage: 'cp [选项] 源文件 目标文件',
    examples: ['cp file1.txt file2.txt', 'cp -r dir1 dir2', 'cp -p file.txt backup/']
  },
  'mv': {
    command: 'mv',
    description: '移动或重命名文件',
    usage: 'mv [选项] 源文件 目标文件',
    examples: ['mv old.txt new.txt', 'mv file.txt /tmp/', 'mv *.txt backup/']
  },

  // 文件查看和编辑
  'cat': {
    command: 'cat',
    description: '显示文件内容',
    usage: 'cat [选项] 文件名',
    examples: ['cat file.txt', 'cat -n file.txt', 'cat file1.txt file2.txt']
  },
  'less': {
    command: 'less',
    description: '分页查看文件内容',
    usage: 'less [选项] 文件名',
    examples: ['less file.txt', 'less +G file.txt']
  },
  'head': {
    command: 'head',
    description: '显示文件开头部分',
    usage: 'head [选项] 文件名',
    examples: ['head file.txt', 'head -n 20 file.txt', 'head -c 100 file.txt']
  },
  'tail': {
    command: 'tail',
    description: '显示文件结尾部分',
    usage: 'tail [选项] 文件名',
    examples: ['tail file.txt', 'tail -n 20 file.txt', 'tail -f log.txt']
  },

  // 搜索和查找
  'grep': {
    command: 'grep',
    description: '在文件中搜索文本模式',
    usage: 'grep [选项] 模式 文件名',
    examples: ['grep "hello" file.txt', 'grep -r "pattern" .', 'grep -i "case" file.txt']
  },
  'find': {
    command: 'find',
    description: '查找文件和目录',
    usage: 'find [路径] [条件]',
    examples: ['find . -name "*.txt"', 'find /home -type f -size +1M', 'find . -mtime -7']
  },

  // 系统信息和进程
  'ps': {
    command: 'ps',
    description: '显示运行中的进程',
    usage: 'ps [选项]',
    examples: ['ps aux', 'ps -ef', 'ps -u username']
  },
  'top': {
    command: 'top',
    description: '实时显示系统进程',
    usage: 'top [选项]',
    examples: ['top', 'top -u username', 'top -p PID']
  },
  'htop': {
    command: 'htop',
    description: '交互式进程查看器',
    usage: 'htop [选项]',
    examples: ['htop', 'htop -u username']
  },
  'kill': {
    command: 'kill',
    description: '终止进程',
    usage: 'kill [信号] PID',
    examples: ['kill 1234', 'kill -9 1234', 'kill -TERM 1234']
  },

  // 网络和传输
  'wget': {
    command: 'wget',
    description: '从网络下载文件',
    usage: 'wget [选项] URL',
    examples: ['wget http://example.com/file.zip', 'wget -c http://example.com/large.iso']
  },
  'curl': {
    command: 'curl',
    description: '传输数据的工具',
    usage: 'curl [选项] URL',
    examples: ['curl http://example.com', 'curl -O http://example.com/file.zip', 'curl -X POST -d "data" http://api.example.com']
  },
  'ssh': {
    command: 'ssh',
    description: '安全Shell连接',
    usage: 'ssh [选项] 用户@主机',
    examples: ['ssh user@server.com', 'ssh -p 2222 user@server.com', 'ssh -i ~/.ssh/key user@server.com']
  },
  'scp': {
    command: 'scp',
    description: '安全复制文件',
    usage: 'scp [选项] 源文件 目标位置',
    examples: ['scp file.txt user@server:/path/', 'scp -r directory user@server:/path/', 'scp user@server:/path/file.txt .']
  },

  // 压缩和解压
  'tar': {
    command: 'tar',
    description: '打包和解包文件',
    usage: 'tar [选项] 文件名',
    examples: ['tar -czf archive.tar.gz directory/', 'tar -xzf archive.tar.gz', 'tar -tzf archive.tar.gz']
  },
  'zip': {
    command: 'zip',
    description: '创建ZIP压缩文件',
    usage: 'zip [选项] 压缩文件名 文件列表',
    examples: ['zip archive.zip file1.txt file2.txt', 'zip -r archive.zip directory/']
  },
  'unzip': {
    command: 'unzip',
    description: '解压ZIP文件',
    usage: 'unzip [选项] 压缩文件名',
    examples: ['unzip archive.zip', 'unzip -l archive.zip', 'unzip archive.zip -d /path/']
  },

  // 权限和所有权
  'chmod': {
    command: 'chmod',
    description: '修改文件权限',
    usage: 'chmod [选项] 权限 文件名',
    examples: ['chmod 755 script.sh', 'chmod +x file.sh', 'chmod -R 644 directory/']
  },
  'chown': {
    command: 'chown',
    description: '修改文件所有者',
    usage: 'chown [选项] 所有者:组 文件名',
    examples: ['chown user:group file.txt', 'chown -R user directory/', 'chown :group file.txt']
  },

  // 系统管理
  'systemctl': {
    command: 'systemctl',
    description: '系统服务管理',
    usage: 'systemctl [命令] [服务名]',
    examples: ['systemctl status nginx', 'systemctl start apache2', 'systemctl enable mysql']
  },
  'service': {
    command: 'service',
    description: '服务控制',
    usage: 'service [服务名] [命令]',
    examples: ['service nginx status', 'service apache2 restart', 'service mysql stop']
  },

  // 版本控制
  'git': {
    command: 'git',
    description: 'Git版本控制系统',
    usage: 'git [命令] [选项]',
    examples: ['git status', 'git add .', 'git commit -m "message"', 'git push origin main']
  },

  // 容器化
  'docker': {
    command: 'docker',
    description: 'Docker容器管理',
    usage: 'docker [命令] [选项]',
    examples: ['docker ps', 'docker run -it ubuntu bash', 'docker build -t myapp .', 'docker-compose up']
  }
}

// 命令别名映射
const commandAliases = {
  'll': 'ls -la',
  'la': 'ls -la',
  'l': 'ls -CF',
  'dir': 'ls',
  'cls': 'clear',
  'md': 'mkdir',
  'rd': 'rmdir',
  'del': 'rm',
  'copy': 'cp',
  'move': 'mv',
  'type': 'cat',
  'more': 'less'
}

// 生成命令列表
const commonCommands = Object.keys(commandDatabase).map(cmd => ({
  text: cmd,
  type: 'command',
  description: commandDatabase[cmd].description,
  ...commandDatabase[cmd]
}))

// 添加别名到命令列表
Object.keys(commandAliases).forEach(alias => {
  const originalCmd = commandAliases[alias].split(' ')[0]
  if (commandDatabase[originalCmd]) {
    commonCommands.push({
      text: alias,
      type: 'command',
      description: `别名: ${commandAliases[alias]} - ${commandDatabase[originalCmd].description}`,
      usage: `${alias} (等同于 ${commandAliases[alias]})`,
      examples: [`${alias}`]
    })
  }
})

// 模拟文件系统结构
const fileSystem = {
  '/': {
    'home': {
      type: 'directory', children: {
        'user': {
          type: 'directory', children: {
            'Documents': {
              type: 'directory', children: {
                'project1': { type: 'directory', children: {} },
                'notes.txt': { type: 'file' },
                'readme.md': { type: 'file' }
              }
            },
            'Downloads': {
              type: 'directory', children: {
                'file1.zip': { type: 'file' },
                'image.png': { type: 'file' }
              }
            },
            'Desktop': { type: 'directory', children: {} },
            '.bashrc': { type: 'file' },
            '.bash_profile': { type: 'file' },
            '.ssh': {
              type: 'directory', children: {
                'id_rsa': { type: 'file' },
                'id_rsa.pub': { type: 'file' },
                'config': { type: 'file' }
              }
            }
          }
        }
      }
    },
    'etc': {
      type: 'directory', children: {
        'nginx': { type: 'directory', children: {} },
        'apache2': { type: 'directory', children: {} },
        'hosts': { type: 'file' },
        'passwd': { type: 'file' }
      }
    },
    'var': {
      type: 'directory', children: {
        'log': {
          type: 'directory', children: {
            'nginx': { type: 'directory', children: {} },
            'apache2': { type: 'directory', children: {} }
          }
        },
        'www': { type: 'directory', children: {} }
      }
    },
    'tmp': { type: 'directory', children: {} },
    'usr': {
      type: 'directory', children: {
        'bin': { type: 'directory', children: {} },
        'local': { type: 'directory', children: {} }
      }
    }
  }
}

// 获取当前目录的文件列表
function getCurrentDirectoryFiles() {
  // 简化版本，返回常见文件
  return [
    { text: 'Documents/', type: 'directory' },
    { text: 'Downloads/', type: 'directory' },
    { text: 'Desktop/', type: 'directory' },
    { text: '.bashrc', type: 'file' },
    { text: '.bash_profile', type: 'file' },
    { text: '.ssh/', type: 'directory' },
    { text: 'file1.txt', type: 'file' },
    { text: 'file2.txt', type: 'file' },
    { text: 'script.sh', type: 'file' },
    { text: 'config.json', type: 'file' },
    { text: 'README.md', type: 'file' },
    { text: 'package.json', type: 'file' },
    { text: 'node_modules/', type: 'directory' },
    { text: 'src/', type: 'directory' },
    { text: 'dist/', type: 'directory' }
  ]
}

// 执行命令
async function executeCommand(command) {
  if (!command.trim()) return

  isExecuting.value = true
  hideCompletions()

  // 添加命令到历史
  commandHistory.value.unshift(command)
  if (commandHistory.value.length > 100) {
    commandHistory.value.pop()
  }

  // 显示命令
  terminalLines.value.push({
    type: 'command',
    content: command,
    timestamp: new Date()
  })

  try {
    // 调用后端 API 执行真实的 SSH 命令
    const output = await executeSSHCommand(command)

    // 处理输出，即使是空字符串也要显示
    if (output !== undefined && output !== null) {
      if (output.trim() === '') {
        // 如果输出为空，不显示任何内容（某些命令如cd没有输出）
        return
      }

      // 处理多行输出
      const lines = output.split('\n')
      lines.forEach(line => {
        // 显示所有行，包括空行
        terminalLines.value.push({
          type: 'output',
          content: line,
          timestamp: new Date()
        })
      })
    } else {
      // 如果输出是undefined或null，显示错误
      terminalLines.value.push({
        type: 'error',
        content: '命令执行失败：未收到响应',
        timestamp: new Date()
      })
    }
  } catch (error) {
    // 将所有错误都作为输出显示，而不是错误
    const errorMsg = error.message || error.toString()
    terminalLines.value.push({
      type: 'output',
      content: errorMsg,
      timestamp: new Date()
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

// 处理命令别名
function processCommandAlias(command) {
  const trimmedCommand = command.trim()
  const firstWord = trimmedCommand.split(' ')[0]

  if (commandAliases[firstWord]) {
    // 替换别名
    const aliasCommand = commandAliases[firstWord]
    const restOfCommand = trimmedCommand.substring(firstWord.length).trim()
    return restOfCommand ? `${aliasCommand} ${restOfCommand}` : aliasCommand
  }

  return command
}

// 执行真实的SSH命令
async function executeSSHCommand(command) {
  console.log('原始命令:', command, '配置ID:', props.configId)

  // 处理命令别名
  const processedCommand = processCommandAlias(command)
  console.log('处理后命令:', processedCommand)

  try {
    // 使用现有的ExecuteCommand函数
    const output = await window.go.main.App.ExecuteCommand(props.configId, processedCommand)

    console.log('命令输出:', output, '类型:', typeof output)

    // 检查输出
    if (output === undefined || output === null) {
      console.warn('命令输出为undefined或null')
      return ''
    }

    // 确保返回字符串
    const result = String(output)

    // 如果是cd命令，更新当前路径
    if (processedCommand.trim().startsWith('cd ') || processedCommand.trim() === 'cd') {
      try {
        const pwdOutput = await window.go.main.App.ExecuteCommand(props.configId, 'pwd')
        const newPath = pwdOutput ? String(pwdOutput).trim() : ''
        if (newPath) {
          currentPath.value = newPath
          // 保持现有的用户名和主机名
          const promptParts = currentPrompt.value.split(':')
          if (promptParts.length >= 2) {
            const userHost = promptParts[0]
            currentPrompt.value = `${userHost}:${newPath}$ `
          }
        }
      } catch (pwdError) {
        console.error('获取当前路径失败:', pwdError)
      }
    }

    return result

  } catch (error) {
    console.error('SSH命令执行错误:', error)

    // 直接返回错误信息作为输出，不抛出异常
    const errorMsg = error.message || error.toString()
    return errorMsg
  }
}

// 模拟命令执行（后续替换为真实的 SSH 命令执行）
async function simulateCommand(command) {
  await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200))

  const cmd = command.trim().toLowerCase()
  const args = command.trim().split(' ')

  if (cmd === 'pwd') {
    return '/home/user'
  } else if (cmd === 'whoami') {
    return 'user'
  } else if (cmd === 'date') {
    return new Date().toLocaleString()
  } else if (cmd.startsWith('ls')) {
    if (args.includes('-la') || args.includes('-l')) {
      return `total 24
drwxr-xr-x  5 user user 4096 Dec 16 10:30 .
drwxr-xr-x  3 root root 4096 Dec 15 09:20 ..
-rw-r--r--  1 user user  220 Dec 15 09:20 .bash_logout
-rw-r--r--  1 user user 3771 Dec 15 09:20 .bashrc
-rw-r--r--  1 user user  807 Dec 15 09:20 .profile
drwxr-xr-x  2 user user 4096 Dec 16 10:30 Documents
drwxr-xr-x  2 user user 4096 Dec 16 10:30 Downloads`
    } else {
      return 'Documents  Downloads  .bashrc  .profile  file1.txt  file2.txt'
    }
  } else if (cmd === 'clear') {
    terminalLines.value = []
    return null
  } else if (cmd.startsWith('cd')) {
    const path = args[1] || '~'
    currentPath.value = path === '~' ? '~' : path
    currentPrompt.value = `user@server:${currentPath.value}$ `
    return null
  } else if (cmd === 'help') {
    return `常用命令:
pwd          - 显示当前目录
whoami       - 显示当前用户
date         - 显示当前时间
ls [-la]     - 列出文件和目录
cd <path>    - 切换目录
clear        - 清空终端
help         - 显示此帮助

常用别名:
ll           - ls -la (详细列表)
la           - ls -la (显示隐藏文件)
l            - ls -CF (简洁格式)
cls          - clear (清屏)

提示: 使用 Tab 键可以自动补全命令和文件名`
  } else if (cmd.startsWith('echo')) {
    return args.slice(1).join(' ')
  } else {
    return `bash: ${args[0]}: command not found`
  }
}

// 处理键盘事件
function handleKeyDown(event) {
  if (event.key === 'Enter') {
    event.preventDefault()
    if (showCompletions.value && completions.value.length > 0) {
      selectCompletion(completions.value[selectedCompletion.value])
    } else if (currentCommand.value.trim() && !isExecuting.value) {
      executeCommand(currentCommand.value)
    }
  } else if (event.key === 'ArrowUp') {
    event.preventDefault()
    if (showCompletions.value && completions.value.length > 0) {
      selectedCompletion.value = Math.max(0, selectedCompletion.value - 1)
      scrollCompletionIntoView()
    } else if (historyIndex.value < commandHistory.value.length - 1) {
      historyIndex.value++
      currentCommand.value = commandHistory.value[historyIndex.value] || ''
      hideCompletions()
    }
  } else if (event.key === 'ArrowDown') {
    event.preventDefault()
    if (showCompletions.value && completions.value.length > 0) {
      selectedCompletion.value = Math.min(completions.value.length - 1, selectedCompletion.value + 1)
      scrollCompletionIntoView()
    } else if (historyIndex.value > 0) {
      historyIndex.value--
      currentCommand.value = commandHistory.value[historyIndex.value] || ''
      hideCompletions()
    } else if (historyIndex.value === 0) {
      historyIndex.value = -1
      currentCommand.value = ''
      hideCompletions()
    }
  } else if (event.key === 'Tab') {
    event.preventDefault()
    handleTabCompletion()
  } else if (event.key === 'Escape') {
    event.preventDefault()
    hideCompletions()
    hideCommandHint()
  } else if (event.key === 'F1') {
    event.preventDefault()
    showCommandHelp()
  }
}

// 滚动补全项到可见区域
function scrollCompletionIntoView() {
  nextTick(() => {
    const popup = completionsPopup.value
    if (!popup) return

    const activeItem = popup.querySelector('.completion-item.active')
    if (activeItem) {
      activeItem.scrollIntoView({
        block: 'nearest',
        behavior: 'smooth'
      })
    }
  })
}

// 处理输入事件
function handleInput() {
  if (currentCommand.value.length > 0) {
    updateCompletions()
    updateCommandHint()
  } else {
    hideCompletions()
    hideCommandHint()
  }
}

// 更新命令提示
function updateCommandHint() {
  const command = currentCommand.value.trim().split(' ')[0]
  if (command && commandDatabase[command]) {
    currentCommandInfo.value = commandDatabase[command]
    showCommandHint.value = true
  } else {
    hideCommandHint()
  }
}

// 隐藏命令提示
function hideCommandHint() {
  showCommandHint.value = false
  currentCommandInfo.value = null
}

// 显示命令帮助
function showCommandHelp() {
  const command = currentCommand.value.trim().split(' ')[0]
  if (command && commandDatabase[command]) {
    const info = commandDatabase[command]
    terminalLines.value.push({
      type: 'info',
      content: `命令帮助: ${info.command}`,
      timestamp: new Date()
    })
    terminalLines.value.push({
      type: 'output',
      content: `描述: ${info.description}`,
      timestamp: new Date()
    })
    if (info.usage) {
      terminalLines.value.push({
        type: 'output',
        content: `用法: ${info.usage}`,
        timestamp: new Date()
      })
    }
    if (info.examples) {
      terminalLines.value.push({
        type: 'output',
        content: `示例:`,
        timestamp: new Date()
      })
      info.examples.forEach(example => {
        terminalLines.value.push({
          type: 'output',
          content: `  ${example}`,
          timestamp: new Date()
        })
      })
    }
    scrollToBottom()
  }
}

// Tab 自动补全
async function handleTabCompletion() {
  const command = currentCommand.value
  const words = command.split(' ')
  const currentWord = words[words.length - 1]

  if (words.length === 1) {
    // 补全命令
    const matches = commonCommands.filter(cmd =>
      cmd.text.startsWith(currentWord.toLowerCase())
    )

    if (matches.length === 1) {
      currentCommand.value = matches[0].text + ' '
      hideCompletions()
    } else if (matches.length > 1) {
      completionType.value = 'command'
      showCompletionPopup(matches)
    }
  } else {
    // 补全文件路径 - 使用真实的远程文件
    let matches = []

    if (connectionStatus.value === 'connected') {
      matches = await updateFileCompletions(currentWord)
    } else {
      const files = getCurrentDirectoryFiles()
      matches = files.filter(file =>
        file.text.toLowerCase().startsWith(currentWord.toLowerCase())
      )
    }

    if (matches.length === 1) {
      words[words.length - 1] = matches[0].text
      currentCommand.value = words.join(' ')
      if (matches[0].type === 'command') {
        currentCommand.value += ' '
      }
      hideCompletions()
    } else if (matches.length > 1) {
      completionType.value = 'file'
      showCompletionPopup(matches)
    }
  }

  // 如果没有匹配项，显示所有可能的选项
  if (completions.value.length === 0) {
    if (words.length === 1) {
      const allCommands = commonCommands.slice(0, 15) // 限制显示数量
      completionType.value = 'command'
      showCompletionPopup(allCommands)
    } else {
      let allFiles = []
      if (connectionStatus.value === 'connected') {
        allFiles = await getRemoteFiles()
      } else {
        allFiles = getCurrentDirectoryFiles()
      }
      completionType.value = 'file'
      showCompletionPopup(allFiles.slice(0, 15))
    }
  }
}

// 更新补全建议
async function updateCompletions() {
  const command = currentCommand.value
  const words = command.split(' ')
  const currentWord = words[words.length - 1]

  if (!currentWord || currentWord.length < 1) {
    hideCompletions()
    return
  }

  let matches = []

  if (words.length === 1) {
    // 命令补全
    completionType.value = 'command'
    matches = commonCommands.filter(cmd =>
      cmd.text.toLowerCase().startsWith(currentWord.toLowerCase())
    ).slice(0, 12)
  } else {
    // 文件补全 - 使用真实的远程文件
    completionType.value = 'file'
    if (connectionStatus.value === 'connected') {
      matches = await updateFileCompletions(currentWord)
    } else {
      // 如果未连接，使用本地模拟文件
      const files = getCurrentDirectoryFiles()
      matches = files.filter(file =>
        file.text.toLowerCase().startsWith(currentWord.toLowerCase())
      ).slice(0, 12)
    }
  }

  if (matches.length > 0) {
    showCompletionPopup(matches)
  } else {
    hideCompletions()
  }
}

// 显示补全弹窗
function showCompletionPopup(matches) {
  completions.value = matches
  selectedCompletion.value = 0
  showCompletions.value = true

  // 自动滚动到第一个选项
  nextTick(() => {
    scrollCompletionIntoView()
  })
}

// 选择补全项
function selectCompletion(completion) {
  const words = currentCommand.value.split(' ')

  if (words.length === 1) {
    currentCommand.value = completion.text + ' '
  } else {
    words[words.length - 1] = completion.text
    currentCommand.value = words.join(' ')
    if (completion.type === 'directory') {
      // 目录后面不加空格，方便继续输入路径
    } else if (completion.type === 'command') {
      currentCommand.value += ' '
    } else {
      currentCommand.value += ' '
    }
  }

  hideCompletions()
  updateCommandHint()
  commandInput.value?.focus()
}

// 隐藏补全
function hideCompletions() {
  showCompletions.value = false
  completions.value = []
  selectedCompletion.value = 0
}

// 格式化终端行
function formatLine(line) {
  let content = line.content

  // 添加时间戳
  const time = line.timestamp ?
    `<span class="timestamp">[${line.timestamp.toLocaleTimeString()}]</span> ` : ''

  // 根据类型添加前缀和样式
  switch (line.type) {
    case 'command':
      return `${time}<span class="command-prefix">${currentPrompt.value}</span><span class="command-text">${content}</span>`
    case 'output':
      return `${time}<span class="output-text">${content}</span>`
    case 'error':
      return `${time}<span class="error-text">❌ ${content}</span>`
    case 'info':
      return `${time}<span class="info-text">ℹ️ ${content}</span>`
    case 'success':
      return `${time}<span class="success-text">✅ ${content}</span>`
    default:
      return `${time}${content}`
  }
}

function handleKeyUp(event) {
  // 处理其他按键事件
}

// 清空终端
function clearTerminal() {
  if (useInteractiveMode.value && xterm) {
    xterm.clear()
  } else {
    terminalLines.value = []
  }
}

// 切换终端模式
function toggleTerminalMode() {
  useInteractiveMode.value = !useInteractiveMode.value

  if (useInteractiveMode.value) {
    // 切换到交互模式
    nextTick(() => {
      initializeXterm()
    })
  } else {
    // 切换到简单模式
    destroyXterm()
    nextTick(() => {
      commandInput.value?.focus()
    })
  }
}

// 初始化 xterm.js
function initializeXterm() {
  if (xterm || !xtermContainer.value) return

  console.log('初始化 xterm.js 终端')

  // 创建终端实例
  xterm = new Terminal({
    theme: {
      background: '#1a1a1a',
      foreground: '#ffffff',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selection: 'rgba(255, 255, 255, 0.3)',
      black: '#000000',
      red: '#e06c75',
      green: '#98c379',
      yellow: '#e5c07b',
      blue: '#61afef',
      magenta: '#c678dd',
      cyan: '#56b6c2',
      white: '#ffffff',
      brightBlack: '#5c6370',
      brightRed: '#e06c75',
      brightGreen: '#98c379',
      brightYellow: '#e5c07b',
      brightBlue: '#61afef',
      brightMagenta: '#c678dd',
      brightCyan: '#56b6c2',
      brightWhite: '#ffffff'
    },
    fontSize: 14,
    fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
    cursorBlink: true,
    cursorStyle: 'block',
    scrollback: 1000,
    tabStopWidth: 4,
    allowTransparency: true,
    convertEol: true,
    disableStdin: false
  })

  // 添加插件
  fitAddon = new FitAddon()
  searchAddon = new SearchAddon()
  webLinksAddon = new WebLinksAddon()

  xterm.loadAddon(fitAddon)
  xterm.loadAddon(searchAddon)
  xterm.loadAddon(webLinksAddon)

  // 打开终端
  xterm.open(xtermContainer.value)

  // 适配大小
  setTimeout(() => {
    fitAddon.fit()
  }, 100)

  // 监听数据输入
  xterm.onData(data => {
    sendTerminalInput(data)
  })

  // 监听窗口大小变化
  window.addEventListener('resize', handleTerminalResize)

  // 显示欢迎信息
  xterm.write('\x1b[32m交互式终端已启动\x1b[0m\r\n')
  xterm.write('\x1b[33m提示: 现在可以运行 top, htop, vi 等交互式命令\x1b[0m\r\n')

  // 连接到后端的交互式终端
  connectInteractiveTerminal()
}

// 销毁 xterm.js
function destroyXterm() {
  if (xterm) {
    // 关闭后端的交互式终端会话
    closeInteractiveTerminal()

    // 移除事件监听
    window.removeEventListener('resize', handleTerminalResize)

    // 销毁终端
    xterm.dispose()
    xterm = null
    fitAddon = null
    searchAddon = null
    webLinksAddon = null
  }
}

// 处理终端大小变化
function handleTerminalResize() {
  if (fitAddon && xterm) {
    fitAddon.fit()

    // 通知后端调整终端大小
    const dimensions = fitAddon.proposeDimensions()
    if (dimensions) {
      window.go.main.App.ResizeTerminal(props.configId, dimensions.cols, dimensions.rows)
        .catch(err => console.error('调整终端大小失败:', err))
    }
  }
}

// 发送终端输入到后端
async function sendTerminalInput(data) {
  try {
    await window.go.main.App.SendTerminalInput(props.configId, data)
  } catch (error) {
    console.error('发送终端输入失败:', error)
    if (xterm) {
      xterm.write('\r\n\x1b[31m发送输入失败: ' + error.message + '\x1b[0m\r\n')
    }
  }
}

// 连接交互式终端
async function connectInteractiveTerminal() {
  try {
    console.log('连接交互式终端，配置ID:', props.configId)

    // 监听终端输出事件（在创建会话之前设置监听）
    if (typeof window !== 'undefined' && window.runtime) {
      window.runtime.EventsOn('terminal-output', handleTerminalOutput)
      window.runtime.EventsOn('terminal-status', handleTerminalStatus)
    }

    // 创建后端的交互式终端会话
    await window.go.main.App.CreateInteractiveTerminal(props.configId)

    if (xterm) {
      xterm.write('\x1b[32mSSH 交互式会话已建立\x1b[0m\r\n')
    }

    console.log('交互式终端连接成功')
  } catch (error) {
    console.error('连接交互式终端失败:', error)
    if (xterm) {
      xterm.write('\x1b[31m连接失败: ' + error.message + '\x1b[0m\r\n')
      xterm.write('\x1b[33m请检查SSH连接是否正常\x1b[0m\r\n')
    }
  }
}

// 关闭交互式终端
async function closeInteractiveTerminal() {
  try {
    // 移除事件监听
    if (typeof window !== 'undefined' && window.runtime) {
      window.runtime.EventsOff('terminal-output')
      window.runtime.EventsOff('terminal-status')
    }

    // 关闭后端的交互式终端会话
    await window.go.main.App.CloseTerminalSession(props.configId)
  } catch (error) {
    console.error('关闭交互式终端失败:', error)
  }
}

// 处理终端输出事件
function handleTerminalOutput(data) {
  if (data.configId === props.configId && xterm && useInteractiveMode.value) {
    // 直接写入终端，保持原始格式
    xterm.write(data.output)
  }
}

// 处理终端状态事件
function handleTerminalStatus(data) {
  if (data.configId === props.configId) {
    if (data.connected) {
      connectionStatus.value = 'connected'
      statusText.value = '已连接 (交互模式)'
    } else {
      connectionStatus.value = 'disconnected'
      statusText.value = '连接已断开'
      if (xterm) {
        xterm.write('\r\n\x1b[31m连接已断开\x1b[0m\r\n')
      }
    }
  }
}

// 运行诊断测试
async function runDiagnostics() {
  if (!xterm || !useInteractiveMode.value) return

  xterm.write('\r\n\x1b[36m=== 开始诊断测试 ===\x1b[0m\r\n')

  const diagnosticCommands = [
    'echo "1. 环境变量检查"',
    'echo "TERM: $TERM"',
    'echo "LANG: $LANG"',
    'echo "USER: $USER"',
    'echo ""',
    'echo "2. 用户权限检查"',
    'whoami',
    'id',
    'echo ""',
    'echo "3. top 命令检查"',
    'which top',
    'ls -la /usr/bin/top 2>/dev/null || echo "top 命令不存在"',
    'echo ""',
    'echo "4. /proc 文件系统检查"',
    'ls -ld /proc',
    'cat /proc/loadavg 2>/dev/null || echo "无法访问 /proc/loadavg"',
    'echo ""',
    'echo "5. 测试 top 单次运行"',
    'top -n 1 -b | head -5 2>/dev/null || echo "top -n 1 失败"',
    'echo ""',
    'echo "6. 替代命令测试"',
    'ps aux | head -3',
    'uptime',
    'echo ""',
    'echo "=== 诊断测试完成 ==="',
    'echo "如果上述测试正常，请尝试运行: top"'
  ]

  for (const cmd of diagnosticCommands) {
    await sendTerminalInput(cmd + '\r')
    // 等待一小段时间让命令执行
    await new Promise(resolve => setTimeout(resolve, 200))
  }
}

// 建立SSH连接
async function connectSSH() {
  try {
    connectionStatus.value = 'connecting'
    statusText.value = '正在连接SSH服务器...'

    // 使用现有的CreateSession函数
    await window.go.main.App.CreateSession(props.configId)

    connectionStatus.value = 'connected'
    statusText.value = useInteractiveMode.value ? '已连接 (交互模式)' : '已连接 (简单模式)'

    // 启动会话计时器
    startSessionTimer()

    // 获取连接信息
    try {
      const pwdOutput = await window.go.main.App.ExecuteCommand(props.configId, 'pwd')
      currentPath.value = pwdOutput.trim() || '~'

      const whoamiOutput = await window.go.main.App.ExecuteCommand(props.configId, 'whoami')
      const username = whoamiOutput.trim() || 'user'

      const hostnameOutput = await window.go.main.App.ExecuteCommand(props.configId, 'hostname')
      const hostname = hostnameOutput.trim() || 'server'

      currentPrompt.value = `${username}@${hostname}:${currentPath.value}$ `

      terminalLines.value.push({
        type: 'success',
        content: `成功连接到 ${hostname}`,
        timestamp: new Date()
      })

      terminalLines.value.push({
        type: 'info',
        content: `欢迎来到 ${username}@${hostname}`,
        timestamp: new Date()
      })

    } catch (infoError) {
      // 如果获取信息失败，使用默认值
      currentPath.value = '~'
      currentPrompt.value = 'user@server:~$ '

      terminalLines.value.push({
        type: 'success',
        content: 'SSH连接成功',
        timestamp: new Date()
      })
    }

    message.success('SSH连接成功')

  } catch (error) {
    connectionStatus.value = 'disconnected'
    statusText.value = '连接失败'

    terminalLines.value.push({
      type: 'error',
      content: `SSH连接失败: ${error.message}`,
      timestamp: new Date()
    })

    message.error(`SSH连接失败: ${error.message}`)
    console.error('SSH连接错误:', error)
  }
}

// 重新连接
async function reconnect() {
  connectionStatus.value = 'connecting'
  statusText.value = '正在重连...'

  try {
    // 如果是交互模式，先关闭交互式终端
    if (useInteractiveMode.value && xterm) {
      await closeInteractiveTerminal()
    }

    // 先断开现有连接
    await disconnectSSH()

    // 清空终端
    if (!useInteractiveMode.value) {
      terminalLines.value = []
    }

    // 等待一下
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 重新连接
    await connectSSH()

    // 如果是交互模式，重新初始化终端
    if (useInteractiveMode.value) {
      await nextTick()
      if (xtermContainer.value) {
        initializeXterm()
      }
    }
  } catch (error) {
    console.error('重连失败:', error)
    connectionStatus.value = 'disconnected'
    statusText.value = '重连失败'
    message.error(`重连失败: ${error.message}`)
  }
}

// 断开SSH连接
async function disconnectSSH() {
  try {
    await window.go.main.App.CloseSession(props.configId)

    // 停止会话计时器
    stopSessionTimer()

    // 更新状态
    connectionStatus.value = 'disconnected'
    statusText.value = '已断开'
  } catch (error) {
    console.error('断开连接失败:', error)
  }
}

// 滚动到底部
function scrollToBottom() {
  if (terminalOutput.value) {
    terminalOutput.value.scrollTop = terminalOutput.value.scrollHeight
  }
}

// 获取远程文件列表用于补全
async function getRemoteFiles(path = '.') {
  try {
    // 使用现有的ListRemoteFiles函数
    const files = await window.go.main.App.ListRemoteFiles(props.configId, path)

    if (files && Array.isArray(files)) {
      return files.map(file => ({
        text: file.isDir ? file.name + '/' : file.name,
        type: file.isDir ? 'directory' : 'file',
        permissions: file.mode,
        size: file.size
      }))
    }
  } catch (error) {
    console.error('获取远程文件列表失败:', error)

    // 如果ListRemoteFiles失败，尝试使用ls命令
    try {
      const lsOutput = await window.go.main.App.ExecuteCommand(props.configId, `ls -la ${path}`)
      return parseLSOutput(lsOutput)
    } catch (lsError) {
      console.error('ls命令也失败:', lsError)
    }
  }

  // 如果获取失败，返回默认文件列表
  return getCurrentDirectoryFiles()
}

// 解析ls命令输出
function parseLSOutput(output) {
  const files = []
  const lines = output.split('\n')

  for (const line of lines) {
    const trimmedLine = line.trim()
    if (!trimmedLine || trimmedLine.startsWith('total') || trimmedLine === '') {
      continue
    }

    const parts = trimmedLine.split(/\s+/)
    if (parts.length < 9) continue

    const permissions = parts[0]
    const name = parts.slice(8).join(' ')

    // 跳过当前目录和父目录
    if (name === '.' || name === '..') continue

    const isDirectory = permissions.startsWith('d')

    files.push({
      text: isDirectory ? name + '/' : name,
      type: isDirectory ? 'directory' : 'file',
      permissions: permissions,
      size: parts[4]
    })
  }

  return files
}

// 更新文件补全（使用真实的远程文件）
async function updateFileCompletions(currentWord) {
  try {
    const files = await getRemoteFiles()
    const matches = files.filter(file =>
      file.text.toLowerCase().startsWith(currentWord.toLowerCase())
    ).slice(0, 12)

    return matches
  } catch (error) {
    console.error('更新文件补全失败:', error)
    return getCurrentDirectoryFiles().filter(file =>
      file.text.toLowerCase().startsWith(currentWord.toLowerCase())
    ).slice(0, 12)
  }
}

// 监听连接状态
watch(() => props.configId, async (newConfigId, oldConfigId) => {
  if (newConfigId && newConfigId !== oldConfigId) {
    // 清空终端
    terminalLines.value = []

    // 重置状态
    currentCommand.value = ''
    commandHistory.value = []
    historyIndex.value = -1

    // 建立新连接
    await connectSSH()
  }
}, { immediate: true })

// 会话计时器
let sessionTimer = null
const sessionStartTime = ref(null)

// 启动会话计时器
function startSessionTimer() {
  sessionStartTime.value = new Date()
  sessionTimer = setInterval(() => {
    if (sessionStartTime.value) {
      const now = new Date()
      const diff = now - sessionStartTime.value
      const hours = Math.floor(diff / (1000 * 60 * 60))
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
      const seconds = Math.floor((diff % (1000 * 60)) / 1000)
      sessionTime.value = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    }
  }, 1000)
}

// 停止会话计时器
function stopSessionTimer() {
  if (sessionTimer) {
    clearInterval(sessionTimer)
    sessionTimer = null
  }
  sessionStartTime.value = null
  sessionTime.value = '00:00:00'
}

onMounted(() => {
  // 聚焦输入框
  if (!useInteractiveMode.value && commandInput.value) {
    commandInput.value.focus()
  }

  // 如果有配置ID，立即连接
  if (props.configId) {
    connectSSH()
  }
})

onUnmounted(() => {
  // 停止会话计时器
  stopSessionTimer()

  // 销毁交互式终端
  destroyXterm()

  // 断开SSH连接
  if (connectionStatus.value === 'connected') {
    disconnectSSH()
  }
})

// 监听终端模式变化
watch(useInteractiveMode, (newMode) => {
  statusText.value = connectionStatus.value === 'connected'
    ? (newMode ? '已连接 (交互模式)' : '已连接 (简单模式)')
    : statusText.value
})
</script>

<style scoped>
.ssh-terminal {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #0c0c0c;
  color: #cccccc;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  border: 1px solid #333333;
  border-radius: 6px;
  overflow: hidden;
}

/* 终端头部 */
.terminal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  border-bottom: 1px solid #404040;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.terminal-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: #e0e0e0;
}

.terminal-actions {
  display: flex;
  gap: 6px;
}

/* 终端容器 */
.terminal-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: relative;
}

.xterm-container {
  flex: 1;
  width: 100%;
  height: 100%;
  background: #1a1a1a;
}

.simple-terminal {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.terminal-output {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  line-height: 1.5;
  font-size: 13px;
  background: #0c0c0c;
}

/* 终端行样式 */
.terminal-line {
  margin-bottom: 2px;
  word-wrap: break-word;
  white-space: pre-wrap;
}

.terminal-line.command {
  color: #569cd6;
  font-weight: 500;
}

.terminal-line.output {
  color: #cccccc;
}

.terminal-line.error {
  color: #ff6b6b;
  background: rgba(255, 107, 107, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  border-left: 3px solid #ff6b6b;
}

.terminal-line.info {
  color: #4ecdc4;
  background: rgba(78, 205, 196, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  border-left: 3px solid #4ecdc4;
}

.terminal-line.success {
  color: #51cf66;
  background: rgba(81, 207, 102, 0.1);
  padding: 2px 6px;
  border-radius: 3px;
  border-left: 3px solid #51cf66;
}

/* 时间戳样式 */
.timestamp {
  color: #666666;
  font-size: 11px;
  margin-right: 8px;
}

.command-prefix {
  color: #4ecdc4;
  font-weight: bold;
}

.command-text {
  color: #ffffff;
}

.output-text {
  color: #cccccc;
}

.error-text {
  color: #ff6b6b;
}

.info-text {
  color: #4ecdc4;
}

.success-text {
  color: #51cf66;
}

/* 输入行样式 */
.terminal-input-line {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
  border-top: 1px solid #333333;
  box-shadow: 0 -1px 3px rgba(0, 0, 0, 0.2);
}

.prompt {
  color: #4ecdc4;
  font-weight: bold;
  margin-right: 8px;
  white-space: nowrap;
}

.input-container {
  flex: 1;
  position: relative;
  display: flex;
  align-items: center;
}

.command-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #ffffff;
  font-family: inherit;
  font-size: 13px;
  padding: 0;
}

.command-input::placeholder {
  color: #666666;
  font-style: italic;
}

.command-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cursor {
  width: 8px;
  height: 16px;
  background: #4ecdc4;
  margin-left: 2px;
}

.cursor.blinking {
  animation: blink 1s infinite;
}

@keyframes blink {

  0%,
  50% {
    opacity: 1;
  }

  51%,
  100% {
    opacity: 0;
  }
}

/* 补全弹窗样式 */
.completions-popup {
  position: absolute;
  bottom: 100%;
  left: 0;
  right: 0;
  background: #1e1e1e;
  border: 1px solid #404040;
  border-radius: 6px;
  box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.4);
  z-index: 1000;
  max-height: 300px;
  overflow: hidden;
  margin-bottom: 8px;
}

.completions-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  border-bottom: 1px solid #404040;
}

.completions-title {
  font-size: 12px;
  font-weight: 600;
  color: #4ecdc4;
}

.completions-hint {
  font-size: 11px;
  color: #888888;
}

.completions-list {
  max-height: 200px;
  overflow-y: auto;
}

.completion-item {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  border-bottom: 1px solid #2a2a2a;
}

.completion-item:last-child {
  border-bottom: none;
}

.completion-item:hover,
.completion-item.active {
  background: linear-gradient(135deg, #2d4a87 0%, #1e3a5f 100%);
  color: #ffffff;
}

.completion-item.is-command {
  border-left: 3px solid #569cd6;
}

.completion-item.is-file {
  border-left: 3px solid #51cf66;
}

.completion-item.is-directory {
  border-left: 3px solid #ffd43b;
}

.completion-icon {
  margin-right: 10px;
  font-size: 14px;
  width: 16px;
  text-align: center;
}

.completion-content {
  flex: 1;
  min-width: 0;
}

.completion-text {
  font-weight: 500;
  color: inherit;
}

.completion-description {
  font-size: 11px;
  color: #888888;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.completion-item.active .completion-description {
  color: #cccccc;
}

.completion-type-badge {
  font-size: 10px;
  padding: 2px 6px;
  background: #404040;
  color: #cccccc;
  border-radius: 3px;
  text-transform: uppercase;
  font-weight: 500;
}

.completion-item.active .completion-type-badge {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
}

.completions-footer {
  padding: 6px 12px;
  background: #252526;
  border-top: 1px solid #404040;
  text-align: right;
}

.completions-count {
  font-size: 11px;
  color: #888888;
}

/* 命令提示样式 */
.command-hint {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1a1a1a;
  border: 1px solid #404040;
  border-radius: 6px;
  padding: 12px;
  margin-top: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  z-index: 999;
}

.hint-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.hint-command {
  font-weight: bold;
  color: #4ecdc4;
  font-size: 14px;
}

.hint-description {
  color: #cccccc;
  font-size: 13px;
}

.hint-usage {
  margin-bottom: 8px;
  font-size: 12px;
  color: #888888;
}

.hint-examples {
  font-size: 12px;
  color: #888888;
}

.hint-example {
  margin-left: 16px;
  margin-top: 2px;
  color: #569cd6;
  font-family: monospace;
}

/* 状态栏样式 */
.terminal-status {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 16px;
  background: linear-gradient(135deg, #2d2d30 0%, #252526 100%);
  border-top: 1px solid #404040;
  font-size: 11px;
}

.status-left,
.status-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.connection-indicator {
  display: flex;
  align-items: center;
  gap: 6px;
}

.indicator-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #666666;
}

.connection-indicator.connecting .indicator-dot {
  background: #ffd43b;
  animation: pulse 1.5s infinite;
}

.connection-indicator.connected .indicator-dot {
  background: #51cf66;
}

.connection-indicator.disconnected .indicator-dot {
  background: #ff6b6b;
}

@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.status-text {
  color: #cccccc;
  font-weight: 500;
}

.separator {
  color: #666666;
  margin: 0 4px;
}

.current-path {
  color: #4ecdc4;
  font-weight: 500;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.session-time {
  color: #888888;
}

.command-count {
  color: #888888;
}

/* 滚动条样式 */
.terminal-output::-webkit-scrollbar,
.completions-list::-webkit-scrollbar {
  width: 6px;
}

.terminal-output::-webkit-scrollbar-track,
.completions-list::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.terminal-output::-webkit-scrollbar-thumb,
.completions-list::-webkit-scrollbar-thumb {
  background: #404040;
  border-radius: 3px;
}

.terminal-output::-webkit-scrollbar-thumb:hover,
.completions-list::-webkit-scrollbar-thumb:hover {
  background: #555555;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .terminal-header {
    padding: 6px 10px;
  }

  .terminal-output {
    padding: 10px 12px;
    font-size: 12px;
  }

  .terminal-input-line {
    padding: 8px 12px;
  }

  .command-input {
    font-size: 12px;
  }

  .completions-popup {
    max-height: 200px;
  }

  .completion-item {
    padding: 6px 10px;
  }
}
</style>