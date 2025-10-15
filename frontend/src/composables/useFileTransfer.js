import { ref } from 'vue'
import { useMessage } from 'naive-ui'
import { EventsOn } from '@/../wailsjs/runtime/runtime'
import {
  ListRemoteFiles,
  CreateRemoteDirectory,
  DeleteRemoteFile,
  DeleteRemoteDirectory,
  UploadFile,
  DownloadFile,
  BatchUploadFiles,
  BatchDownloadFiles,
  SelectFile,
  SelectMultipleFiles,
  SelectDirectory,
  SaveFileDialog
} from '@/../wailsjs/go/main/App'

export function useFileTransfer() {
  const message = useMessage()
  
  const loading = ref(false)
  const uploading = ref(false)
  const downloading = ref(false)
  const uploadProgress = ref([])
  const downloadProgress = ref([])

  /**
   * 列出远程文件
   */
  async function listFiles(configId, remotePath) {
    loading.value = true

    try {
      const files = await ListRemoteFiles(configId, remotePath)
      return files || []
    } catch (error) {
      message.error(`列出文件失败: ${error.message}`)
      console.error('列出文件失败:', error)
      return []
    } finally {
      loading.value = false
    }
  }

  /**
   * 创建远程目录
   */
  async function createDirectory(configId, remotePath, useSudo = false) {
    try {
      await CreateRemoteDirectory(configId, remotePath, useSudo)
      return true
    } catch (error) {
      console.error('创建目录失败:', error)
      throw error
    }
  }

  /**
   * 删除远程文件
   */
  async function deleteFile(configId, remotePath, useSudo = false) {
    try {
      await DeleteRemoteFile(configId, remotePath, useSudo)
      return true
    } catch (error) {
      console.error('删除文件失败:', error)
      throw error
    }
  }

  /**
   * 删除远程目录
   */
  async function deleteDirectory(configId, remotePath, useSudo = false) {
    try {
      await DeleteRemoteDirectory(configId, remotePath, useSudo)
      return true
    } catch (error) {
      console.error('删除目录失败:', error)
      throw error
    }
  }

  /**
   * 上传文件
   */
  async function uploadFile(configId, localPath, remotePath, useSudo = false) {
    uploading.value = true

    try {
      await UploadFile(configId, localPath, remotePath, useSudo)
      return true
    } catch (error) {
      console.error('上传失败:', error)
      throw error
    } finally {
      uploading.value = false
    }
  }

  /**
   * 上传拖拽的文件
   */
  async function uploadDraggedFiles(configId, files, targetPath, useSudo = false) {
    uploading.value = true
    const results = []

    try {
      for (const file of files) {
        try {
          const remotePath = targetPath === '/' 
            ? `/${file.name}` 
            : `${targetPath}/${file.name}`
          
          await UploadFile(configId, file.path, remotePath, useSudo)
          results.push({ file: file.name, success: true })
        } catch (error) {
          results.push({ file: file.name, success: false, error: error.message })
        }
      }
      
      return results
    } finally {
      uploading.value = false
    }
  }

  /**
   * 下载文件 - 自动选择保存位置
   */
  async function downloadFile(configId, remotePath, useSudo = false) {
    downloading.value = true

    try {
      // 自动选择保存位置
      const fileName = remotePath.split('/').pop()
      const localPath = await saveFile(fileName)
      
      if (!localPath) {
        return false // 用户取消了保存
      }
      
      await DownloadFile(configId, remotePath, localPath, useSudo)
      return true
    } catch (error) {
      message.error(`下载失败: ${error.message}`)
      console.error('下载失败:', error)
      return false
    } finally {
      downloading.value = false
    }
  }

  /**
   * 批量上传文件
   */
  async function batchUpload(configId, files, useSudo = false) {
    uploading.value = true
    uploadProgress.value = []

    try {
      await BatchUploadFiles(configId, files, useSudo)
      return true
    } catch (error) {
      message.error(`批量上传失败: ${error.message}`)
      console.error('批量上传失败:', error)
      return false
    } finally {
      uploading.value = false
    }
  }

  /**
   * 批量下载文件
   */
  async function batchDownload(configId, files, useSudo = false) {
    downloading.value = true
    downloadProgress.value = []

    try {
      await BatchDownloadFiles(configId, files, useSudo)
      return true
    } catch (error) {
      message.error(`批量下载失败: ${error.message}`)
      console.error('批量下载失败:', error)
      return false
    } finally {
      downloading.value = false
    }
  }

  /**
   * 选择本地文件
   */
  async function selectLocalFile() {
    try {
      return await SelectFile()
    } catch (error) {
      console.error('选择文件失败:', error)
      return null
    }
  }

  /**
   * 选择多个本地文件
   */
  async function selectLocalFiles() {
    try {
      return await SelectMultipleFiles()
    } catch (error) {
      console.error('选择文件失败:', error)
      return []
    }
  }

  /**
   * 选择本地目录
   */
  async function selectLocalDirectory() {
    try {
      return await SelectDirectory()
    } catch (error) {
      console.error('选择目录失败:', error)
      return null
    }
  }

  /**
   * 保存文件对话框
   */
  async function saveFile(defaultFilename) {
    try {
      return await SaveFileDialog(defaultFilename)
    } catch (error) {
      console.error('保存文件失败:', error)
      return null
    }
  }

  /**
   * 监听上传进度
   */
  function listenUploadProgress() {
    EventsOn('upload-progress', (progress) => {
      const index = uploadProgress.value.findIndex(p => p.fileName === progress.fileName)
      if (index >= 0) {
        uploadProgress.value[index] = progress
      } else {
        uploadProgress.value.push(progress)
      }
    })

    EventsOn('batch-upload-complete', (file) => {
      console.log('文件上传完成:', file)
    })

    EventsOn('batch-upload-error', (data) => {
      message.error(`${data.file} 上传失败: ${data.error}`)
    })

    EventsOn('batch-upload-finished', () => {
      message.success('批量上传完成')
      uploadProgress.value = []
      uploading.value = false
    })
  }

  /**
   * 监听下载进度
   */
  function listenDownloadProgress() {
    EventsOn('download-progress', (progress) => {
      const index = downloadProgress.value.findIndex(p => p.fileName === progress.fileName)
      if (index >= 0) {
        downloadProgress.value[index] = progress
      } else {
        downloadProgress.value.push(progress)
      }
    })

    EventsOn('batch-download-complete', (file) => {
      console.log('文件下载完成:', file)
    })

    EventsOn('batch-download-error', (data) => {
      message.error(`${data.file} 下载失败: ${data.error}`)
    })

    EventsOn('batch-download-finished', () => {
      message.success('批量下载完成')
      downloadProgress.value = []
      downloading.value = false
    })
  }

  // 初始化时监听进度事件
  listenUploadProgress()
  listenDownloadProgress()

  return {
    loading,
    uploading,
    downloading,
    uploadProgress,
    downloadProgress,
    listFiles,
    createDirectory,
    deleteFile,
    deleteDirectory,
    uploadFile,
    downloadFile,
    batchUpload,
    batchDownload,
    selectLocalFile,
    selectLocalFiles,
    selectLocalDirectory,
    saveFile
  }
}