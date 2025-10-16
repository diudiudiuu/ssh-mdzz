<template>
  <div class="file-browser">
    <!-- 路径显示栏 -->
    <div class="path-bar">
      <div class="path-display">
        <span class="current-path">{{ currentPath || '/' }}</span>
      </div>
      
      <!-- Sudo 模式切换（仅 SCP 连接显示） -->
      <n-switch
        v-if="connectionInfo?.transferMode === 'scp'"
        v-model:value="sudoMode"
        size="small"
      >
        <template #checked>
          <span class="sudo-label">SUDO</span>
        </template>
        <template #unchecked>
          <span class="sudo-label">USER</span>
        </template>
      </n-switch>
    </div>

    <!-- 文件列表 - 支持拖拽上传 -->
    <div 
      class="file-list-container"
      @drop="handleDrop"
      @dragover="handleDragOver"
      @dragenter="handleDragEnter"
      @dragleave="handleDragLeave"
      :class="{ 'drag-over': isDragOver }"
    >
      <n-spin :show="loading">
        <div class="file-list">
          <!-- 返回上一层（非根目录时显示） -->
          <div
            v-if="currentPath !== '/'"
            class="file-item parent-dir"
            @dblclick="goToParentDir"
          >
            <div class="file-icon">
              <n-icon size="16" color="#666">
                <ArrowUpOutline />
              </n-icon>
            </div>
            <div class="file-info">
              <div class="file-name">..</div>
              <div class="file-details">
                <span class="file-size"></span>
                <span class="file-time"></span>
              </div>
            </div>
          </div>

          <!-- 文件和文件夹列表 -->
          <div
            v-for="file in sortedFiles"
            :key="file.path"
            class="file-item"
            @dblclick="handleDoubleClick(file)"
            @contextmenu="handleRightClick($event, file)"
          >
            <div class="file-icon">
              <n-icon size="16" :color="getFileIconColor(file)">
                <component :is="getFileIconComponent(file)" />
              </n-icon>
            </div>
            <div class="file-info">
              <div class="file-name" :title="file.name">{{ file.name }}</div>
              <div class="file-details">
                <span v-if="!file.isDir" class="file-size">{{ formatFileSize(file.size) }}</span>
                <span class="file-time">{{ formatTime(file.modTime) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 拖拽提示 -->
        <div v-if="isDragOver" class="drag-overlay">
          <div class="drag-content">
            <n-icon size="48" color="#18a058">
              <CloudUploadOutline />
            </n-icon>
            <p>释放文件以上传到当前目录</p>
          </div>
        </div>

        <n-empty
          v-if="!loading && files.length === 0"
          description="此目录为空，拖拽文件到此处上传"
          style="margin-top: 60px"
        />
      </n-spin>
    </div>

    <!-- 新建文件夹对话框 -->
    <n-modal
      v-model:show="showCreateDialog"
      preset="dialog"
      title="新建文件夹"
      positive-text="创建"
      negative-text="取消"
      @positive-click="handleCreateFolder"
    >
      <n-input
        v-model:value="newFolderName"
        placeholder="输入文件夹名称"
        @keyup.enter="handleCreateFolder"
      />
    </n-modal>

    <!-- 文件操作菜单 -->
    <n-dropdown
      :show="showContextMenu"
      :options="contextMenuOptions"
      :x="contextMenuX"
      :y="contextMenuY"
      placement="bottom-start"
      @select="handleContextMenuSelect"
      @clickoutside="showContextMenu = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, h } from 'vue'
import { useFileTransfer } from '@/composables/useFileTransfer'
import { useMessage, useDialog } from 'naive-ui'
import { formatFileSize, formatTime } from '@/utils/format'
import { useConnectionStore } from '@/stores/connection'
import {
  RefreshOutline,
  FolderOutline,
  CloudUploadOutline,
  DocumentOutline,
  FolderOpenOutline,
  ImageOutline,
  VideocamOutline,
  MusicalNotesOutline,
  CodeSlashOutline,
  ArchiveOutline,
  TrashOutline,
  DownloadOutline,
  CreateOutline,
  CopyOutline,
  ArrowUpOutline
} from '@vicons/ionicons5'

const props = defineProps({
  configId: {
    type: String,
    required: true
  },
  initialPath: {
    type: String,
    default: '/'
  }
})

const emit = defineEmits(['path-change'])

const connectionStore = useConnectionStore()
const message = useMessage()
const dialog = useDialog()
const { listFiles, createDirectory, deleteFile, deleteDirectory, downloadFile, uploadFile } = useFileTransfer()

const loading = ref(false)
const files = ref([])
const currentPath = ref(props.initialPath)
const showCreateDialog = ref(false)
const newFolderName = ref('')
const showContextMenu = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const contextMenuFile = ref(null)
const isDragOver = ref(false)
const sudoMode = ref(false)

const pathParts = computed(() => {
  if (!currentPath.value || currentPath.value === '/') return []
  return currentPath.value.split('/').filter(p => p)
})

const sortedFiles = computed(() => {
  return [...files.value].sort((a, b) => {
    // 目录优先
    if (a.isDir && !b.isDir) return -1
    if (!a.isDir && b.isDir) return 1
    // 按名称排序
    return a.name.localeCompare(b.name)
  })
})

const connectionInfo = computed(() => {
  return connectionStore.connections.find(c => c.id === props.configId)
})

const contextMenuOptions = computed(() => {
  if (!contextMenuFile.value) return []
  
  const options = []
  
  if (contextMenuFile.value.isDir) {
    options.push({
      label: '打开',
      key: 'open',
      icon: () => h(FolderOpenOutline)
    })
  } else {
    options.push({
      label: '下载',
      key: 'download',
      icon: () => h(DownloadOutline)
    })
  }
  
  options.push(
    { type: 'divider' },
    {
      label: '重命名',
      key: 'rename',
      icon: () => h(CreateOutline)
    },
    {
      label: '复制路径',
      key: 'copy-path',
      icon: () => h(CopyOutline)
    },
    { type: 'divider' },
    {
      label: '删除',
      key: 'delete',
      icon: () => h(TrashOutline)
    }
  )
  
  return options
})

// 获取文件图标组件
function getFileIconComponent(file) {
  if (file.isDir) {
    return FolderOutline
  }
  
  const ext = file.name.split('.').pop()?.toLowerCase()
  
  // 图片文件
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
    return ImageOutline
  }
  
  // 视频文件
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
    return VideocamOutline
  }
  
  // 音频文件
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext)) {
    return MusicalNotesOutline
  }
  
  // 代码文件
  if (['js', 'ts', 'vue', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'php', 'go', 'rs'].includes(ext)) {
    return CodeSlashOutline
  }
  
  // 压缩文件
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz'].includes(ext)) {
    return ArchiveOutline
  }
  
  return DocumentOutline
}

// 获取文件图标颜色
function getFileIconColor(file) {
  if (file.isDir) {
    return '#f0a020'
  }
  
  const ext = file.name.split('.').pop()?.toLowerCase()
  
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
    return '#18a058'
  }
  
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv', 'flv', 'webm'].includes(ext)) {
    return '#2080f0'
  }
  
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma'].includes(ext)) {
    return '#d03050'
  }
  
  if (['js', 'ts', 'vue', 'py', 'java', 'cpp', 'c', 'h', 'css', 'html', 'php', 'go', 'rs'].includes(ext)) {
    return '#18a058'
  }
  
  return '#666'
}

// 拖拽处理
function handleDragOver(e) {
  e.preventDefault()
  e.dataTransfer.dropEffect = 'copy'
}

function handleDragEnter(e) {
  e.preventDefault()
  isDragOver.value = true
}

function handleDragLeave(e) {
  e.preventDefault()
  // 只有当离开整个容器时才隐藏拖拽提示
  if (!e.currentTarget.contains(e.relatedTarget)) {
    isDragOver.value = false
  }
}

async function handleDrop(e) {
  e.preventDefault()
  isDragOver.value = false
  
  const files = Array.from(e.dataTransfer.files)
  if (files.length === 0) return
  
  try {
    let successCount = 0
    let errorCount = 0
    
    for (const file of files) {
      try {
        // 构建远程路径
        const remotePath = currentPath.value === '/' 
          ? `/${file.name}` 
          : `${currentPath.value}/${file.name}`
        
        // 对于拖拽的文件，我们需要先保存到临时位置，然后上传
        // 这里需要调用后端 API 来处理文件上传
        await uploadFile(props.configId, file.path || file.name, remotePath, sudoMode.value)
        successCount++
      } catch (error) {
        console.error(`上传文件 ${file.name} 失败:`, error)
        errorCount++
      }
    }
    
    if (successCount > 0) {
      message.success(`成功上传 ${successCount} 个文件`)
    }
    if (errorCount > 0) {
      message.error(`${errorCount} 个文件上传失败`)
    }
    
    await refreshFiles()
  } catch (error) {
    message.error(`上传失败: ${error.message}`)
  }
}

// 双击处理
function handleDoubleClick(file) {
  if (file.isDir) {
    // 进入目录
    navigateToPath(file.path)
  } else {
    // 下载文件
    handleDownload(file)
  }
}

// 右键菜单
function handleRightClick(e, file) {
  e.preventDefault()
  contextMenuFile.value = file
  contextMenuX.value = e.clientX
  contextMenuY.value = e.clientY
  showContextMenu.value = true
}

// 处理右键菜单选择
async function handleContextMenuSelect(key) {
  showContextMenu.value = false
  
  if (!contextMenuFile.value) return
  
  const file = contextMenuFile.value
  
  switch (key) {
    case 'open':
      if (file.isDir) {
        navigateToPath(file.path)
      }
      break
      
    case 'download':
      await handleDownload(file)
      break
      
    case 'rename':
      // TODO: 实现重命名功能
      message.info('重命名功能开发中')
      break
      
    case 'copy-path':
      try {
        await navigator.clipboard.writeText(file.path)
        message.success('路径已复制到剪贴板')
      } catch (error) {
        message.error('复制失败')
      }
      break
      
    case 'delete':
      await handleDelete(file)
      break
  }
  
  contextMenuFile.value = null
}

// 下载文件
async function handleDownload(file) {
  try {
    await downloadFile(props.configId, file.path, sudoMode.value)
    message.success(`开始下载: ${file.name}`)
  } catch (error) {
    message.error(`下载失败: ${error.message}`)
  }
}

// 删除文件/目录
async function handleDelete(file) {
  const itemType = file.isDir ? '目录' : '文件'
  
  dialog.warning({
    title: `删除${itemType}`,
    content: `确定要删除${itemType} "${file.name}" 吗？此操作不可撤销。`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        if (file.isDir) {
          await deleteDirectory(props.configId, file.path, sudoMode.value)
        } else {
          await deleteFile(props.configId, file.path, sudoMode.value)
        }
        
        message.success(`${itemType}删除成功`)
        await refreshFiles()
      } catch (error) {
        message.error(`删除失败: ${error.message}`)
      }
    }
  })
}

// 返回上一层目录
function goToParentDir() {
  if (currentPath.value === '/') return
  
  const parentPath = currentPath.value.split('/').slice(0, -1).join('/') || '/'
  navigateToPath(parentPath)
}

// 导航
function navigateToPath(pathOrIndex) {
  let newPath
  
  if (typeof pathOrIndex === 'number') {
    // 点击面包屑导航
    const parts = pathParts.value.slice(0, pathOrIndex + 1)
    newPath = '/' + parts.join('/')
  } else {
    // 直接路径
    newPath = pathOrIndex
  }
  
  currentPath.value = newPath
  emit('path-change', newPath)
  loadFiles()
}

// 刷新文件列表
async function refreshFiles() {
  await loadFiles()
}

// 加载文件列表
async function loadFiles() {
  loading.value = true
  try {
    const result = await listFiles(props.configId, currentPath.value)
    files.value = result || []
  } catch (error) {
    message.error(`加载文件列表失败: ${error.message}`)
    files.value = []
  } finally {
    loading.value = false
  }
}

// 创建文件夹
async function handleCreateFolder() {
  if (!newFolderName.value.trim()) {
    message.error('请输入文件夹名称')
    return
  }
  
  try {
    const folderPath = currentPath.value === '/' 
      ? `/${newFolderName.value}` 
      : `${currentPath.value}/${newFolderName.value}`
      
    await createDirectory(props.configId, folderPath, sudoMode.value)
    message.success('文件夹创建成功')
    
    showCreateDialog.value = false
    newFolderName.value = ''
    await refreshFiles()
  } catch (error) {
    message.error(`创建文件夹失败: ${error.message}`)
  }
}

// 监听路径变化
watch(() => props.initialPath, (newPath) => {
  currentPath.value = newPath
  loadFiles()
})

// 监听配置变化
watch(() => props.configId, () => {
  if (props.configId) {
    loadFiles()
  }
})

onMounted(() => {
  if (props.configId) {
    loadFiles()
  }
})
</script>

<style scoped>
.file-browser {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
}

.path-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-tertiary);
  flex-shrink: 0;
}

.path-display {
  flex: 1;
  display: flex;
  align-items: center;
}

.current-path {
  font-size: 11px;
  color: var(--text-primary);
  font-family: var(--font-family-mono);
  background: var(--bg-secondary);
  padding: 4px 8px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-color);
  transition: all var(--transition-normal);
}

.current-path:hover {
  border-color: var(--primary-color);
  background: var(--bg-elevated);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sudo-label {
  font-size: 10px;
  font-weight: bold;
  color: #fff;
}

.file-list-container {
  flex: 1;
  overflow: auto;
  position: relative;
  padding: 0;
  background: var(--bg-secondary);
}

.file-list-container.drag-over {
  background: rgba(24, 160, 88, 0.1);
  border: 2px dashed var(--primary-color);
}

.file-list {
  display: flex;
  flex-direction: column;
}

.file-item {
  display: flex;
  align-items: center;
  gap: var(--spacing-sm);
  padding: var(--spacing-sm) var(--spacing-md);
  cursor: pointer;
  transition: all var(--transition-normal);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  min-height: 36px;
  position: relative;
}

.file-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: transparent;
  border-radius: var(--radius-sm);
  transition: all var(--transition-normal);
  pointer-events: none;
}

.file-item:hover {
  background: var(--bg-elevated);
  transform: translateX(2px);
}

.file-item:hover::before {
  background: linear-gradient(135deg, rgba(24, 160, 88, 0.1) 0%, rgba(24, 160, 88, 0.05) 100%);
}

.file-item:last-child {
  border-bottom: none;
}

.parent-dir {
  font-weight: 600;
  border-left: 3px solid var(--primary-color);
  background: rgba(24, 160, 88, 0.05);
}

.parent-dir .file-name {
  color: var(--primary-color);
  font-weight: 600;
}

.file-icon {
  flex-shrink: 0;
  width: 20px;
  display: flex;
  justify-content: center;
}

.file-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.file-name {
  font-size: var(--font-size-sm);
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  font-weight: 500;
  transition: color var(--transition-normal);
}

.file-item:hover .file-name {
  color: var(--primary-color);
}

.file-details {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
  flex-shrink: 0;
  font-family: var(--font-family-mono);
}

.file-size {
  min-width: 60px;
  text-align: right;
}

.file-time {
  min-width: 120px;
  text-align: right;
}

.drag-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(24, 160, 88, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  backdrop-filter: blur(8px);
  border-radius: var(--radius-lg);
}

.drag-content {
  text-align: center;
  color: var(--primary-color);
  background: var(--bg-secondary);
  padding: var(--spacing-xl);
  border-radius: var(--radius-xl);
  border: 2px dashed var(--primary-color);
  box-shadow: var(--shadow-lg);
}

.drag-content p {
  margin: 12px 0 0;
  font-size: var(--font-size-lg);
  font-weight: 600;
  color: var(--text-primary);
}

/* 滚动条样式 */
.file-list-container::-webkit-scrollbar {
  width: 6px;
}

.file-list-container::-webkit-scrollbar-track {
  background: transparent;
  border-radius: var(--radius-sm);
}

.file-list-container::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.15);
  border-radius: var(--radius-sm);
  transition: background var(--transition-normal);
}

.file-list-container::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.25);
}

/* 文件图标动画 */
.file-icon {
  transition: all var(--transition-normal);
}

.file-item:hover .file-icon {
  transform: scale(1.1);
}

/* 空状态样式 */
:deep(.n-empty) {
  color: var(--text-secondary);
}

:deep(.n-empty .n-empty__icon) {
  color: var(--text-tertiary);
}

/* 加载状态样式 */
:deep(.n-spin) {
  color: var(--primary-color);
}
</style>