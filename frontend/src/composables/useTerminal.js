import { ref, nextTick, onUnmounted } from 'vue'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { SearchAddon } from 'xterm-addon-search'
import { WebLinksAddon } from 'xterm-addon-web-links'
import { useTerminalStore } from '@/stores/terminal'
import { useConnectionStore } from '@/stores/connection'
import { useMessage } from 'naive-ui'
import { TERMINAL_CONFIG } from '@/utils/constants'

export function useTerminal() {
    const terminalStore = useTerminalStore()
    const connectionStore = useConnectionStore()
    const message = useMessage()

    // 响应式状态
    const isConnected = ref(false)
    const isConnecting = ref(false)
    const currentCommand = ref('')
    const commandHistory = ref([])
    const historyIndex = ref(-1)

    // 终端实例和插件
    let terminal = null
    let fitAddon = null
    let searchAddon = null
    let webLinksAddon = null
    let websocket = null

    /**
     * 创建终端实例
     */
    function createTerminal(container, config = {}) {
        if (terminal) {
            terminal.dispose()
        }

        // 合并配置
        const terminalConfig = {
            ...TERMINAL_CONFIG,
            ...terminalStore.settings,
            ...config
        }

        // 创建终端实例
        terminal = new Terminal({
            fontSize: terminalConfig.fontSize,
            fontFamily: terminalConfig.fontFamily,
            cursorBlink: terminalConfig.cursorBlink,
            cursorStyle: terminalConfig.cursorStyle,
            scrollback: terminalConfig.scrollback,
            theme: terminalStore.currentTheme,
            allowTransparency: true,
            convertEol: true,
            disableStdin: false,
            rightClickSelectsWord: true,
            macOptionIsMeta: true
        })

        // 创建插件
        fitAddon = new FitAddon()
        searchAddon = new SearchAddon()
        webLinksAddon = new WebLinksAddon()

        // 加载插件
        terminal.loadAddon(fitAddon)
        terminal.loadAddon(searchAddon)
        terminal.loadAddon(webLinksAddon)

        // 打开终端
        terminal.open(container)

        // 自适应大小
        fitAddon.fit()

        // 设置事件监听
        setupTerminalEvents()

        return terminal
    }

    /**
     * 设置终端事件监听
     */
    function setupTerminalEvents() {
        if (!terminal) return

        // 监听用户输入
        terminal.onData(handleTerminalInput)

        // 监听键盘事件
        terminal.onKey(handleKeyPress)

        // 监听选择事件
        terminal.onSelectionChange(() => {
            const selection = terminal.getSelection()
            if (selection) {
                // 可以在这里处理选择文本的逻辑
            }
        })

        // 监听标题变化
        terminal.onTitleChange((title) => {
            const activeTerminal = terminalStore.activeTerminal
            if (activeTerminal) {
                terminalStore.updateTerminalTitle(activeTerminal.id, title)
            }
        })

        // 监听窗口大小变化
        window.addEventListener('resize', handleResize)
    }

    /**
     * 处理终端输入
     */
    function handleTerminalInput(data) {
        if (!isConnected.value || !websocket) return

        // 处理特殊键
        const code = data.charCodeAt(0)

        if (code === 13) { // Enter
            // 添加到命令历史
            if (currentCommand.value.trim()) {
                addToHistory(currentCommand.value.trim())
                currentCommand.value = ''
                historyIndex.value = -1
            }
        } else if (code === 127) { // Backspace
            if (currentCommand.value.length > 0) {
                currentCommand.value = currentCommand.value.slice(0, -1)
            }
        } else if (code >= 32 && code <= 126) { // 可打印字符
            currentCommand.value += data
        }

        // 发送数据到服务器
        sendToServer(data)
    }

    /**
     * 处理按键事件
     */
    function handleKeyPress({ key, domEvent }) {
        const { ctrlKey, altKey, shiftKey, metaKey } = domEvent

        // Ctrl+C - 复制或中断
        if (ctrlKey && key === 'c') {
            const selection = terminal.getSelection()
            if (selection) {
                copyToClipboard(selection)
                terminal.clearSelection()
                domEvent.preventDefault()
                return
            }
        }

        // Ctrl+V - 粘贴
        if (ctrlKey && key === 'v') {
            pasteFromClipboard()
            domEvent.preventDefault()
            return
        }

        // Ctrl+A - 全选
        if (ctrlKey && key === 'a') {
            terminal.selectAll()
            domEvent.preventDefault()
            return
        }

        // Ctrl+F - 搜索
        if (ctrlKey && key === 'f') {
            openSearch()
            domEvent.preventDefault()
            return
        }

        // 上下箭头 - 命令历史
        if (key === 'ArrowUp') {
            navigateHistory('up')
            domEvent.preventDefault()
            return
        }

        if (key === 'ArrowDown') {
            navigateHistory('down')
            domEvent.preventDefault()
            return
        }

        // Ctrl+L - 清屏
        if (ctrlKey && key === 'l') {
            clearTerminal()
            domEvent.preventDefault()
            return
        }

        // Ctrl++ / Ctrl+- - 字体大小调整
        if (ctrlKey && key === '=') {
            changeFontSize(1)
            domEvent.preventDefault()
            return
        }

        if (ctrlKey && key === '-') {
            changeFontSize(-1)
            domEvent.preventDefault()
            return
        }
    }

    /**
     * 连接到 SSH 服务器
     */
    async function connectToSSH(configId) {
        if (isConnecting.value) return

        isConnecting.value = true

        try {
            // 创建 SSH 会话
            await connectionStore.createSession(configId)

            // 这里应该建立 WebSocket 连接到后端的终端会话
            // 由于 Wails 的特性，我们可能需要使用事件系统而不是 WebSocket
            await setupSSHConnection(configId)

            isConnected.value = true
            message.success('终端连接成功')

            // 发送初始命令获取提示符
            writeToTerminal('\r')

        } catch (error) {
            message.error(`终端连接失败: ${error.message}`)
            console.error('终端连接失败:', error)
        } finally {
            isConnecting.value = false
        }
    }

    /**
     * 设置 SSH 连接（使用 Wails 事件系统）
     */
    async function setupSSHConnection(configId) {
        // 在 Wails 应用中，我们使用事件系统而不是 WebSocket
        // 这里需要根据你的后端 API 调整

        // 监听来自后端的终端输出
        window.runtime.EventsOn('terminal-output', (data) => {
            if (terminal && data.configId === configId) {
                terminal.write(data.output)
            }
        })

        // 监听连接状态变化
        window.runtime.EventsOn('terminal-status', (status) => {
            if (status.configId === configId) {
                isConnected.value = status.connected
                if (!status.connected) {
                    message.warning('终端连接已断开')
                }
            }
        })
    }

    /**
     * 发送数据到服务器
     */
    async function sendToServer(data) {
        if (!isConnected.value) return

        try {
            const activeTerminal = terminalStore.activeTerminal
            if (activeTerminal) {
                // 调用后端 API 发送终端输入
                await window.go.main.App.SendTerminalInput(activeTerminal.configId, data)
            }
        } catch (error) {
            console.error('发送终端数据失败:', error)
        }
    }

    /**
     * 执行命令
     */
    async function executeCommand(command) {
        if (!isConnected.value) {
            message.warning('请先连接到服务器')
            return
        }

        try {
            const activeTerminal = terminalStore.activeTerminal
            if (activeTerminal) {
                const result = await window.go.main.App.ExecuteCommand(activeTerminal.configId, command)
                writeToTerminal(result)
                addToHistory(command)
            }
        } catch (error) {
            message.error(`命令执行失败: ${error.message}`)
            console.error('命令执行失败:', error)
        }
    }

    /**
     * 执行 sudo 命令
     */
    async function executeSudoCommand(command) {
        if (!isConnected.value) {
            message.warning('请先连接到服务器')
            return
        }

        try {
            const activeTerminal = terminalStore.activeTerminal
            if (activeTerminal) {
                const result = await window.go.main.App.ExecuteSudoCommand(activeTerminal.configId, command)
                writeToTerminal(result)
                addToHistory(`sudo ${command}`)
            }
        } catch (error) {
            message.error(`Sudo 命令执行失败: ${error.message}`)
            console.error('Sudo 命令执行失败:', error)
        }
    }

    /**
     * 写入数据到终端
     */
    function writeToTerminal(data) {
        if (terminal) {
            terminal.write(data)
        }
    }

    /**
     * 清空终端
     */
    function clearTerminal() {
        if (terminal) {
            terminal.clear()
            currentCommand.value = ''
        }
    }

    /**
     * 重置终端
     */
    function resetTerminal() {
        if (terminal) {
            terminal.reset()
            currentCommand.value = ''
            historyIndex.value = -1
        }
    }

    /**
     * 调整终端大小
     */
    function resizeTerminal() {
        if (fitAddon) {
            nextTick(() => {
                fitAddon.fit()
            })
        }
    }

    /**
     * 处理窗口大小变化
     */
    function handleResize() {
        resizeTerminal()
    }

    /**
     * 复制到剪贴板
     */
    async function copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text)
            message.success('已复制到剪贴板')
        } catch (error) {
            console.error('复制失败:', error)
            message.error('复制失败')
        }
    }

    /**
     * 从剪贴板粘贴
     */
    async function pasteFromClipboard() {
        try {
            const text = await navigator.clipboard.readText()
            if (text && isConnected.value) {
                sendToServer(text)
            }
        } catch (error) {
            console.error('粘贴失败:', error)
            message.error('粘贴失败')
        }
    }

    /**
     * 打开搜索
     */
    function openSearch() {
        if (searchAddon) {
            // 这里可以触发搜索 UI 的显示
            // 具体实现取决于你的 UI 设计
        }
    }

    /**
     * 搜索文本
     */
    function searchText(query, options = {}) {
        if (searchAddon && terminal) {
            return searchAddon.findNext(query, options)
        }
        return false
    }

    /**
     * 添加到命令历史
     */
    function addToHistory(command) {
        if (command && !commandHistory.value.includes(command)) {
            commandHistory.value.unshift(command)

            // 限制历史记录数量
            if (commandHistory.value.length > 100) {
                commandHistory.value = commandHistory.value.slice(0, 100)
            }
        }
    }

    /**
     * 导航命令历史
     */
    function navigateHistory(direction) {
        if (commandHistory.value.length === 0) return

        if (direction === 'up') {
            if (historyIndex.value < commandHistory.value.length - 1) {
                historyIndex.value++
            }
        } else if (direction === 'down') {
            if (historyIndex.value > -1) {
                historyIndex.value--
            }
        }

        // 更新当前命令
        if (historyIndex.value >= 0) {
            currentCommand.value = commandHistory.value[historyIndex.value]
        } else {
            currentCommand.value = ''
        }

        // 清除当前行并写入历史命令
        if (terminal) {
            terminal.write('\r\x1b[K' + currentCommand.value)
        }
    }

    /**
     * 调整字体大小
     */
    function changeFontSize(delta) {
        terminalStore.changeFontSize(delta)

        if (terminal) {
            terminal.options.fontSize = terminalStore.settings.fontSize
        }
    }

    /**
     * 设置主题
     */
    function setTheme(themeName) {
        terminalStore.setTheme(themeName)

        if (terminal) {
            terminal.options.theme = terminalStore.currentTheme
        }
    }

    /**
     * 断开连接
     */
    function disconnect() {
        isConnected.value = false

        if (websocket) {
            websocket.close()
            websocket = null
        }

        // 移除事件监听
        if (typeof window !== 'undefined' && window.runtime) {
            window.runtime.EventsOff('terminal-output')
            window.runtime.EventsOff('terminal-status')
        }
    }

    /**
     * 销毁终端
     */
    function dispose() {
        disconnect()

        if (terminal) {
            terminal.dispose()
            terminal = null
        }

        fitAddon = null
        searchAddon = null
        webLinksAddon = null

        // 移除窗口事件监听
        window.removeEventListener('resize', handleResize)
    }

    // 组件卸载时清理资源
    onUnmounted(() => {
        dispose()
    })

    return {
        // 状态
        isConnected,
        isConnecting,
        currentCommand,
        commandHistory,
        terminal,

        // 方法
        createTerminal,
        connectToSSH,
        disconnect,
        executeCommand,
        executeSudoCommand,
        writeToTerminal,
        clearTerminal,
        resetTerminal,
        resizeTerminal,
        copyToClipboard,
        pasteFromClipboard,
        searchText,
        changeFontSize,
        setTheme,
        dispose,

        // 工具方法
        addToHistory,
        navigateHistory
    }
}