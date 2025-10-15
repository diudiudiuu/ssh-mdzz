import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { 
  SetEncryptionKey, 
  VerifyEncryptionKey, 
  IsKeySet, 
  HasConfigs,
  HasValidSession,
  RestoreSession,
  ClearSession,
  VerifyKeyWithSession
} from '@/../wailsjs/go/main/App'

export const useAuthStore = defineStore('auth', () => {
  // State
  const encryptionKey = ref(null)
  const isAuthenticated = ref(false)
  const isInitialized = ref(false)

  // Getters
  const hasKey = computed(() => encryptionKey.value !== null)

  // Actions
  
  /**
   * 检查是否已设置密钥（首次启动检查）
   */
  async function checkKeyStatus() {
    try {
      console.log('正在检查密钥状态...')
      
      const keySet = await IsKeySet()
      const hasConfigs = await HasConfigs()
      
      console.log('密钥状态检查结果:', {
        keySet,
        hasConfigs
      })
      
      // 只有当没有设置过密钥时才需要设置
      // 如果设置过密钥（即使没有配置），也应该进入验证流程
      const needSetup = !keySet
      
      console.log('是否需要设置密钥:', needSetup)
      
      return {
        keySet,
        hasConfigs,
        needSetup
      }
    } catch (error) {
      console.error('检查密钥状态失败:', error)
      // 出错时默认需要设置
      return {
        keySet: false,
        hasConfigs: false,
        needSetup: true
      }
    }
  }

  /**
   * 设置加密密钥（首次设置）
   */
  async function setKey(key) {
    if (!key || key.length < 6) {
      throw new Error('密钥长度至少为 6 个字符')
    }

    try {
      console.log('正在设置密钥...')
      
      // 调用后端设置密钥，后端会生成密钥哈希并存储
      // 密钥本身不会明文存储到磁盘
      await SetEncryptionKey(key)
      
      console.log('后端密钥设置成功')
      
      // 验证密钥是否真的设置成功
      const keySetCheck = await IsKeySet()
      console.log('密钥设置验证结果:', keySetCheck)
      
      if (!keySetCheck) {
        throw new Error('密钥设置失败：后端验证失败')
      }
      
      // 在内存中保存密钥用于当前会话
      encryptionKey.value = key
      isAuthenticated.value = true
      isInitialized.value = true
      
      console.log('密钥设置成功，已在内存中保存')
      return true
    } catch (error) {
      console.error('设置密钥失败:', error)
      throw new Error('设置密钥失败: ' + (error.message || error))
    }
  }

  /**
   * 验证密钥（已有配置时）
   */
  async function verifyKey(key) {
    if (!key) {
      throw new Error('请输入密钥')
    }

    try {
      // 检查是否有有效会话，如果有则使用会话验证
      const hasSession = await HasValidSession()
      
      if (hasSession) {
        console.log('使用会话验证密钥')
        await VerifyKeyWithSession(key)
      } else {
        console.log('使用标准验证密钥')
        await VerifyEncryptionKey(key)
      }
      
      encryptionKey.value = key
      isAuthenticated.value = true
      isInitialized.value = true
      return true
    } catch (error) {
      console.error('密钥验证失败:', error)
      throw new Error('密钥验证失败，请检查密钥是否正确')
    }
  }

  /**
   * 清除密钥（退出登录）
   */
  function clearKey() {
    // 清除内存中的密钥
    encryptionKey.value = null
    isAuthenticated.value = false
    
    // 强制垃圾回收（如果浏览器支持）
    if (window.gc) {
      window.gc()
    }
    
    console.log('密钥已从内存中清除')
  }

  /**
   * 获取当前密钥
   */
  function getKey() {
    return encryptionKey.value
  }

  /**
   * 初始化应用
   */
  async function initializeApp() {
    console.log('初始化应用...')
    
    try {
      // 首先检查是否有有效会话
      const hasSession = await HasValidSession()
      console.log('有效会话检查:', hasSession)
      
      if (hasSession) {
        // 尝试从会话恢复
        try {
          await RestoreSession()
          // 会话恢复成功，但我们仍需要用户输入密钥来完全解锁
          console.log('会话恢复成功，等待密钥输入')
        } catch (error) {
          console.log('会话恢复失败:', error)
          await ClearSession() // 清除无效会话
        }
      }
      
      const status = await checkKeyStatus()
      status.hasValidSession = hasSession
      
      isInitialized.value = true
      console.log('应用初始化完成:', status)
      return status
    } catch (error) {
      console.error('应用初始化失败:', error)
      isInitialized.value = true
      return {
        keySet: false,
        hasConfigs: false,
        needSetup: true,
        hasValidSession: false
      }
    }
  }

  /**
   * 清除会话
   */
  async function clearSession() {
    try {
      await ClearSession()
      clearKey()
    } catch (error) {
      console.error('清除会话失败:', error)
    }
  }

  return {
    // State
    encryptionKey,
    isAuthenticated,
    isInitialized,
    
    // Getters
    hasKey,
    
    // Actions
    checkKeyStatus,
    setKey,
    verifyKey,
    clearKey,
    getKey,
    initializeApp,
    clearSession
  }
})