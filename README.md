# SSH - MDZZ 码滴织造

免费，只针对正常shell脚本，上传文件等操作

## 🚀 主要特性

- **🔐 安全加密存储**: 使用 AES-256 加密保护连接信息
- **💻 内嵌终端**: 基于 xterm.js 的现代化终端体验
- **📁 文件管理**: 支持 SFTP/SCP 文件传输，拖拽上传
- **⚡ Sudo 支持**: SCP 模式下支持 sudo 权限操作
- **🌍 中文支持**: 完美支持中文路径和文件名
- **🎯 简洁界面**: 基于 Vue 3 + Naive UI 的现代化界面

## 📁 项目结构

```
ssh-mdzz/
├── 后端 (Go + Wails)
│   ├── main.go                 # 程序入口
│   ├── app.go                  # 应用主逻辑
│   ├── crypto/
│   │   └── encryption.go       # AES-256 加密模块
│   ├── models/
│   │   └── config.go           # 数据模型定义
│   ├── ssh/
│   │   ├── client.go           # SSH 客户端
│   │   ├── sftp.go             # SFTP 文件操作
│   │   ├── scp.go              # SCP 文件操作
│   │   └── session.go          # 会话管理
│   └── storage/
│       └── store.go            # 本地存储
│
└── 前端 (Vue 3 + Naive UI)
    ├── src/
    │   ├── App.vue             # 根组件
    │   ├── components/         # 组件目录
    │   │   ├── auth/           # 认证相关
    │   │   │   ├── KeySetup.vue    # 密钥设置
    │   │   │   └── KeyVerify.vue   # 密钥验证
    │   │   ├── connection/     # 连接管理
    │   │   │   └── ConnectionDialog.vue
    │   │   ├── file/           # 文件管理
    │   │   │   ├── FileBrowser.vue # 文件浏览器
    │   │   │   └── FileTree.vue    # 文件目录树
    │   │   ├── layout/         # 布局组件
    │   │   │   └── AppHeader.vue
    │   │   └── terminal/       # 终端组件
    │   │       └── SSHTerminal.vue
    │   ├── composables/        # 组合式函数
    │   │   ├── useFileTransfer.js
    │   │   └── useSSHConnection.js
    │   ├── stores/             # 状态管理
    │   │   ├── auth.js
    │   │   └── connection.js
    │   ├── utils/              # 工具函数
    │   └── views/              # 页面视图
    │       ├── Dashboard.vue   # 主界面
    │       ├── Setup.vue       # 初始设置
    │       └── Settings.vue    # 设置页面
    └── package.json
```

## 🛠️ 技术栈

### 前端
- **Vue 3** - 现代化前端框架
- **Naive UI** - 优雅的 Vue 3 组件库
- **xterm.js** - 专业的终端模拟器
- **Pinia** - Vue 3 状态管理
- **Vite** - 快速构建工具

### 后端
- **Go** - 高性能后端语言
- **Wails** - Go + 前端的桌面应用框架
- **golang.org/x/crypto/ssh** - SSH 客户端库
- **github.com/pkg/sftp** - SFTP 文件传输
- **AES-256** - 军用级加密算法

## 🎯 核心功能

### 安全特性
- 本地设置加密密钥
- SSH 连接信息 AES-256 加密存储
- 启动时密钥验证，确保数据安全

### 连接管理
- 支持密码和密钥认证
- SFTP/SCP 传输模式选择
- 智能会话管理和自动重连
- 连接状态实时监控

### 文件操作
- 拖拽文件直接上传
- 双击文件自动下载
- SCP 模式 Sudo 权限支持
- 完美支持中文路径

### 终端体验
- 基于 xterm.js 的现代终端
- 命令历史和自动补全
- 多标签页支持
- 自定义主题

## 🚀 快速开始

### 环境要求
- Go 1.19+
- Node.js 16+
- Wails v2

### 安装依赖
```bash
# 安装 Wails
go install github.com/wailsapp/wails/v2/cmd/wails@latest

# 安装前端依赖
cd frontend && npm install
```

### 开发运行
```bash
# 开发模式
wails dev

# 构建应用
wails build
```

### 首次使用
1. 启动应用后设置加密密钥
2. 添加 SSH 连接配置
3. 双击连接名称建立连接
4. 享受现代化的 SSH 管理体验

## 📝 使用说明

### 界面布局
- **左侧面板**: SSH 连接列表 + 文件目录树
- **右侧面板**: 终端 + 文件浏览器（标签页）
- **顶部工具栏**: 主题切换、设置、关于

### 文件操作
- **上传**: 拖拽文件到文件列表
- **下载**: 双击文件或右键下载
- **Sudo**: SCP 模式下切换 SUDO/USER 开关

### 快捷操作
- 双击连接名称快速连接
- 悬停显示连接详细信息
- 右键文件显示操作菜单
