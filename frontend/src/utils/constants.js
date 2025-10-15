// 应用常量定义

// 传输模式
export const TRANSFER_MODES = {
  SFTP: 'sftp',
  SCP: 'scp'
}

// 终端主题
export const TERMINAL_THEMES = {
  dark: {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#d4d4d4',
    black: '#000000',
    red: '#cd3131',
    green: '#0dbc79',
    yellow: '#e5e510',
    blue: '#2472c8',
    magenta: '#bc3fbc',
    cyan: '#11a8cd',
    white: '#e5e5e5',
    brightBlack: '#666666',
    brightRed: '#f14c4c',
    brightGreen: '#23d18b',
    brightYellow: '#f5f543',
    brightBlue: '#3b8eea',
    brightMagenta: '#d670d6',
    brightCyan: '#29b8db',
    brightWhite: '#e5e5e5'
  },
  light: {
    background: '#ffffff',
    foreground: '#383a42',
    cursor: '#383a42',
    black: '#000000',
    red: '#e45649',
    green: '#50a14f',
    yellow: '#c18401',
    blue: '#0184bc',
    magenta: '#a626a4',
    cyan: '#0997b3',
    white: '#fafafa',
    brightBlack: '#4f525e',
    brightRed: '#e06c75',
    brightGreen: '#98c379',
    brightYellow: '#e5c07b',
    brightBlue: '#61afef',
    brightMagenta: '#c678dd',
    brightCyan: '#56b6c2',
    brightWhite: '#ffffff'
  },
  dracula: {
    background: '#282a36',
    foreground: '#f8f8f2',
    cursor: '#f8f8f2',
    black: '#000000',
    red: '#ff5555',
    green: '#50fa7b',
    yellow: '#f1fa8c',
    blue: '#bd93f9',
    magenta: '#ff79c6',
    cyan: '#8be9fd',
    white: '#bbbbbb',
    brightBlack: '#555555',
    brightRed: '#ff5555',
    brightGreen: '#50fa7b',
    brightYellow: '#f1fa8c',
    brightBlue: '#bd93f9',
    brightMagenta: '#ff79c6',
    brightCyan: '#8be9fd',
    brightWhite: '#ffffff'
  }
}

// 终端配置
export const TERMINAL_CONFIG = {
  fontSize: 14,
  fontFamily: 'Monaco, Menlo, "Ubuntu Mono", Consolas, "Courier New", monospace',
  cursorBlink: true,
  cursorStyle: 'block',
  scrollback: 10000,
  theme: TERMINAL_THEMES.dark
}

// 文件大小格式化单位
export const FILE_SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB']

// 默认端口
export const DEFAULT_SSH_PORT = '22'

// 心跳间隔（毫秒）
export const KEEP_ALIVE_INTERVAL = 60000

// 连接超时（毫秒）
export const CONNECTION_TIMEOUT = 10000

// 文件传输缓冲区大小
export const TRANSFER_BUFFER_SIZE = 32 * 1024

// 支持的认证方式
export const AUTH_METHODS = {
  PASSWORD: 'password',
  KEY: 'key'
}

// 会话状态
export const SESSION_STATUS = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  ERROR: 'error'
}

// 传输状态
export const TRANSFER_STATUS = {
  PENDING: 'pending',
  UPLOADING: 'uploading',
  DOWNLOADING: 'downloading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled'
}

// 本地存储键名
export const STORAGE_KEYS = {
  THEME: 'ssh-mdzz-theme',
  TERMINAL_SETTINGS: 'ssh-mdzz-terminal-settings',
  LAST_CONNECTION: 'ssh-mdzz-last-connection',
  SETTINGS: 'ssh-mdzz-settings'
}

// 文件图标映射
export const FILE_ICONS = {
  folder: '📁',
  file: '📄',
  image: '🖼️',
  video: '🎬',
  audio: '🎵',
  archive: '📦',
  code: '💻',
  document: '📝',
  pdf: '📕',
  link: '🔗'
}

// 文件扩展名到图标的映射
export const FILE_EXT_ICONS = {
  // 图片
  jpg: 'image',
  jpeg: 'image',
  png: 'image',
  gif: 'image',
  svg: 'image',
  webp: 'image',
  
  // 视频
  mp4: 'video',
  avi: 'video',
  mkv: 'video',
  mov: 'video',
  
  // 音频
  mp3: 'audio',
  wav: 'audio',
  flac: 'audio',
  
  // 压缩包
  zip: 'archive',
  tar: 'archive',
  gz: 'archive',
  rar: 'archive',
  '7z': 'archive',
  
  // 代码
  js: 'code',
  ts: 'code',
  vue: 'code',
  py: 'code',
  go: 'code',
  java: 'code',
  cpp: 'code',
  c: 'code',
  sh: 'code',
  
  // 文档
  txt: 'document',
  md: 'document',
  doc: 'document',
  docx: 'document',
  
  // PDF
  pdf: 'pdf'
}

// 错误消息
export const ERROR_MESSAGES = {
  CONNECTION_FAILED: '连接失败',
  AUTH_FAILED: '认证失败',
  TIMEOUT: '连接超时',
  NETWORK_ERROR: '网络错误',
  PERMISSION_DENIED: '权限被拒绝',
  FILE_NOT_FOUND: '文件不存在',
  INVALID_KEY: '无效的加密密钥',
  KEY_REQUIRED: '请先设置加密密钥'
}