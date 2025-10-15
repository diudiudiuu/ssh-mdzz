<template>
  <div class="app-toolbar">
    <!-- 工具栏按钮 -->
    <div class="toolbar-buttons">
      <n-button-group>
        <!-- 新建会话 -->
        <n-tooltip placement="bottom">
          <template #trigger>
            <n-button size="small" @click="$emit('new-session')">
              <template #icon>
                <n-icon><AddOutline /></n-icon>
              </template>
            </n-button>
          </template>
          新建会话
        </n-tooltip>

        <!-- 刷新 -->
        <n-tooltip placement="bottom">
          <template #trigger>
            <n-button size="small" @click="$emit('refresh')">
              <template #icon>
                <n-icon><RefreshOutline /></n-icon>
              </template>
            </n-button>
          </template>
          刷新
        </n-tooltip>

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
      </n-button-group>

      <n-divider vertical />

      <!-- 工具按钮 -->
      <n-button-group>
        <!-- 文件传输 -->
        <n-tooltip placement="bottom">
          <template #trigger>
            <n-button size="small" @click="$emit('toggle-files')">
              <template #icon>
                <n-icon><FolderOutline /></n-icon>
              </template>
            </n-button>
          </template>
          文件管理
        </n-tooltip>

        <!-- 终端 -->
        <n-tooltip placement="bottom">
          <template #trigger>
            <n-button size="small" @click="$emit('toggle-terminal')">
              <template #icon>
                <n-icon><TerminalOutline /></n-icon>
              </template>
            </n-button>
          </template>
          终端
        </n-tooltip>
      </n-button-group>
    </div>

    <!-- 右侧信息 -->
    <div class="toolbar-info">
      <span class="app-title">SSH MDZZ</span>
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
      </n-space>
    </n-modal>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import {
  AddOutline,
  RefreshOutline,
  SettingsOutline,
  FolderOutline,
  TerminalOutline
} from '@vicons/ionicons5'

// 定义事件
defineEmits(['new-session', 'refresh', 'toggle-files', 'toggle-terminal'])

const message = useMessage()

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
</script>

<style scoped>
.app-toolbar {
  height: 40px;
  background: #f0f0f0;
  border-bottom: 1px solid #ddd;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  flex-shrink: 0;
}

.toolbar-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-title {
  font-size: 13px;
  font-weight: 500;
  color: #333;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

/* 按钮组样式 */
:deep(.n-button-group .n-button) {
  border-radius: 0;
  color: #333;
  background: #fff;
  border: 1px solid #ccc;
}

:deep(.n-button-group .n-button:hover) {
  background: #e6f3ff;
  border-color: #0078d4;
}

:deep(.n-button-group .n-button .n-icon) {
  color: #0078d4;
}

:deep(.n-button-group .n-button:hover .n-icon) {
  color: #106ebe;
}

:deep(.n-button-group .n-button:first-child) {
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
}

:deep(.n-button-group .n-button:last-child) {
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
}

/* 分割线样式 */
:deep(.n-divider--vertical) {
  height: 20px;
  margin: 0 8px;
  border-color: #ccc;
}

/* 工具提示样式 */
:deep(.n-tooltip) {
  font-size: 12px;
}
</style>