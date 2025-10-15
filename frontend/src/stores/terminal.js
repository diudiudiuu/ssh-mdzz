import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { TERMINAL_CONFIG, TERMINAL_THEMES } from '@/utils/constants'

export const useTerminalStore = defineStore('terminal', () => {
  // State
  const terminals = ref([])
  const activeTerminalId = ref(null)
  const settings = ref({
    ...TERMINAL_CONFIG,
    theme: 'dark'
  })

  // Getters
  const activeTerminal = computed(() => 
    terminals.value.find(t => t.id === activeTerminalId.value)
  )

  const terminalCount = computed(() => terminals.value.length)

  const currentTheme = computed(() => {
    const themeName = settings.value.theme
    return TERMINAL_THEMES[themeName] || TERMINAL_THEMES.dark
  })

  // Actions

  /**
   * 创建终端
   */
  function createTerminal(config) {
    const terminal = {
      id: config.id || Date.now().toString(),
      configId: config.configId,
      title: config.title || 'Terminal',
      instance: null,
      isActive: true,
      createdAt: new Date()
    }

    terminals.value.push(terminal)
    activeTerminalId.value = terminal.id

    return terminal
  }

  /**
   * 移除终端
   */
  function removeTerminal(id) {
    const index = terminals.value.findIndex(t => t.id === id)
    if (index === -1) return

    // 释放终端实例
    const terminal = terminals.value[index]
    if (terminal.instance) {
      terminal.instance.dispose()
    }

    terminals.value.splice(index, 1)

    // 如果删除的是当前活动终端，切换到最后一个
    if (activeTerminalId.value === id) {
      const lastTerminal = terminals.value[terminals.value.length - 1]
      activeTerminalId.value = lastTerminal ? lastTerminal.id : null
    }
  }

  /**
   * 设置活动终端
   */
  function setActiveTerminal(id) {
    const terminal = terminals.value.find(t => t.id === id)
    if (terminal) {
      activeTerminalId.value = id
    }
  }

  /**
   * 更新终端实例
   */
  function updateTerminalInstance(id, instance) {
    const terminal = terminals.value.find(t => t.id === id)
    if (terminal) {
      terminal.instance = instance
    }
  }

  /**
   * 更新终端标题
   */
  function updateTerminalTitle(id, title) {
    const terminal = terminals.value.find(t => t.id === id)
    if (terminal) {
      terminal.title = title
    }
  }

  /**
   * 获取终端
   */
  function getTerminal(id) {
    return terminals.value.find(t => t.id === id)
  }

  /**
   * 清空所有终端
   */
  function clearAllTerminals() {
    terminals.value.forEach(terminal => {
      if (terminal.instance) {
        terminal.instance.dispose()
      }
    })
    terminals.value = []
    activeTerminalId.value = null
  }

  /**
   * 更新终端设置
   */
  function updateSettings(newSettings) {
    settings.value = {
      ...settings.value,
      ...newSettings
    }

    // 应用到所有现有终端
    terminals.value.forEach(terminal => {
      if (terminal.instance) {
        applySettingsToTerminal(terminal.instance)
      }
    })
  }

  /**
   * 应用设置到终端实例
   */
  function applySettingsToTerminal(instance) {
    if (!instance) return

    instance.options.fontSize = settings.value.fontSize
    instance.options.fontFamily = settings.value.fontFamily
    instance.options.cursorBlink = settings.value.cursorBlink
    instance.options.cursorStyle = settings.value.cursorStyle
    instance.options.theme = currentTheme.value
  }

  /**
   * 切换主题
   */
  function toggleTheme() {
    const themes = Object.keys(TERMINAL_THEMES)
    const currentIndex = themes.indexOf(settings.value.theme)
    const nextIndex = (currentIndex + 1) % themes.length
    settings.value.theme = themes[nextIndex]

    // 应用到所有终端
    terminals.value.forEach(terminal => {
      if (terminal.instance) {
        terminal.instance.options.theme = currentTheme.value
      }
    })
  }

  /**
   * 设置主题
   */
  function setTheme(themeName) {
    if (TERMINAL_THEMES[themeName]) {
      settings.value.theme = themeName

      // 应用到所有终端
      terminals.value.forEach(terminal => {
        if (terminal.instance) {
          terminal.instance.options.theme = currentTheme.value
        }
      })
    }
  }

  /**
   * 调整字体大小
   */
  function changeFontSize(delta) {
    const newSize = settings.value.fontSize + delta
    if (newSize >= 8 && newSize <= 32) {
      settings.value.fontSize = newSize

      terminals.value.forEach(terminal => {
        if (terminal.instance) {
          terminal.instance.options.fontSize = newSize
        }
      })
    }
  }

  /**
   * 写入数据到终端
   */
  function writeToTerminal(id, data) {
    const terminal = getTerminal(id)
    if (terminal && terminal.instance) {
      terminal.instance.write(data)
    }
  }

  /**
   * 清空终端
   */
  function clearTerminal(id) {
    const terminal = getTerminal(id)
    if (terminal && terminal.instance) {
      terminal.instance.clear()
    }
  }

  /**
   * 重置终端
   */
  function resetTerminal(id) {
    const terminal = getTerminal(id)
    if (terminal && terminal.instance) {
      terminal.instance.reset()
    }
  }

  return {
    // State
    terminals,
    activeTerminalId,
    settings,

    // Getters
    activeTerminal,
    terminalCount,
    currentTheme,

    // Actions
    createTerminal,
    removeTerminal,
    setActiveTerminal,
    updateTerminalInstance,
    updateTerminalTitle,
    getTerminal,
    clearAllTerminals,
    updateSettings,
    applySettingsToTerminal,
    toggleTheme,
    setTheme,
    changeFontSize,
    writeToTerminal,
    clearTerminal,
    resetTerminal
  }
})