import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  GetConfigs,
  SaveConfig,
  DeleteConfig,
  CreateSession,
  CloseSession,
  GetActiveSessions,
  CheckConnection,
  TestSSHConnection,
  OpenTerminal
} from '@/../wailsjs/go/main/App'
import { generateId } from '@/utils/format'

export const useConnectionStore = defineStore('connection', () => {
  // State
  const connections = ref([])
  const activeConnection = ref(null)
  const activeSessions = ref([])
  const loading = ref(false)
  const error = ref(null)

  // Getters
  const connectionCount = computed(() => connections.value.length)
  const activeSessionCount = computed(() => activeSessions.value.length)
  const hasActiveConnection = computed(() => activeConnection.value !== null)

  // Actions

  /**
   * 加载所有连接配置
   */
  async function loadConnections() {
    loading.value = true
    error.value = null

    try {
      const configs = await GetConfigs()
      connections.value = configs || []
      return configs
    } catch (err) {
      error.value = err.message || '加载连接配置失败'
      console.error('加载连接失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 保存连接配置
   */
  async function saveConnection(config) {
    loading.value = true
    error.value = null
    try {
      // 如果没有 ID，生成新 ID
      if (!config.id) {
        config.id = generateId()
      }

      // 设置默认值
      if (!config.port) config.port = '22'
      if (!config.transferMode) config.transferMode = 'sftp'

      await SaveConfig(config)
      await loadConnections()

      return config
    } catch (err) {
      error.value = err.message || '保存连接配置失败'
      console.error('保存连接失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 删除连接配置
   */
  async function deleteConnection(id) {
    loading.value = true
    error.value = null

    try {
      await DeleteConfig(id)
      await loadConnections()

      // 如果删除的是当前选中的连接，清除选中状态
      if (activeConnection.value?.id === id) {
        activeConnection.value = null
      }
    } catch (err) {
      error.value = err.message || '删除连接配置失败'
      console.error('删除连接失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 选择连接
   */
  function selectConnection(connection) {
    activeConnection.value = connection
  }

  /**
   * 清除选中的连接
   */
  function clearActiveConnection() {
    activeConnection.value = null
  }

  /**
   * 创建会话
   */
  async function createSession(configId) {
    loading.value = true
    error.value = null

    try {
      await CreateSession(configId)
      await loadActiveSessions()
    } catch (err) {
      error.value = err.message || '创建会话失败'
      console.error('创建会话失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 关闭会话
   */
  async function closeSession(configId) {
    loading.value = true
    error.value = null

    try {
      await CloseSession(configId)
      await loadActiveSessions()
    } catch (err) {
      error.value = err.message || '关闭会话失败'
      console.error('关闭会话失败:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  /**
   * 加载活动会话
   */
  async function loadActiveSessions() {
    try {
      const sessions = await GetActiveSessions()
      activeSessions.value = sessions || []
      return sessions
    } catch (err) {
      console.error('加载活动会话失败:', err)
      activeSessions.value = []
      return []
    }
  }

  /**
   * 检查连接状态
   */
  async function checkConnectionStatus(configId) {
    try {
      const status = await CheckConnection(configId)
      return status
    } catch (err) {
      console.error('检查连接状态失败:', err)
      return {
        isConnected: false,
        latency: 0,
        error: err.message
      }
    }
  }

  /**
   * 测试 SSH 连接
   */
  async function testConnection(configId) {
    try {
      await TestSSHConnection(configId)
      return { success: true }
    } catch (err) {
      console.error('测试连接失败:', err)
      return { success: false, error: err.message }
    }
  }

  /**
   * 打开系统终端
   */
  async function openSystemTerminal(configId) {
    try {
      await OpenTerminal(configId)
    } catch (err) {
      console.error('打开终端失败:', err)
      throw err
    }
  }

  /**
   * 根据 ID 获取连接
   */
  function getConnectionById(id) {
    return connections.value.find(conn => conn.id === id)
  }

  /**
   * 搜索连接
   */
  function searchConnections(keyword) {
    if (!keyword) return connections.value

    const lowerKeyword = keyword.toLowerCase()
    return connections.value.filter(conn =>
      conn.name.toLowerCase().includes(lowerKeyword) ||
      conn.host.toLowerCase().includes(lowerKeyword) ||
      conn.username.toLowerCase().includes(lowerKeyword)
    )
  }

  /**
   * 清除错误
   */
  function clearError() {
    error.value = null
  }

  /**
   * 定期刷新活动会话（每 3 秒）
   */
  function startSessionRefresh() {
    const intervalId = setInterval(() => {
      loadActiveSessions()
    }, 3000)

    return () => clearInterval(intervalId)
  }

  return {
    // State
    connections,
    activeConnection,
    activeSessions,
    loading,
    error,

    // Getters
    connectionCount,
    activeSessionCount,
    hasActiveConnection,

    // Actions
    loadConnections,
    saveConnection,
    deleteConnection,
    selectConnection,
    clearActiveConnection,
    createSession,
    closeSession,
    loadActiveSessions,
    checkConnectionStatus,
    testConnection,
    openSystemTerminal,
    getConnectionById,
    searchConnections,
    clearError,
    startSessionRefresh
  }
})