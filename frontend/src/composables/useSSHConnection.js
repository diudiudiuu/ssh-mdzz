import { ref } from 'vue'
import { useConnectionStore } from '@/stores/connection'
import { useMessage } from 'naive-ui'

export function useSSHConnection() {
  const connectionStore = useConnectionStore()
  const message = useMessage()
  
  const connecting = ref(false)
  const testing = ref(false)

  /**
   * 连接到 SSH 服务器
   */
  async function connect(config) {
    connecting.value = true

    try {
      await connectionStore.createSession(config.id)
      message.success(`已连接到 ${config.name}`)
      return true
    } catch (error) {
      message.error(`连接失败: ${error.message}`)
      console.error('连接失败:', error)
      return false
    } finally {
      connecting.value = false
    }
  }

  /**
   * 断开 SSH 连接
   */
  async function disconnect(configId) {
    try {
      await connectionStore.closeSession(configId)
      message.success('已断开连接')
      return true
    } catch (error) {
      message.error(`断开连接失败: ${error.message}`)
      console.error('断开连接失败:', error)
      return false
    }
  }

  /**
   * 测试连接
   */
  async function testConnection(config) {
    testing.value = true

    try {
      const portStatus = await connectionStore.checkConnectionStatus(config.id)
      
      if (!portStatus.isConnected) {
        message.error(`端口 ${config.port} 无法连接`)
        return { success: false, error: portStatus.error }
      }

      const sshStatus = await connectionStore.testConnection(config.id)
      
      if (sshStatus.success) {
        message.success(`连接测试成功 (${portStatus.latency}ms)`)
        return { success: true, latency: portStatus.latency }
      } else {
        message.error(`SSH 认证失败: ${sshStatus.error}`)
        return { success: false, error: sshStatus.error }
      }
    } catch (error) {
      message.error(`测试失败: ${error.message}`)
      return { success: false, error: error.message }
    } finally {
      testing.value = false
    }
  }

  /**
   * 打开系统终端
   */
  async function openTerminal(config) {
    try {
      await connectionStore.openSystemTerminal(config.id)
      message.success(`已在系统终端打开 ${config.name}`)
    } catch (error) {
      message.error(`打开终端失败: ${error.message}`)
      console.error('打开终端失败:', error)
    }
  }

  /**
   * 快速连接（自动创建会话）
   */
  async function quickConnect(config) {
    const result = await connect(config)
    if (result) {
      connectionStore.selectConnection(config)
    }
    return result
  }

  return {
    connecting,
    testing,
    connect,
    disconnect,
    testConnection,
    openTerminal,
    quickConnect
  }
}