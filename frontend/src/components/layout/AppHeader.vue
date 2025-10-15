<template>
  <div class="app-toolbar">
    <!-- 左侧标题 -->
    <div class="toolbar-info">
      <span class="app-title">SSH MDZZ</span>
    </div>

    <!-- 右侧按钮 -->
    <div class="toolbar-buttons">
      <!-- 设置 -->
      <n-tooltip placement="bottom">
        <template #trigger>
          <n-button size="small" @click="showSettings">
            <template #icon>
              <n-icon><SettingsOutline /></n-icon>
            </template>
          </n-button>
        </template>
        设置
      </n-tooltip>
    </div>

    <!-- 设置对话框 -->
    <n-modal
      v-model:show="settingsVisible"
      preset="card"
      title="设置"
      style="width: 500px"
    >
      <n-space vertical :size="20">
        <!-- 通用设置 -->
        <div>
          <n-text strong>通用设置</n-text>
          <n-divider style="margin: 8px 0" />
          
          <n-space vertical :size="12">
            <div class="setting-item">
              <n-text>自动重连</n-text>
              <n-switch v-model:value="settings.autoReconnect" />
            </div>

            <div class="setting-item">
              <n-text>心跳间隔（秒）</n-text>
              <n-input-number
                v-model:value="settings.keepAliveInterval"
                :min="10"
                :max="300"
                style="width: 120px"
              />
            </div>
          </n-space>
        </div>

        <!-- 确认设置 -->
        <div>
          <n-text strong>确认提示</n-text>
          <n-divider style="margin: 8px 0" />
          
          <n-space vertical :size="12">
            <div class="setting-item">
              <n-text>删除连接时确认</n-text>
              <n-switch v-model:value="settings.confirmOnDelete" />
            </div>

            <div class="setting-item">
              <n-text>断开连接时确认</n-text>
              <n-switch v-model:value="settings.confirmOnDisconnect" />
            </div>
          </n-space>
        </div>

        <!-- 退出登录 -->
        <div>
          <n-text strong>账户</n-text>
          <n-divider style="margin: 8px 0" />
          
          <n-button type="error" block @click="handleLogout">
            退出登录
          </n-button>
        </div>
      </n-space>
    </n-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { useAuthStore } from '@/stores/auth'
import {
  SettingsOutline
} from '@vicons/ionicons5'

// 定义事件
defineEmits(['new-session', 'refresh', 'toggle-files', 'toggle-terminal'])

const message = useMessage()
const dialog = useDialog()
const authStore = useAuthStore()

const settingsVisible = ref(false)
const settings = ref({
  autoReconnect: true,
  keepAliveInterval: 30,
  confirmOnDelete: true,
  confirmOnDisconnect: false
})

function showSettings() {
  settingsVisible.value = true
}

function handleLogout() {
  dialog.warning({
    title: '确认退出',
    content: '退出登录后需要重新输入密钥才能访问应用，确定要退出吗？',
    positiveText: '确定退出',
    negativeText: '取消',
    onPositiveClick: () => {
      authStore.clearKey()
      message.success('已退出登录')
    }
  })
}


</script>

<style scoped>
.app-toolbar {
  height: 48px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  flex-shrink: 0;
  backdrop-filter: blur(8px);
  
  /* macOS 安全区域适配 */
  padding-top: max(8px, var(--safe-area-inset-top));
  padding-left: max(16px, calc(var(--safe-area-inset-left) + 16px));
  padding-right: max(16px, calc(var(--safe-area-inset-right) + 16px));
  
  /* macOS 窗口控制按钮区域避让 */
  -webkit-app-region: drag;
  position: relative;
  z-index: 100;
}

.toolbar-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
  -webkit-app-region: no-drag;
}

.toolbar-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: max(0px, calc(var(--macos-traffic-lights-width) - var(--safe-area-inset-left) - 16px));
  -webkit-app-region: drag;
}

.app-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: 0.5px;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
}

/* 按钮组样式优化 */
:deep(.n-button-group) {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
}

:deep(.n-button-group .n-button) {
  border-radius: 0;
  background: var(--bg-tertiary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}

:deep(.n-button-group .n-button:hover) {
  background: var(--bg-elevated);
  border-color: var(--primary-color);
  color: var(--text-primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(24, 160, 88, 0.2);
}

:deep(.n-button-group .n-button:active) {
  transform: translateY(0);
}

:deep(.n-button-group .n-button .n-icon) {
  color: var(--text-secondary);
  transition: color 0.2s;
}

:deep(.n-button-group .n-button:hover .n-icon) {
  color: var(--primary-color);
}

:deep(.n-button-group .n-button:first-child) {
  border-top-left-radius: 8px;
  border-bottom-left-radius: 8px;
}

:deep(.n-button-group .n-button:last-child) {
  border-top-right-radius: 8px;
  border-bottom-right-radius: 8px;
}

/* 分割线样式 */
:deep(.n-divider--vertical) {
  height: 24px;
  margin: 0 12px;
  border-color: var(--border-color);
  opacity: 0.6;
}

/* 工具提示样式 */
:deep(.n-tooltip .n-tooltip-content) {
  font-size: 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
}

/* 设置模态框样式 */
:deep(.n-modal .n-card) {
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
}

:deep(.n-modal .n-card .n-card-header) {
  border-bottom: 1px solid var(--border-color);
  padding: 20px 24px 16px;
}

:deep(.n-modal .n-card .n-card-content) {
  padding: 24px;
}

/* macOS 特定样式 */
@supports (-webkit-app-region: drag) {
  .app-toolbar {
    /* macOS 应用拖拽区域 */
    -webkit-user-select: none;
    user-select: none;
  }
  
  .toolbar-buttons,
  .toolbar-buttons * {
    /* 确保所有按钮都可以点击 */
    -webkit-app-region: no-drag;
  }
}

/* macOS 全屏模式适配 */
@media screen and (max-width: 1024px) {
  .toolbar-buttons {
    margin-left: 0;
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .app-toolbar {
    height: 44px;
    padding: 0 12px;
    padding-left: max(12px, calc(var(--safe-area-inset-left) + 12px));
    padding-right: max(12px, calc(var(--safe-area-inset-right) + 12px));
  }
  
  .toolbar-buttons {
    gap: 8px;
    margin-left: 0;
  }
  
  .app-title {
    font-size: 13px;
  }
  
  :deep(.n-button-group .n-button) {
    padding: 0 8px;
  }
}

/* macOS 深色模式特定优化 */
@media (prefers-color-scheme: dark) {
  .app-toolbar {
    background: rgba(24, 24, 28, 0.95);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
  }
}
</style>