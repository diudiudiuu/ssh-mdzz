import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useMessage } from 'naive-ui'
import { ERROR_MESSAGES } from '@/utils/constants'

export function useEncryption() {
  const authStore = useAuthStore()
  const message = useMessage()

  // 响应式状态
  const isSettingKey = ref(false)
  const isVerifyingKey = ref(false)
  const keyStrength = ref(0)
  const keyFeedback = ref('')

  // 计算属性
  const isAuthenticated = computed(() => authStore.isAuthenticated)
  const hasKey = computed(() => authStore.hasKey)
  const isInitialized = computed(() => authStore.isInitialized)

  /**
   * 计算密钥强度
   */
  function calculateKeyStrength(key) {
    if (!key) return 0

    let score = 0
    const length = key.length

    // 长度评分 (0-40分)
    if (length >= 8) score += 20
    if (length >= 12) score += 10
    if (length >= 16) score += 10

    // 字符类型评分 (0-60分)
    const hasLower = /[a-z]/.test(key)
    const hasUpper = /[A-Z]/.test(key)
    const hasNumber = /\d/.test(key)
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(key)

    if (hasLower) score += 10
    if (hasUpper) score += 10
    if (hasNumber) score += 15
    if (hasSpecial) score += 25

    // 复杂度奖励
    const uniqueChars = new Set(key).size
    if (uniqueChars >= length * 0.7) score += 10

    return Math.min(100, score)
  }

  /**
   * 获取密钥强度反馈
   */
  function getKeyStrengthFeedback(strength) {
    if (strength < 30) {
      return {
        level: 'weak',
        message: '密钥强度较弱，建议使用更复杂的密钥',
        color: 'error'
      }
    } else if (strength < 60) {
      return {
        level: 'medium',
        message: '密钥强度中等，可以考虑添加特殊字符',
        color: 'warning'
      }
    } else if (strength < 80) {
      return {
        level: 'good',
        message: '密钥强度良好',
        color: 'info'
      }
    } else {
      return {
        level: 'strong',
        message: '密钥强度很强',
        color: 'success'
      }
    }
  }

  /**
   * 验证密钥格式
   */
  function validateKey(key) {
    if (!key) {
      return { valid: false, message: '请输入密钥' }
    }

    if (key.length < 6) {
      return { valid: false, message: '密钥长度至少为 6 个字符' }
    }

    if (key.length > 128) {
      return { valid: false, message: '密钥长度不能超过 128 个字符' }
    }

    // 检查是否包含不安全字符
    if (/[\x00-\x1f\x7f]/.test(key)) {
      return { valid: false, message: '密钥不能包含控制字符' }
    }

    return { valid: true, message: '' }
  }

  /**
   * 分析密钥并更新状态
   */
  function analyzeKey(key) {
    const strength = calculateKeyStrength(key)
    const feedback = getKeyStrengthFeedback(strength)
    
    keyStrength.value = strength
    keyFeedback.value = feedback.message
    
    return {
      strength,
      feedback,
      validation: validateKey(key)
    }
  }

  /**
   * 设置加密密钥（首次设置）
   */
  async function setEncryptionKey(key, confirmKey) {
    if (isSettingKey.value) return false

    // 验证密钥
    const validation = validateKey(key)
    if (!validation.valid) {
      message.error(validation.message)
      return false
    }

    // 验证确认密钥
    if (key !== confirmKey) {
      message.error('两次输入的密钥不一致')
      return false
    }

    // 检查密钥强度
    const strength = calculateKeyStrength(key)
    if (strength < 30) {
      message.warning('密钥强度较弱，建议使用更复杂的密钥')
    }

    isSettingKey.value = true

    try {
      await authStore.setKey(key)
      message.success('密钥设置成功')
      return true
    } catch (error) {
      message.error(error.message || ERROR_MESSAGES.INVALID_KEY)
      return false
    } finally {
      isSettingKey.value = false
    }
  }

  /**
   * 验证加密密钥（已有配置时）
   */
  async function verifyEncryptionKey(key) {
    if (isVerifyingKey.value) return false

    const validation = validateKey(key)
    if (!validation.valid) {
      message.error(validation.message)
      return false
    }

    isVerifyingKey.value = true

    try {
      await authStore.verifyKey(key)
      message.success('密钥验证成功')
      return true
    } catch (error) {
      message.error(error.message || '密钥验证失败')
      return false
    } finally {
      isVerifyingKey.value = false
    }
  }

  /**
   * 生成随机密钥
   */
  function generateRandomKey(length = 16, options = {}) {
    const {
      includeLowercase = true,
      includeUppercase = true,
      includeNumbers = true,
      includeSpecials = true,
      excludeSimilar = true
    } = options

    let charset = ''
    
    if (includeLowercase) {
      charset += excludeSimilar ? 'abcdefghjkmnpqrstuvwxyz' : 'abcdefghijklmnopqrstuvwxyz'
    }
    
    if (includeUppercase) {
      charset += excludeSimilar ? 'ABCDEFGHJKMNPQRSTUVWXYZ' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    }
    
    if (includeNumbers) {
      charset += excludeSimilar ? '23456789' : '0123456789'
    }
    
    if (includeSpecials) {
      charset += '!@#$%^&*()_+-=[]{}|;:,.<>?'
    }

    if (!charset) {
      throw new Error('至少需要选择一种字符类型')
    }

    let result = ''
    const array = new Uint8Array(length)
    crypto.getRandomValues(array)

    for (let i = 0; i < length; i++) {
      result += charset[array[i] % charset.length]
    }

    return result
  }

  /**
   * 生成助记词密钥
   */
  function generateMnemonicKey(wordCount = 6) {
    const words = [
      'apple', 'banana', 'cherry', 'dragon', 'eagle', 'forest',
      'garden', 'house', 'island', 'jungle', 'kitchen', 'lemon',
      'mountain', 'nature', 'ocean', 'palace', 'queen', 'river',
      'sunset', 'tiger', 'umbrella', 'village', 'water', 'yellow',
      'zebra', 'bridge', 'castle', 'diamond', 'energy', 'flower'
    ]

    const selectedWords = []
    const usedIndices = new Set()

    while (selectedWords.length < wordCount) {
      const randomIndex = Math.floor(Math.random() * words.length)
      if (!usedIndices.has(randomIndex)) {
        usedIndices.add(randomIndex)
        selectedWords.push(words[randomIndex])
      }
    }

    return selectedWords.join('-')
  }

  /**
   * 检查密钥是否已泄露（模拟检查）
   */
  async function checkKeyCompromised(key) {
    // 模拟检查常见弱密钥
    const commonWeakKeys = [
      '123456', 'password', 'admin', 'root', 'user',
      'qwerty', '111111', '000000', 'abc123'
    ]

    return commonWeakKeys.includes(key.toLowerCase())
  }

  /**
   * 导出密钥（用于备份）
   */
  function exportKey() {
    const currentKey = authStore.getKey()
    if (!currentKey) {
      throw new Error('没有可导出的密钥')
    }

    const timestamp = new Date().toISOString()
    const exportData = {
      version: '1.0',
      timestamp,
      keyHash: btoa(currentKey)
    }

    return btoa(JSON.stringify(exportData))
  }

  /**
   * 导入密钥（从备份恢复）
   */
  async function importKey(backupData, backupPassword) {
    try {
      const data = JSON.parse(atob(backupData))
      
      if (!data.version || !data.keyHash) {
        throw new Error('无效的备份数据格式')
      }

      const restoredKey = atob(data.keyHash)
      
      return await verifyEncryptionKey(restoredKey)
    } catch (error) {
      message.error('导入密钥失败: ' + error.message)
      return false
    }
  }

  /**
   * 清除密钥
   */
  function clearKey() {
    authStore.clearKey()
    keyStrength.value = 0
    keyFeedback.value = ''
    message.info('已清除密钥')
  }

  /**
   * 获取密钥提示
   */
  function getKeyHint(key) {
    if (!key || key.length < 3) return ''
    
    const firstChar = key.charAt(0)
    const lastChar = key.charAt(key.length - 1)
    const length = key.length
    
    return `${firstChar}${'*'.repeat(Math.max(0, length - 2))}${lastChar}`
  }

  /**
   * 初始化加密系统
   */
  async function initializeEncryption() {
    try {
      const status = await authStore.initializeApp()
      return status
    } catch (error) {
      console.error('初始化加密系统失败:', error)
      throw error
    }
  }

  return {
    // 状态
    isSettingKey,
    isVerifyingKey,
    keyStrength,
    keyFeedback,

    // 计算属性
    isAuthenticated,
    hasKey,
    isInitialized,

    // 方法
    analyzeKey,
    setEncryptionKey,
    verifyEncryptionKey,
    generateRandomKey,
    generateMnemonicKey,
    checkKeyCompromised,
    exportKey,
    importKey,
    clearKey,
    getKeyHint,
    initializeEncryption,

    // 工具方法
    calculateKeyStrength,
    getKeyStrengthFeedback,
    validateKey
  }
}