// 验证工具函数

import { DEFAULT_SSH_PORT } from './constants'

/**
 * 验证 IP 地址格式
 * @param {string} ip - IP 地址
 * @returns {boolean} 是否有效
 */
export function isValidIP(ip) {
  if (!ip) return false
  
  // IPv4 正则
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/
  
  // IPv6 正则（简化版）
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}

/**
 * 验证域名格式
 * @param {string} domain - 域名
 * @returns {boolean} 是否有效
 */
export function isValidDomain(domain) {
  if (!domain) return false
  
  // 域名正则：支持子域名、国际化域名
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)*[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?$/
  
  return domainRegex.test(domain) && domain.length <= 253
}

/**
 * 验证主机地址（IP 或域名）
 * @param {string} host - 主机地址
 * @returns {Object} { valid, message }
 */
export function validateHost(host) {
  if (!host || !host.trim()) {
    return { valid: false, message: '主机地址不能为空' }
  }

  const trimmedHost = host.trim()

  if (trimmedHost.length > 255) {
    return { valid: false, message: '主机地址过长' }
  }

  // 检查是否为 localhost
  if (trimmedHost === 'localhost') {
    return { valid: true, message: '' }
  }

  // 检查 IP 地址
  if (isValidIP(trimmedHost)) {
    return { valid: true, message: '' }
  }

  // 检查域名
  if (isValidDomain(trimmedHost)) {
    return { valid: true, message: '' }
  }

  return { valid: false, message: '请输入有效的 IP 地址或域名' }
}

/**
 * 验证端口号
 * @param {string|number} port - 端口号
 * @returns {Object} { valid, message }
 */
export function validatePort(port) {
  if (!port && port !== 0) {
    return { valid: false, message: '端口号不能为空' }
  }

  const portNum = parseInt(port, 10)

  if (isNaN(portNum)) {
    return { valid: false, message: '端口号必须是数字' }
  }

  if (portNum < 1 || portNum > 65535) {
    return { valid: false, message: '端口号必须在 1-65535 之间' }
  }

  // 检查常见的受限端口
  const restrictedPorts = [0, 7, 9, 11, 13, 15, 17, 19, 20, 21, 23, 25, 37, 42, 43, 53, 77, 79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135, 139, 143, 179, 389, 465, 512, 513, 514, 515, 526, 530, 531, 532, 540, 556, 563, 587, 601, 636, 993, 995]
  
  if (restrictedPorts.includes(portNum)) {
    return { valid: true, message: `端口 ${portNum} 可能被系统占用，请确认` }
  }

  return { valid: true, message: '' }
}

/**
 * 验证用户名
 * @param {string} username - 用户名
 * @returns {Object} { valid, message }
 */
export function validateUsername(username) {
  if (!username || !username.trim()) {
    return { valid: false, message: '用户名不能为空' }
  }

  const trimmedUsername = username.trim()

  if (trimmedUsername.length > 32) {
    return { valid: false, message: '用户名长度不能超过 32 个字符' }
  }

  // Unix/Linux 用户名规则：字母、数字、下划线、连字符，不能以数字开头
  const usernameRegex = /^[a-zA-Z_][a-zA-Z0-9_-]*$/

  if (!usernameRegex.test(trimmedUsername)) {
    return { valid: false, message: '用户名只能包含字母、数字、下划线和连字符，且不能以数字开头' }
  }

  // 检查保留用户名
  const reservedUsernames = ['root', 'admin', 'administrator', 'guest', 'daemon', 'bin', 'sys', 'sync', 'games', 'man', 'lp', 'mail', 'news', 'uucp', 'proxy', 'www-data', 'backup', 'list', 'irc', 'gnats', 'nobody']
  
  if (reservedUsernames.includes(trimmedUsername.toLowerCase())) {
    return { valid: true, message: `用户名 "${trimmedUsername}" 是系统保留用户，请确认` }
  }

  return { valid: true, message: '' }
}

/**
 * 验证密码强度
 * @param {string} password - 密码
 * @returns {Object} { valid, message, strength }
 */
export function validatePassword(password) {
  if (!password) {
    return { valid: false, message: '密码不能为空', strength: 0 }
  }

  if (password.length < 6) {
    return { valid: false, message: '密码长度至少为 6 个字符', strength: 0 }
  }

  if (password.length > 128) {
    return { valid: false, message: '密码长度不能超过 128 个字符', strength: 0 }
  }

  // 计算密码强度
  let strength = 0
  
  // 长度加分
  if (password.length >= 8) strength += 20
  if (password.length >= 12) strength += 10
  if (password.length >= 16) strength += 10

  // 字符类型加分
  if (/[a-z]/.test(password)) strength += 10
  if (/[A-Z]/.test(password)) strength += 10
  if (/\d/.test(password)) strength += 15
  if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength += 25

  // 复杂度加分
  const uniqueChars = new Set(password).size
  if (uniqueChars >= password.length * 0.7) strength += 10

  let message = ''
  if (strength < 30) {
    message = '密码强度较弱'
  } else if (strength < 60) {
    message = '密码强度中等'
  } else if (strength < 80) {
    message = '密码强度良好'
  } else {
    message = '密码强度很强'
  }

  return { valid: true, message, strength: Math.min(100, strength) }
}

/**
 * 验证文件路径
 * @param {string} path - 文件路径
 * @param {boolean} isWindows - 是否为 Windows 路径
 * @returns {Object} { valid, message }
 */
export function validateFilePath(path, isWindows = false) {
  if (!path || !path.trim()) {
    return { valid: false, message: '文件路径不能为空' }
  }

  const trimmedPath = path.trim()

  if (trimmedPath.length > 4096) {
    return { valid: false, message: '文件路径过长' }
  }

  if (isWindows) {
    // Windows 路径验证
    const windowsPathRegex = /^[a-zA-Z]:\\(?:[^<>:"|?*\r\n]+\\)*[^<>:"|?*\r\n]*$/
    if (!windowsPathRegex.test(trimmedPath)) {
      return { valid: false, message: '请输入有效的 Windows 路径格式（如 C:\\path\\to\\file）' }
    }
  } else {
    // Unix/Linux 路径验证
    const unixPathRegex = /^\/(?:[^\/\0]+\/)*[^\/\0]*$/
    if (!unixPathRegex.test(trimmedPath)) {
      return { valid: false, message: '请输入有效的 Unix/Linux 路径格式（如 /path/to/file）' }
    }
  }

  // 检查危险路径
  const dangerousPaths = ['/', '/bin', '/boot', '/dev', '/etc', '/lib', '/proc', '/root', '/sbin', '/sys', '/usr', '/var']
  if (dangerousPaths.includes(trimmedPath)) {
    return { valid: true, message: `路径 "${trimmedPath}" 是系统关键目录，请谨慎操作` }
  }

  return { valid: true, message: '' }
}

/**
 * 验证 SSH 私钥文件路径
 * @param {string} keyPath - 私钥文件路径
 * @returns {Object} { valid, message }
 */
export function validateKeyPath(keyPath) {
  if (!keyPath || !keyPath.trim()) {
    return { valid: true, message: '' } // 私钥路径可以为空（使用密码认证）
  }

  const pathValidation = validateFilePath(keyPath.trim())
  if (!pathValidation.valid) {
    return pathValidation
  }

  // 检查常见的私钥文件扩展名
  const keyExtensions = ['.pem', '.key', '.ppk', '.openssh']
  const hasValidExtension = keyExtensions.some(ext => keyPath.toLowerCase().endsWith(ext))
  
  if (!hasValidExtension && !keyPath.includes('id_rsa') && !keyPath.includes('id_ed25519') && !keyPath.includes('id_ecdsa')) {
    return { valid: true, message: '文件扩展名不是常见的私钥格式，请确认文件正确' }
  }

  return { valid: true, message: '' }
}

/**
 * 验证连接名称
 * @param {string} name - 连接名称
 * @returns {Object} { valid, message }
 */
export function validateConnectionName(name) {
  if (!name || !name.trim()) {
    return { valid: false, message: '连接名称不能为空' }
  }

  const trimmedName = name.trim()

  if (trimmedName.length > 50) {
    return { valid: false, message: '连接名称长度不能超过 50 个字符' }
  }

  // 检查特殊字符（允许中文、字母、数字、空格、连字符、下划线）
  const nameRegex = /^[\u4e00-\u9fa5a-zA-Z0-9\s_-]+$/
  if (!nameRegex.test(trimmedName)) {
    return { valid: false, message: '连接名称只能包含中文、字母、数字、空格、连字符和下划线' }
  }

  return { valid: true, message: '' }
}

/**
 * 验证传输模式
 * @param {string} mode - 传输模式
 * @returns {Object} { valid, message }
 */
export function validateTransferMode(mode) {
  const validModes = ['sftp', 'scp']
  
  if (!mode) {
    return { valid: false, message: '请选择传输模式' }
  }

  if (!validModes.includes(mode.toLowerCase())) {
    return { valid: false, message: '传输模式必须是 SFTP 或 SCP' }
  }

  return { valid: true, message: '' }
}

/**
 * 验证完整的 SSH 配置
 * @param {Object} config - SSH 配置对象
 * @returns {Object} { valid, errors }
 */
export function validateSSHConfig(config) {
  const errors = {}

  // 验证连接名称
  const nameValidation = validateConnectionName(config.name)
  if (!nameValidation.valid) {
    errors.name = nameValidation.message
  }

  // 验证主机地址
  const hostValidation = validateHost(config.host)
  if (!hostValidation.valid) {
    errors.host = hostValidation.message
  }

  // 验证端口
  const portValidation = validatePort(config.port || DEFAULT_SSH_PORT)
  if (!portValidation.valid) {
    errors.port = portValidation.message
  }

  // 验证用户名
  const usernameValidation = validateUsername(config.username)
  if (!usernameValidation.valid) {
    errors.username = usernameValidation.message
  }

  // 验证认证方式
  if (!config.password && !config.keyPath) {
    errors.auth = '请提供密码或私钥文件路径'
  }

  // 如果提供了密码，验证密码
  if (config.password) {
    const passwordValidation = validatePassword(config.password)
    if (!passwordValidation.valid) {
      errors.password = passwordValidation.message
    }
  }

  // 如果提供了私钥路径，验证路径
  if (config.keyPath) {
    const keyPathValidation = validateKeyPath(config.keyPath)
    if (!keyPathValidation.valid) {
      errors.keyPath = keyPathValidation.message
    }
  }

  // 验证传输模式
  const transferModeValidation = validateTransferMode(config.transferMode)
  if (!transferModeValidation.valid) {
    errors.transferMode = transferModeValidation.message
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

/**
 * 验证文件名
 * @param {string} filename - 文件名
 * @returns {Object} { valid, message }
 */
export function validateFilename(filename) {
  if (!filename || !filename.trim()) {
    return { valid: false, message: '文件名不能为空' }
  }

  const trimmedFilename = filename.trim()

  if (trimmedFilename.length > 255) {
    return { valid: false, message: '文件名长度不能超过 255 个字符' }
  }

  // 检查非法字符
  const illegalChars = /[<>:"|?*\x00-\x1f]/
  if (illegalChars.test(trimmedFilename)) {
    return { valid: false, message: '文件名包含非法字符' }
  }

  // 检查保留名称（Windows）
  const reservedNames = ['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9']
  if (reservedNames.includes(trimmedFilename.toUpperCase())) {
    return { valid: false, message: '文件名是系统保留名称' }
  }

  // 检查以点开头或结尾
  if (trimmedFilename.startsWith('.') || trimmedFilename.endsWith('.')) {
    return { valid: true, message: '以点开头或结尾的文件名可能在某些系统中不可见' }
  }

  return { valid: true, message: '' }
}

/**
 * 验证目录名
 * @param {string} dirname - 目录名
 * @returns {Object} { valid, message }
 */
export function validateDirname(dirname) {
  // 目录名验证规则与文件名基本相同
  return validateFilename(dirname)
}

/**
 * 验证邮箱地址
 * @param {string} email - 邮箱地址
 * @returns {Object} { valid, message }
 */
export function validateEmail(email) {
  if (!email || !email.trim()) {
    return { valid: false, message: '邮箱地址不能为空' }
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email.trim())) {
    return { valid: false, message: '请输入有效的邮箱地址' }
  }

  return { valid: true, message: '' }
}

/**
 * 验证 URL
 * @param {string} url - URL 地址
 * @returns {Object} { valid, message }
 */
export function validateURL(url) {
  if (!url || !url.trim()) {
    return { valid: false, message: 'URL 不能为空' }
  }

  try {
    new URL(url.trim())
    return { valid: true, message: '' }
  } catch {
    return { valid: false, message: '请输入有效的 URL 地址' }
  }
}

/**
 * 验证正整数
 * @param {string|number} value - 数值
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {Object} { valid, message }
 */
export function validatePositiveInteger(value, min = 1, max = Number.MAX_SAFE_INTEGER) {
  if (value === null || value === undefined || value === '') {
    return { valid: false, message: '数值不能为空' }
  }

  const num = parseInt(value, 10)
  
  if (isNaN(num)) {
    return { valid: false, message: '请输入有效的数字' }
  }

  if (num < min) {
    return { valid: false, message: `数值不能小于 ${min}` }
  }

  if (num > max) {
    return { valid: false, message: `数值不能大于 ${max}` }
  }

  return { valid: true, message: '' }
}

/**
 * 批量验证
 * @param {Object} data - 要验证的数据对象
 * @param {Object} rules - 验证规则对象
 * @returns {Object} { valid, errors }
 */
export function validateBatch(data, rules) {
  const errors = {}

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field]
    const result = rule(value)
    
    if (!result.valid) {
      errors[field] = result.message
    }
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}