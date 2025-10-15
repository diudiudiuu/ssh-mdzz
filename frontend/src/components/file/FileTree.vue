<template>
  <div class="file-tree">
    <div class="tree-content">
      <n-tree
        :data="treeData"
        :render-label="renderLabel"
        :render-prefix="renderPrefix"
        :on-load="loadChildren"
        :expanded-keys="expandedKeys"
        :selected-keys="selectedKeys"
        @update:selected-keys="handleSelect"
        @update:expanded-keys="handleExpand"
        block-line
        checkable
        cascade
        virtual-scroll
        style="height: 100%;"
      />
    </div>
    
    <!-- 加载状态 -->
    <div v-if="loading" class="loading-overlay">
      <n-spin size="small" />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, h } from 'vue'
import { NIcon, NTag } from 'naive-ui'
import { 
  FolderOutline, 
  FolderOpenOutline, 
  DocumentOutline 
} from '@vicons/ionicons5'
import { useFileTransfer } from '@/composables/useFileTransfer'

const props = defineProps({
  configId: {
    type: String,
    required: true
  },
  currentPath: {
    type: String,
    default: '/'
  }
})

const emit = defineEmits(['path-change'])

const { listFiles } = useFileTransfer()

const treeData = ref([])
const expandedKeys = ref(['/'])
const selectedKeys = ref([])
const loading = ref(false)

// 渲染文件/文件夹图标
function renderPrefix({ option }) {
  if (option.isDir) {
    return h(NIcon, { 
      color: option.expanded ? '#18a058' : '#666' 
    }, {
      default: () => h(option.expanded ? FolderOpenOutline : FolderOutline)
    })
  }
  return h(NIcon, { color: '#999' }, {
    default: () => h(DocumentOutline)
  })
}

// 渲染文件/文件夹标签
function renderLabel({ option }) {
  return h('div', {
    class: 'tree-label',
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%'
    }
  }, [
    h('span', { class: 'file-name' }, option.label),
    option.isDir ? null : h(NTag, {
      size: 'tiny',
      type: 'info'
    }, {
      default: () => formatFileSize(option.size)
    })
  ])
}

// 格式化文件大小
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

// 加载子目录
async function loadChildren(node) {
  if (!node.isDir) return
  
  try {
    const files = await listFiles(props.configId, node.key)
    
    const children = files.map(file => ({
      key: file.path,
      label: file.name,
      isDir: file.isDir,
      size: file.size,
      isLeaf: !file.isDir,
      children: file.isDir ? [] : undefined
    }))
    
    node.children = children
    return children
  } catch (error) {
    console.error('加载目录失败:', error)
    return []
  }
}

// 处理节点选择
function handleSelect(keys) {
  selectedKeys.value = keys
  if (keys.length > 0) {
    emit('path-change', keys[0])
  }
}

// 处理节点展开
function handleExpand(keys) {
  expandedKeys.value = keys
}

// 初始化根目录
async function initializeTree() {
  loading.value = true
  try {
    const files = await listFiles(props.configId, '/')
    
    treeData.value = [{
      key: '/',
      label: '根目录',
      isDir: true,
      children: files.map(file => ({
        key: file.path,
        label: file.name,
        isDir: file.isDir,
        size: file.size,
        isLeaf: !file.isDir,
        children: file.isDir ? [] : undefined
      }))
    }]
  } catch (error) {
    console.error('初始化文件树失败:', error)
  } finally {
    loading.value = false
  }
}

// 监听配置变化
watch(() => props.configId, () => {
  if (props.configId) {
    initializeTree()
  }
}, { immediate: true })

onMounted(() => {
  if (props.configId) {
    initializeTree()
  }
})
</script>

<style scoped>
.file-tree {
  height: 100%;
  position: relative;
  overflow: hidden;
}

.tree-content {
  height: 100%;
  overflow: auto;
  padding: 8px;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tree-label {
  font-size: 13px;
}

.file-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.n-tree-node-content) {
  padding: 4px 8px;
}

:deep(.n-tree-node-content:hover) {
  background: var(--bg-hover);
}

:deep(.n-tree-node--selected .n-tree-node-content) {
  background: var(--primary-color-light);
}
</style>