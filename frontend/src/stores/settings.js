import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { STORAGE_KEYS } from '@/utils/constants'

export const useSettingsStore = defineStore('settings', () => {
  // State
  const theme = ref('dark')
  const language = ref('zh-CN')
  const autoReconnect = ref(true)
  const keepAliveInterval = ref(60)
  const showLineNumbers = ref(false)
  const autoSave = ref(true)
  const confirmOnDelete = ref(true)
  const confirmOnDisconnect = ref(true)
  const splitDirection = ref('horizontal') // horizontal | vertical
  const sidebarWidth = ref(280)

  // 从 localStorage 加载设置
  function loadSettings() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS)
      if (saved) {
        const settings = JSON.parse(saved)
        theme.value = settings.theme || 'dark'
        language.value = settings.language || 'zh-CN'
        autoReconnect.value = settings.autoReconnect !== false
        keepAliveInterval.value = settings.keepAliveInterval || 60
        showLineNumbers.value = settings.showLineNumbers || false
        autoSave.value = settings.autoSave !== false
        confirmOnDelete.value = settings.confirmOnDelete !== false
        confirmOnDisconnect.value = settings.confirmOnDisconnect !== false
        splitDirection.value = settings.splitDirection || 'horizontal'
        sidebarWidth.value = settings.sidebarWidth || 280
      }
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }

  // 保存设置到 localStorage
  function saveSettings() {
    try {
      const settings = {
        theme: theme.value,
        language: language.value,
        autoReconnect: autoReconnect.value,
        keepAliveInterval: keepAliveInterval.value,
        showLineNumbers: showLineNumbers.value,
        autoSave: autoSave.value,
        confirmOnDelete: confirmOnDelete.value,
        confirmOnDisconnect: confirmOnDisconnect.value,
        splitDirection: splitDirection.value,
        sidebarWidth: sidebarWidth.value
      }
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
    } catch (error) {
      console.error('保存设置失败:', error)
    }
  }

  // 监听设置变化，自动保存
  watch(
    [theme, language, autoReconnect, keepAliveInterval, showLineNumbers, 
     autoSave, confirmOnDelete, confirmOnDisconnect, splitDirection, sidebarWidth],
    () => {
      if (autoSave.value) {
        saveSettings()
      }
    }
  )

  // Actions

  /**
   * 切换主题
   */
  function toggleTheme() {
    theme.value = theme.value === 'dark' ? 'light' : 'dark'
    applyTheme()
  }

  /**
   * 设置主题
   */
  function setTheme(newTheme) {
    if (['dark', 'light'].includes(newTheme)) {
      theme.value = newTheme
      applyTheme()
    }
  }

  /**
   * 应用主题到 DOM
   */
  function applyTheme() {
    document.documentElement.setAttribute('data-theme', theme.value)
  }

  /**
   * 设置语言
   */
  function setLanguage(lang) {
    language.value = lang
  }

  /**
   * 更新设置
   */
  function updateSettings(newSettings) {
    if (newSettings.theme !== undefined) theme.value = newSettings.theme
    if (newSettings.language !== undefined) language.value = newSettings.language
    if (newSettings.autoReconnect !== undefined) autoReconnect.value = newSettings.autoReconnect
    if (newSettings.keepAliveInterval !== undefined) keepAliveInterval.value = newSettings.keepAliveInterval
    if (newSettings.showLineNumbers !== undefined) showLineNumbers.value = newSettings.showLineNumbers
    if (newSettings.autoSave !== undefined) autoSave.value = newSettings.autoSave
    if (newSettings.confirmOnDelete !== undefined) confirmOnDelete.value = newSettings.confirmOnDelete
    if (newSettings.confirmOnDisconnect !== undefined) confirmOnDisconnect.value = newSettings.confirmOnDisconnect
    if (newSettings.splitDirection !== undefined) splitDirection.value = newSettings.splitDirection
    if (newSettings.sidebarWidth !== undefined) sidebarWidth.value = newSettings.sidebarWidth
  }

  /**
   * 重置所有设置
   */
  function resetSettings() {
    theme.value = 'dark'
    language.value = 'zh-CN'
    autoReconnect.value = true
    keepAliveInterval.value = 60
    showLineNumbers.value = false
    autoSave.value = true
    confirmOnDelete.value = true
    confirmOnDisconnect.value = true
    splitDirection.value = 'horizontal'
    sidebarWidth.value = 280
    saveSettings()
  }

  /**
   * 导出设置
   */
  function exportSettings() {
    return {
      theme: theme.value,
      language: language.value,
      autoReconnect: autoReconnect.value,
      keepAliveInterval: keepAliveInterval.value,
      showLineNumbers: showLineNumbers.value,
      autoSave: autoSave.value,
      confirmOnDelete: confirmOnDelete.value,
      confirmOnDisconnect: confirmOnDisconnect.value,
      splitDirection: splitDirection.value,
      sidebarWidth: sidebarWidth.value
    }
  }

  /**
   * 导入设置
   */
  function importSettings(settings) {
    updateSettings(settings)
    saveSettings()
  }

  // 初始化时加载设置
  loadSettings()
  applyTheme()

  return {
    // State
    theme,
    language,
    autoReconnect,
    keepAliveInterval,
    showLineNumbers,
    autoSave,
    confirmOnDelete,
    confirmOnDisconnect,
    splitDirection,
    sidebarWidth,

    // Actions
    toggleTheme,
    setTheme,
    applyTheme,
    setLanguage,
    updateSettings,
    resetSettings,
    saveSettings,
    exportSettings,
    importSettings
  }
})