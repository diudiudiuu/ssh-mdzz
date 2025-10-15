import { ref, computed, watch, onUnmounted } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import { useTerminalStore } from '@/stores/terminal'
import { useMessage } from 'naive-ui'
import { formatDuration, formatTime } from '@/utils/format'
import { KEEP_ALIVE_INTERVAL, SESSION_STATUS } from '@/utils/constants'

export function useSession() {
  const connectionStore = useConnectionStore()
  const terminalStore = useTerminalStore()
  const message = useMessage()

  // 响应式状态
  const sessions = ref([])
  const activeSessionId = ref(null)
  const sessionStats = ref({})
  const isLoading = ref(false)
  const keepAliveInterval = ref(null)

  // 计算属性
  const activeSessions = computed(() => 
    sessions.value.filter(session => session.status === SESSION_STATUS.CONNECTED)
  )

  const activeSession = computed(() => 
    sessions.value.find(session => session.id === activeSessionId.value)
  )

  const sessionCount = computed(() => sessions.value.length)

  const activeSessionCount = computed(() => activeSessions.value.length)

  const totalUptime = computed(() => {
    return activeSessions.value.reduce((total, session) => {
      return total + (Date.now() - new Date(session.connectedAt).getTime())
    }, 0)
  })

  /**
   * 创建新会话
   */
  async function createSession(config, options = {}) {
    if (isLoading.value) return null

    isLoading.value = true

    try {
      // 检查是否已存在会话
      const existingSession = sessions.value.find(s => s.configId === config.id)
      if (existingSession && existingSession.status === SESSION_STATUS.CONNECTED) {
        message.info(`会话 ${config.name} 已存在`)
        activeSessionId.value = existingSession.id
        return existingSession
      }

      // 创建后端会话
      await connectionStore.createSession(config.id)

      // 创建前端会话对象
      const session = {
        id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        configId: config.id,
        configName: config.name,
        host: config.host,
        username: config.username,
        port: config.port,
        transferMode: config.transferMode || 'sftp',
        status: SESSION_STATUS.CONNECTED,
        connectedAt: new Date(),
        lastActivity: new Date(),
        uptime: 0,
        commandCount: 0,
        transferCount: 0,
        ...options
      }

      // 添加到会话列表
      sessions.value.push(session)
      activeSessionId.value = session.id

      // 初始化会话统计
      sessionStats.value[session.id] = {
        bytesTransferred: 0,
        commandsExecuted: 0,
        errorsCount: 0,
        lastError: null
      }

      // 创建终端会话
      if (options.createTerminal !== false) {
        terminalStore.createTerminal({
          id: session.id,
          configId: config.id,
          title: `${config.name} (${config.host})`
        })
      }

      message.success(`会话 ${config.name} 创建成功`)
      
      // 启动会话监控
      startSessionMonitoring(session.id)

      return session
    } catch (error) {
      message.error(`创建会话失败: ${error.message}`)
      console.error('创建会话失败:', error)
      return null
    } finally {
      isLoading.value = false
    }
  }

  /**
   * 关闭会话
   */
  async function closeSession(sessionId) {
    const session = getSession(sessionId)
    if (!session) {
      message.warning('会话不存在')
      return false
    }

    try {
      // 关闭后端会话
      await connectionStore.closeSession(session.configId)

      // 更新会话状态
      session.status = SESSION_STATUS.DISCONNECTED
      session.disconnectedAt = new Date()

      // 移除终端
      terminalStore.removeTerminal(session.id)

      // 清理统计数据
      delete sessionStats.value[session.id]

      // 从会话列表中移除
      const index = sessions.value.findIndex(s => s.id === sessionId)
      if (index !== -1) {
        sessions.value.splice(index, 1)
      }

      // 如果是当前活动会话，切换到其他会话
      if (activeSessionId.value === sessionId) {
        const remainingSessions = activeSessions.value
        activeSessionId.value = remainingSessions.length > 0 
          ? remainingSessions[remainingSessions.length - 1].id 
          : null
      }

      message.success(`会话 ${session.configName} 已关闭`)
      return true
    } catch (error) {
      message.error(`关闭会话失败: ${error.message}`)
      console.error('关闭会话失败:', error)
      return false
    }
  }

  /**
   * 切换活动会话
   */
  function switchSession(sessionId) {
    const session = getSession(sessionId)
    if (!session) {
      message.warning('会话不存在')
      return
    }

    if (session.status !== SESSION_STATUS.CONNECTED) {
      message.warning('会话未连接')
      return
    }

    activeSessionId.value = sessionId
    terminalStore.setActiveTerminal(sessionId)
    
    // 更新最后活动时间
    session.lastActivity = new Date()
  }

  /**
   * 获取会话
   */
  function getSession(sessionId) {
    return sessions.value.find(session => session.id === sessionId) || null
  }

  /**
   * 根据配置 ID 获取会话
   */
  function getSessionByConfigId(configId) {
    return sessions.value.find(session => session.configId === configId) || null
  }

  /**
   * 重连会话
   */
  async function reconnectSession(sessionId) {
    const session = getSession(sessionId)
    if (!session) return false

    try {
      session.status = SESSION_STATUS.CONNECTING
      
      // 获取配置
      const config = connectionStore.getConnectionById(session.configId)
      if (!config) {
        throw new Error('找不到连接配置')
      }

      // 重新创建后端会话
      await connectionStore.createSession(config.id)
      
      session.status = SESSION_STATUS.CONNECTED
      session.connectedAt = new Date()
      session.lastActivity = new Date()

      message.success(`会话 ${session.configName} 重连成功`)
      return true
    } catch (error) {
      session.status = SESSION_STATUS.ERROR
      message.error(`重连失败: ${error.message}`)
      return false
    }
  }

  /**
   * 批量关闭会话
   */
  async function closeSessions(sessionIds) {
    let successCount = 0
    
    for (const sessionId of sessionIds) {
      const success = await closeSession(sessionId)
      if (success) successCount++
    }

    return successCount
  }

  /**
   * 关闭所有会话
   */
  async function closeAllSessions() {
    const sessionIds = sessions.value.map(s => s.id)
    return await closeSessions(sessionIds)
  }

  /**
   * 更新会话统计
   */
  function updateSessionStats(sessionId, stats) {
    if (!sessionStats.value[sessionId]) {
      sessionStats.value[sessionId] = {
        bytesTransferred: 0,
        commandsExecuted: 0,
        errorsCount: 0,
        lastError: null
      }
    }

    Object.assign(sessionStats.value[sessionId], stats)

    // 更新会话的最后活动时间
    const session = getSession(sessionId)
    if (session) {
      session.lastActivity = new Date()
    }
  }

  /**
   * 获取会话统计
   */
  function getSessionStats(sessionId) {
    return sessionStats.value[sessionId] || {
      bytesTransferred: 0,
      commandsExecuted: 0,
      errorsCount: 0,
      lastError: null
    }
  }

  /**
   * 获取会话运行时间
   */
  function getSessionUptime(sessionId) {
    const session = getSession(sessionId)
    if (!session || session.status !== SESSION_STATUS.CONNECTED) {
      return '0s'
    }

    const uptime = Date.now() - new Date(session.connectedAt).getTime()
    return formatDuration(uptime)
  }

  /**
   * 检查会话健康状态
   */
  async function checkSessionHealth(sessionId) {
    const session = getSession(sessionId)
    if (!session) {
      return { healthy: false, error: '会话不存在' }
    }

    try {
      const status = await connectionStore.checkConnectionStatus(session.configId)
      
      if (!status.isConnected) {
        session.status = SESSION_STATUS.ERROR
        return { 
          healthy: false, 
          error: '连接已断开',
          latency: 0
        }
      }

      return {
        healthy: true,
        latency: status.latency,
        lastCheck: new Date()
      }
    } catch (error) {
      session.status = SESSION_STATUS.ERROR
      return {
        healthy: false,
        error: error.message,
        lastCheck: new Date()
      }
    }
  }

  /**
   * 启动会话监控
   */
  function startSessionMonitoring(sessionId) {
    const session = getSession(sessionId)
    if (!session) return

    // 定期检查会话健康状态
    const monitorInterval = setInterval(async () => {
      const health = await checkSessionHealth(sessionId)
      
      if (!health.healthy) {
        console.warn(`会话 ${session.configName} 健康检查失败:`, health.error)
        
        // 可以选择自动重连
        if (session.autoReconnect) {
          await reconnectSession(sessionId)
        }
      }
    }, 30000) // 每30秒检查一次

    // 保存监控间隔 ID
    session.monitorInterval = monitorInterval
  }

  /**
   * 停止会话监控
   */
  function stopSessionMonitoring(sessionId) {
    const session = getSession(sessionId)
    if (session && session.monitorInterval) {
      clearInterval(session.monitorInterval)
      delete session.monitorInterval
    }
  }

  /**
   * 启动保活机制
   */
  function startKeepAlive() {
    if (keepAliveInterval.value) return

    keepAliveInterval.value = setInterval(async () => {
      for (const session of activeSessions.value) {
        try {
          // 发送保活命令
          await window.go.main.App.ExecuteCommand(session.configId, 'echo keepalive')
          session.lastActivity = new Date()
        } catch (error) {
          console.warn(`会话 ${session.configName} 保活失败:`, error)
          session.status = SESSION_STATUS.ERROR
        }
      }
    }, KEEP_ALIVE_INTERVAL)
  }

  /**
   * 停止保活机制
   */
  function stopKeepAlive() {
    if (keepAliveInterval.value) {
      clearInterval(keepAliveInterval.value)
      keepAliveInterval.value = null
    }
  }

  /**
   * 导出会话信息
   */
  function exportSessions() {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      sessions: sessions.value.map(session => ({
        configId: session.configId,
        configName: session.configName,
        host: session.host,
        username: session.username,
        port: session.port,
        transferMode: session.transferMode,
        connectedAt: session.connectedAt,
        stats: sessionStats.value[session.id] || {}
      }))
    }

    return exportData
  }

  /**
   * 获取会话摘要
   */
  function getSessionSummary() {
    const summary = {
      total: sessionCount.value,
      active: activeSessionCount.value,
      totalUptime: formatDuration(totalUptime.value),
      sessions: sessions.value.map(session => ({
        id: session.id,
        name: session.configName,
        host: session.host,
        status: session.status,
        uptime: getSessionUptime(session.id),
        connectedAt: formatTime(session.connectedAt),
        stats: getSessionStats(session.id)
      }))
    }

    return summary
  }

  /**
   * 清理断开的会话
   */
  function cleanupDisconnectedSessions() {
    const disconnectedSessions = sessions.value.filter(
      session => session.status === SESSION_STATUS.DISCONNECTED
    )

    for (const session of disconnectedSessions) {
      const index = sessions.value.indexOf(session)
      if (index !== -1) {
        sessions.value.splice(index, 1)
        delete sessionStats.value[session.id]
        stopSessionMonitoring(session.id)
      }
    }

    if (disconnectedSessions.length > 0) {
      message.info(`已清理 ${disconnectedSessions.length} 个断开的会话`)
    }
  }

  // 监听连接状态变化
  watch(() => connectionStore.activeSessions, (newSessions) => {
    // 同步后端会话状态
    for (const backendSession of newSessions) {
      const frontendSession = getSessionByConfigId(backendSession.configId)
      if (frontendSession) {
        frontendSession.status = backendSession.isActive 
          ? SESSION_STATUS.CONNECTED 
          : SESSION_STATUS.DISCONNECTED
      }
    }
  }, { deep: true })

  // 启动保活和监控
  startKeepAlive()

  // 组件卸载时清理
  onUnmounted(() => {
    stopKeepAlive()
    
    // 停止所有会话监控
    sessions.value.forEach(session => {
      stopSessionMonitoring(session.id)
    })
  })

  return {
    // 状态
    sessions,
    activeSessionId,
    sessionStats,
    isLoading,

    // 计算属性
    activeSessions,
    activeSession,
    sessionCount,
    activeSessionCount,
    totalUptime,

    // 方法
    createSession,
    closeSession,
    switchSession,
    getSession,
    getSessionByConfigId,
    reconnectSession,
    closeSessions,
    closeAllSessions,
    updateSessionStats,
    getSessionStats,
    getSessionUptime,
    checkSessionHealth,
    startSessionMonitoring,
    stopSessionMonitoring,
    exportSessions,
    getSessionSummary,
    cleanupDisconnectedSessions,

    // 保活相关
    startKeepAlive,
    stopKeepAlive
  }
}