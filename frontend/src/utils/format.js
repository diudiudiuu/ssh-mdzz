// 格式化工具函数

import { FILE_SIZE_UNITS, FILE_EXT_ICONS, FILE_ICONS } from './constants'

/**
 * 格式化文件大小
 * @param {number} bytes - 字节数
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的文件大小
 */
export function formatFileSize(bytes, decimals = 2) {
  if (bytes === 0) return '0 B'
  if (!bytes || bytes < 0) return '-'

  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const i = Math.floor(Math.log(bytes) / Math.log(k))

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + FILE_SIZE_UNITS[i]
}

/**
 * 格式化时间
 * @param {Date|string|number} date - 日期对象、字符串或时间戳
 * @param {string} format - 格式化模板
 * @returns {string} 格式化后的时间字符串
 */
export function formatTime(date, format = 'YYYY-MM-DD HH:mm:ss') {
  if (!date) return '-'
  
  const d = new Date(date)
  if (isNaN(d.getTime())) return '-'

  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  const hour = String(d.getHours()).padStart(2, '0')
  const minute = String(d.getMinutes()).padStart(2, '0')
  const second = String(d.getSeconds()).padStart(2, '0')

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
    .replace('HH', hour)
    .replace('mm', minute)
    .replace('ss', second)
}

/**
 * 格式化持续时间
 * @param {number} ms - 毫秒数
 * @returns {string} 格式化后的持续时间
 */
export function formatDuration(ms) {
  if (!ms || ms < 0) return '0s'

  const seconds = Math.floor(ms / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (days > 0) {
    return `${days}d ${hours % 24}h`
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`
  } else {
    return `${seconds}s`
  }
}

/**
 * 格式化传输速度
 * @param {number} bytesPerSecond - 每秒字节数
 * @returns {string} 格式化后的速度
 */
export function formatSpeed(bytesPerSecond) {
  return formatFileSize(bytesPerSecond) + '/s'
}

/**
 * 格式化延迟
 * @param {number} ms - 毫秒数
 * @returns {string} 格式化后的延迟
 */
export function formatLatency(ms) {
  if (!ms && ms !== 0) return '-'
  if (ms < 0) return '-'
  
  return `${Math.round(ms)}ms`
}

/**
 * 获取文件图标
 * @param {string} fileName - 文件名
 * @param {boolean} isDir - 是否是目录
 * @returns {string} 图标 emoji
 */
export function getFileIcon(fileName, isDir) {
  if (isDir) return FILE_ICONS.folder

  const ext = fileName.split('.').pop()?.toLowerCase()
  if (!ext) return FILE_ICONS.file

  const iconType = FILE_EXT_ICONS[ext]
  return FILE_ICONS[iconType] || FILE_ICONS.file
}

/**
 * 格式化文件权限
 * @param {string} mode - 权限字符串（如 'drwxr-xr-x'）
 * @returns {string} 格式化后的权限
 */
export function formatFileMode(mode) {
  if (!mode || mode.length < 10) return mode
  return mode.substring(0, 10)
}

/**
 * 截断文本
 * @param {string} text - 要截断的文本
 * @param {number} maxLength - 最大长度
 * @returns {string} 截断后的文本
 */
export function truncate(text, maxLength = 50) {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * 格式化百分比
 * @param {number} value - 数值（0-100）
 * @param {number} decimals - 小数位数
 * @returns {string} 格式化后的百分比
 */
export function formatPercentage(value, decimals = 1) {
  if (value === null || value === undefined) return '0%'
  return value.toFixed(decimals) + '%'
}

/**
 * 高亮搜索文本
 * @param {string} text - 原始文本
 * @param {string} keyword - 搜索关键词
 * @returns {string} 带高亮标记的 HTML
 */
export function highlightText(text, keyword) {
  if (!keyword || !text) return text
  
  const regex = new RegExp(`(${keyword})`, 'gi')
  return text.replace(regex, '<mark>$1</mark>')
}

/**
 * 格式化连接字符串
 * @param {Object} config - SSH 配置对象
 * @returns {string} user@host:port 格式
 */
export function formatConnectionString(config) {
  if (!config) return ''
  return `${config.username}@${config.host}:${config.port}`
}

/**
 * 解析路径
 * @param {string} path - 文件路径
 * @returns {Object} { dir, name, ext }
 */
export function parsePath(path) {
  if (!path) return { dir: '', name: '', ext: '' }
  
  const parts = path.split('/')
  const fileName = parts.pop() || ''
  const dir = parts.join('/') || '/'
  const lastDot = fileName.lastIndexOf('.')
  
  return {
    dir,
    name: lastDot > 0 ? fileName.substring(0, lastDot) : fileName,
    ext: lastDot > 0 ? fileName.substring(lastDot + 1) : ''
  }
}

/**
 * 生成唯一 ID
 * @returns {string} 唯一标识符
 */
export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 节流函数
 * @param {Function} fn - 要节流的函数
 * @param {number} delay - 延迟时间（毫秒）
 * @returns {Function} 节流后的函数
 */
export function throttle(fn, delay = 300) {
  let lastTime = 0
  return function (...args) {
    const now = Date.now()
    if (now - lastTime >= delay) {
      fn.apply(this, args)
      lastTime = now
    }
  }
}