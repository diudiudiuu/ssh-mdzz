package main

import (
	"context"
	"fmt"
	"io"
	"net"
	"os/exec"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"ssh-mdzz/models"
	"ssh-mdzz/ssh"
	"ssh-mdzz/storage"

	"github.com/wailsapp/wails/v2/pkg/runtime"
	gossh "golang.org/x/crypto/ssh"
)

// App 应用结构
type App struct {
	ctx            context.Context
	store          *storage.Store
	sessionManager *ssh.SessionManager
}

// NewApp 创建新的 App 应用
func NewApp() *App {
	return &App{
		store:          storage.NewStore(),
		sessionManager: ssh.GetSessionManager(),
	}
}

// startup 应用启动时调用
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

// ============ 密钥管理 ============

// SetEncryptionKey 设置加密密钥
func (a *App) SetEncryptionKey(key string) error {
	fmt.Printf("SetEncryptionKey: 开始设置密钥\n")

	if err := a.store.SetUserKey(key); err != nil {
		fmt.Printf("SetEncryptionKey: 设置密钥失败: %v\n", err)
		return err
	}

	// 创建空的配置文件以标记密钥已设置
	if err := a.store.SaveConfigs(); err != nil {
		fmt.Printf("SetEncryptionKey: 创建配置文件失败: %v\n", err)
		return err
	}

	// 生成并保存会话令牌
	if err := a.store.CreateSession(); err != nil {
		fmt.Printf("SetEncryptionKey: 创建会话失败: %v\n", err)
		return err
	}

	fmt.Printf("SetEncryptionKey: 密钥设置成功\n")
	return nil
}

// VerifyEncryptionKey 验证加密密钥
func (a *App) VerifyEncryptionKey(key string) error {
	fmt.Printf("VerifyEncryptionKey: 开始验证密钥\n")

	// 尝试用该密钥加载配置
	testStore := storage.NewStore()
	if err := testStore.SetUserKey(key); err != nil {
		fmt.Printf("VerifyEncryptionKey: 设置测试密钥失败: %v\n", err)
		return err
	}

	// 如果能成功加载配置，说明密钥正确
	_, err := testStore.LoadConfigs()
	if err != nil {
		fmt.Printf("VerifyEncryptionKey: 加载配置失败: %v\n", err)
		return fmt.Errorf("密钥验证失败: %w", err)
	}

	// 验证成功，设置到主 store
	if err := a.store.SetUserKey(key); err != nil {
		fmt.Printf("VerifyEncryptionKey: 设置主密钥失败: %v\n", err)
		return err
	}

	// 更新会话令牌
	if err := a.store.CreateSession(); err != nil {
		fmt.Printf("VerifyEncryptionKey: 创建会话失败: %v\n", err)
		return err
	}

	fmt.Printf("VerifyEncryptionKey: 密钥验证成功\n")
	return nil
}

// IsKeySet 检查是否已设置密钥
func (a *App) IsKeySet() bool {
	return a.store.IsKeySet()
}

// HasConfigs 检查是否有配置文件
func (a *App) HasConfigs() bool {
	configs, err := a.store.LoadConfigs()
	return err == nil && len(configs) > 0
}

// HasValidSession 检查是否有有效的会话
func (a *App) HasValidSession() bool {
	return a.store.HasValidSession()
}

// RestoreSession 从会话恢复密钥
func (a *App) RestoreSession() error {
	fmt.Printf("RestoreSession: 尝试恢复会话\n")

	// 检查会话有效性
	if !a.store.HasValidSession() {
		fmt.Printf("RestoreSession: 没有有效会话\n")
		return fmt.Errorf("没有有效会话")
	}

	fmt.Printf("RestoreSession: 会话验证成功\n")
	return nil
}

// CanAutoRestore 检查是否可以自动恢复会话（不需要用户输入密钥）
func (a *App) CanAutoRestore() bool {
	fmt.Printf("CanAutoRestore: 检查是否可以自动恢复\n")

	// 检查是否有有效会话
	if !a.store.HasValidSession() {
		fmt.Printf("CanAutoRestore: 没有有效会话\n")
		return false
	}

	// 检查会话是否支持自动恢复（例如，会话创建时间是否在合理范围内）
	canRestore := a.store.CanAutoRestoreFromSession()
	fmt.Printf("CanAutoRestore: 结果 = %v\n", canRestore)

	return canRestore
}

// AutoRestoreSession 自动恢复会话（不需要用户输入密钥）
func (a *App) AutoRestoreSession() error {
	fmt.Printf("AutoRestoreSession: 开始自动恢复会话\n")

	// 检查是否可以自动恢复
	if !a.CanAutoRestore() {
		return fmt.Errorf("无法自动恢复会话")
	}

	// 从会话中恢复密钥
	if err := a.store.AutoRestoreFromSession(); err != nil {
		fmt.Printf("AutoRestoreSession: 自动恢复失败: %v\n", err)
		return fmt.Errorf("自动恢复失败: %w", err)
	}

	fmt.Printf("AutoRestoreSession: 自动恢复成功\n")
	return nil
}

// ClearSession 清除会话
func (a *App) ClearSession() error {
	return a.store.ClearSession()
}

// VerifyKeyWithSession 使用会话验证密钥
func (a *App) VerifyKeyWithSession(key string) error {
	fmt.Printf("VerifyKeyWithSession: 开始验证密钥和会话\n")

	// 先验证会话中的密钥哈希
	if err := a.store.ValidateKeyWithSession(key); err != nil {
		fmt.Printf("VerifyKeyWithSession: 会话验证失败: %v\n", err)
		return err
	}

	// 设置密钥到 store
	if err := a.store.SetUserKey(key); err != nil {
		fmt.Printf("VerifyKeyWithSession: 设置密钥失败: %v\n", err)
		return err
	}

	fmt.Printf("VerifyKeyWithSession: 验证成功\n")
	return nil
}

// ============ 配置管理 ============

// GetConfigs 获取所有 SSH 配置
func (a *App) GetConfigs() ([]models.SSHConfig, error) {
	return a.store.LoadConfigs()
}

// GetConfig 获取指定配置
func (a *App) GetConfig(id string) (*models.SSHConfig, error) {
	return a.store.GetConfig(id)
}

// SaveConfig 保存 SSH 配置
func (a *App) SaveConfig(config models.SSHConfig) error {
	fmt.Printf("SaveConfig: 开始保存配置 %s (ID: %s)\n", config.Name, config.ID)

	// 设置时间戳
	if config.CreatedAt.IsZero() {
		config.CreatedAt = time.Now()
	}
	config.UpdatedAt = time.Now()

	// 检查是否是更新
	if existingConfig, err := a.store.GetConfig(config.ID); err == nil {
		// 是更新操作
		fmt.Printf("SaveConfig: 更新现有配置\n")
		config.CreatedAt = existingConfig.CreatedAt
		return a.store.UpdateConfig(config)
	}

	// 是新增操作
	fmt.Printf("SaveConfig: 添加新配置\n")
	return a.store.AddConfig(config)
}

// DeleteConfig 删除 SSH 配置
func (a *App) DeleteConfig(id string) error {
	// 先关闭相关会话
	if err := a.sessionManager.CloseSession(id); err != nil {
		// 忽略会话不存在的错误
		fmt.Printf("关闭会话失败: %v\n", err)
	}

	return a.store.DeleteConfig(id)
}

// ============ 会话管理 ============

// CreateSession 创建 SSH 会话
func (a *App) CreateSession(configID string) error {
	config, err := a.store.GetConfig(configID)
	if err != nil {
		return err
	}

	_, err = a.sessionManager.CreateSession(config)
	return err
}

// CloseSession 关闭 SSH 会话
func (a *App) CloseSession(configID string) error {
	return a.sessionManager.CloseSession(configID)
}

// GetActiveSessions 获取所有活动会话
func (a *App) GetActiveSessions() []models.SSHSession {
	return a.sessionManager.GetActiveSessions()
}

// IsSessionActive 检查会话是否活跃
func (a *App) IsSessionActive(configID string) bool {
	return a.sessionManager.IsSessionActive(configID)
}

// GetSessionUptime 获取会话运行时长
func (a *App) GetSessionUptime(configID string) (string, error) {
	duration, err := a.sessionManager.GetSessionUptime(configID)
	if err != nil {
		return "", err
	}
	return duration.String(), nil
}

// ============ 终端管理 ============

// OpenTerminal 在系统终端中打开 SSH 连接
func (a *App) OpenTerminal(configID string) error {
	config, err := a.store.GetConfig(configID)
	if err != nil {
		return err
	}

	var sshCmd string
	if config.KeyPath != "" {
		sshCmd = fmt.Sprintf("ssh -i %s %s@%s -p %s",
			config.KeyPath, config.Username, config.Host, config.Port)
	} else {
		sshCmd = fmt.Sprintf("ssh %s@%s -p %s",
			config.Username, config.Host, config.Port)
	}

	// macOS: 使用 AppleScript 打开 Terminal.app
	cmd := exec.Command("osascript", "-e",
		fmt.Sprintf(`tell application "Terminal" to do script "%s"`, sshCmd))

	return cmd.Start()
}

// ExecuteCommand 执行 SSH 命令
func (a *App) ExecuteCommand(configID, command string) (string, error) {
	session, err := a.sessionManager.GetSession(configID)
	if err != nil {
		return "", err
	}

	return ssh.ExecuteCommand(session.SSHClient, command)
}

// ExecuteSSHCommand 执行SSH命令并返回详细信息（用于Web终端）
func (a *App) ExecuteSSHCommand(configID, command string) (*models.CommandResult, error) {
	session, err := a.sessionManager.GetSession(configID)
	if err != nil {
		return nil, err
	}

	// 执行命令
	output, err := ssh.ExecuteCommand(session.SSHClient, command)
	if err != nil {
		return &models.CommandResult{
			Success: false,
			Output:  "",
			Error:   err.Error(),
		}, nil
	}

	// 获取当前路径
	currentPath, _ := ssh.ExecuteCommand(session.SSHClient, "pwd")
	currentPath = strings.TrimSpace(currentPath)

	// 获取用户名和主机名
	username, _ := ssh.ExecuteCommand(session.SSHClient, "whoami")
	username = strings.TrimSpace(username)

	hostname, _ := ssh.ExecuteCommand(session.SSHClient, "hostname")
	hostname = strings.TrimSpace(hostname)

	return &models.CommandResult{
		Success:     true,
		Output:      output,
		Error:       "",
		CurrentPath: currentPath,
		Username:    username,
		Hostname:    hostname,
	}, nil
}

// ConnectSSH 建立SSH连接（用于Web终端）
func (a *App) ConnectSSH(configID string) (*models.ConnectionResult, error) {
	config, err := a.store.GetConfig(configID)
	if err != nil {
		return nil, err
	}

	// 创建或获取会话
	session, err := a.sessionManager.GetOrCreateSession(config)
	if err != nil {
		return &models.ConnectionResult{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	// 获取连接信息
	currentPath, _ := ssh.ExecuteCommand(session.SSHClient, "pwd")
	currentPath = strings.TrimSpace(currentPath)

	username, _ := ssh.ExecuteCommand(session.SSHClient, "whoami")
	username = strings.TrimSpace(username)

	hostname, _ := ssh.ExecuteCommand(session.SSHClient, "hostname")
	hostname = strings.TrimSpace(hostname)

	// 获取欢迎信息
	welcomeMsg := fmt.Sprintf("欢迎来到 %s@%s", username, hostname)

	return &models.ConnectionResult{
		Success: true,
		Error:   "",
		ConnectionInfo: &models.ConnectionInfo{
			Username:    username,
			Hostname:    hostname,
			CurrentPath: currentPath,
		},
		WelcomeMessage: welcomeMsg,
	}, nil
}

// DisconnectSSH 断开SSH连接（用于Web终端）
func (a *App) DisconnectSSH(configID string) error {
	return a.sessionManager.CloseSession(configID)
}

// GetRemoteFiles 获取远程文件列表（用于Tab补全）
func (a *App) GetRemoteFiles(configID, path string) (*models.FileListResult, error) {
	session, err := a.sessionManager.GetSession(configID)
	if err != nil {
		return &models.FileListResult{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	// 使用ls命令获取文件列表
	if path == "" || path == "." {
		path = "."
	}

	// 执行ls -la命令获取详细信息
	output, err := ssh.ExecuteCommand(session.SSHClient, fmt.Sprintf("ls -la %s", path))
	if err != nil {
		return &models.FileListResult{
			Success: false,
			Error:   err.Error(),
		}, nil
	}

	// 解析ls输出
	files := parseLSOutput(output)

	return &models.FileListResult{
		Success: true,
		Files:   files,
		Error:   "",
	}, nil
}

// parseLSOutput 解析ls命令的输出
func parseLSOutput(output string) []models.RemoteFile {
	var files []models.RemoteFile
	lines := strings.Split(output, "\n")

	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "total") {
			continue
		}

		// 解析ls -la的输出格式
		parts := strings.Fields(line)
		if len(parts) < 9 {
			continue
		}

		permissions := parts[0]
		name := strings.Join(parts[8:], " ")

		// 跳过当前目录和父目录
		if name == "." || name == ".." {
			continue
		}

		fileType := "file"
		if strings.HasPrefix(permissions, "d") {
			fileType = "directory"
			name += "/"
		}

		files = append(files, models.RemoteFile{
			Name:        name,
			Type:        fileType,
			Permissions: permissions,
			Size:        parts[4],
		})
	}

	return files
}

// ExecuteSudoCommand 执行 sudo 命令
func (a *App) ExecuteSudoCommand(configID, command string) (string, error) {
	config, err := a.store.GetConfig(configID)
	if err != nil {
		return "", err
	}

	session, err := a.sessionManager.GetSession(configID)
	if err != nil {
		return "", err
	}

	return ssh.ExecuteSudoCommand(session.SSHClient, config.Password, command)
}

// ============ 文件操作 ============

// ListRemoteFiles 列出远程目录文件
func (a *App) ListRemoteFiles(configID, remotePath string) ([]models.FileInfo, error) {
	session, err := a.sessionManager.GetOrCreateSession(a.mustGetConfig(configID))
	if err != nil {
		return nil, err
	}

	return session.ListFiles(remotePath)
}

// GetRemoteHome 获取远程用户主目录
func (a *App) GetRemoteHome(configID string) (string, error) {
	session, err := a.sessionManager.GetSession(configID)
	if err != nil {
		// 如果会话不存在，创建临时会话
		config, err := a.store.GetConfig(configID)
		if err != nil {
			return "", err
		}
		session, err = a.sessionManager.CreateSession(config)
		if err != nil {
			return "", err
		}
	}

	output, err := ssh.ExecuteCommand(session.SSHClient, "pwd")
	if err != nil {
		return "", err
	}

	// 去除换行符
	return output[:len(output)-1], nil
}

// CreateRemoteDirectory 创建远程目录
func (a *App) CreateRemoteDirectory(configID, remotePath string, useSudo bool) error {
	session, err := a.sessionManager.GetOrCreateSession(a.mustGetConfig(configID))
	if err != nil {
		return err
	}

	return session.CreateDirectory(remotePath, useSudo)
}

// DeleteRemoteFile 删除远程文件
func (a *App) DeleteRemoteFile(configID, remotePath string, useSudo bool) error {
	session, err := a.sessionManager.GetOrCreateSession(a.mustGetConfig(configID))
	if err != nil {
		return err
	}

	return session.DeleteFile(remotePath, useSudo)
}

// DeleteRemoteDirectory 删除远程目录
func (a *App) DeleteRemoteDirectory(configID, remotePath string, useSudo bool) error {
	session, err := a.sessionManager.GetOrCreateSession(a.mustGetConfig(configID))
	if err != nil {
		return err
	}

	return session.DeleteDirectory(remotePath, useSudo)
}

// ============ 文件传输 ============

// UploadFile 上传文件
func (a *App) UploadFile(configID, localPath, remotePath string, useSudo bool) error {
	session, err := a.sessionManager.GetOrCreateSession(a.mustGetConfig(configID))
	if err != nil {
		return err
	}

	return session.UploadFile(localPath, remotePath, useSudo, func(transferred, total int64) {
		progress := models.TransferProgress{
			FileName:    filepath.Base(localPath),
			Transferred: transferred,
			Total:       total,
			Percentage:  float64(transferred) / float64(total) * 100,
		}
		runtime.EventsEmit(a.ctx, "upload-progress", progress)
	})
}

// DownloadFile 下载文件
func (a *App) DownloadFile(configID, remotePath, localPath string, useSudo bool) error {
	session, err := a.sessionManager.GetOrCreateSession(a.mustGetConfig(configID))
	if err != nil {
		return err
	}

	return session.DownloadFile(remotePath, localPath, useSudo, func(transferred, total int64) {
		progress := models.TransferProgress{
			FileName:    filepath.Base(remotePath),
			Transferred: transferred,
			Total:       total,
			Percentage:  float64(transferred) / float64(total) * 100,
		}
		runtime.EventsEmit(a.ctx, "download-progress", progress)
	})
}

// BatchUploadFiles 批量上传文件
func (a *App) BatchUploadFiles(configID string, files []map[string]string, useSudo bool) error {
	for _, file := range files {
		localPath := file["local"]
		remotePath := file["remote"]

		if err := a.UploadFile(configID, localPath, remotePath, useSudo); err != nil {
			runtime.EventsEmit(a.ctx, "batch-upload-error", map[string]string{
				"file":  localPath,
				"error": err.Error(),
			})
			continue
		}

		runtime.EventsEmit(a.ctx, "batch-upload-complete", localPath)
	}

	runtime.EventsEmit(a.ctx, "batch-upload-finished", nil)
	return nil
}

// BatchDownloadFiles 批量下载文件
func (a *App) BatchDownloadFiles(configID string, files []map[string]string, useSudo bool) error {
	for _, file := range files {
		remotePath := file["remote"]
		localPath := file["local"]

		if err := a.DownloadFile(configID, remotePath, localPath, useSudo); err != nil {
			runtime.EventsEmit(a.ctx, "batch-download-error", map[string]string{
				"file":  remotePath,
				"error": err.Error(),
			})
			continue
		}

		runtime.EventsEmit(a.ctx, "batch-download-complete", remotePath)
	}

	runtime.EventsEmit(a.ctx, "batch-download-finished", nil)
	return nil
}

// ============ 连接测试 ============

// CheckConnection 检查连接状态（TCP 端口测试）
func (a *App) CheckConnection(configID string) (models.ConnectionStatus, error) {
	config, err := a.store.GetConfig(configID)
	if err != nil {
		return models.ConnectionStatus{}, err
	}

	start := time.Now()
	var addr string
	if net.ParseIP(config.Host) != nil && net.ParseIP(config.Host).To4() == nil {
		// IPv6 address, wrap in brackets
		addr = fmt.Sprintf("[%s]:%s", config.Host, config.Port)
	} else {
		addr = fmt.Sprintf("%s:%s", config.Host, config.Port)
	}

	conn, err := net.DialTimeout("tcp", addr, 5*time.Second)
	if err != nil {
		return models.ConnectionStatus{
			IsConnected: false,
			Latency:     0,
			Error:       err.Error(),
		}, nil
	}
	defer conn.Close()

	latency := time.Since(start).Milliseconds()

	return models.ConnectionStatus{
		IsConnected: true,
		Latency:     latency,
		Error:       "",
	}, nil
}

// TestSSHConnection 测试 SSH 连接（完整认证测试）
func (a *App) TestSSHConnection(configID string) error {
	config, err := a.store.GetConfig(configID)
	if err != nil {
		return err
	}

	client, err := ssh.CreateSSHClient(config)
	if err != nil {
		return err
	}
	defer client.Close()

	// 执行一个简单命令测试
	session, err := client.NewSession()
	if err != nil {
		return err
	}
	defer session.Close()

	return session.Run("echo 'test'")
}

// ============ 文件选择对话框 ============

// SelectFile 选择单个文件
func (a *App) SelectFile() (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择文件",
	})
}

// SelectMultipleFiles 选择多个文件
func (a *App) SelectMultipleFiles() ([]string, error) {
	return runtime.OpenMultipleFilesDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择文件",
	})
}

// SelectDirectory 选择目录
func (a *App) SelectDirectory() (string, error) {
	return runtime.OpenDirectoryDialog(a.ctx, runtime.OpenDialogOptions{
		Title: "选择目录",
	})
}

// SaveFileDialog 保存文件对话框
func (a *App) SaveFileDialog(defaultFilename string) (string, error) {
	return runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "保存文件",
		DefaultFilename: defaultFilename,
	})
}

// ============ 辅助方法 ============

// mustGetConfig 获取配置（如果失败则 panic）
func (a *App) mustGetConfig(configID string) *models.SSHConfig {
	config, err := a.store.GetConfig(configID)
	if err != nil {
		panic(fmt.Sprintf("获取配置失败: %v", err))
	}
	return config
}

// GetTransferMode 获取传输模式
func (a *App) GetTransferMode(configID string) (string, error) {
	session, err := a.sessionManager.GetSession(configID)
	if err != nil {
		// 如果会话不存在，从配置中获取
		config, err := a.store.GetConfig(configID)
		if err != nil {
			return "", err
		}
		return config.TransferMode, nil
	}

	return session.GetTransferMode(), nil
}

// ============ 终端管理 ============

// terminalSessions 存储活动的终端会话
var terminalSessions = make(map[string]*TerminalSession)
var terminalSessionsMutex sync.RWMutex

// TerminalSession 终端会话结构
type TerminalSession struct {
	SSHSession *gossh.Session
	Stdin      io.WriteCloser
	ConfigID   string
}

// SendTerminalInput 发送终端输入
func (a *App) SendTerminalInput(configID, input string) error {
	terminalSessionsMutex.RLock()
	terminalSession, exists := terminalSessions[configID]
	terminalSessionsMutex.RUnlock()

	if !exists {
		fmt.Printf("SendTerminalInput: 终端会话不存在，配置ID: %s\n", configID)
		return fmt.Errorf("终端会话不存在")
	}

	// 记录输入（但不记录敏感信息）
	if len(input) < 50 {
		fmt.Printf("SendTerminalInput: 发送输入 [%d bytes]: %q\n", len(input), input)
	} else {
		fmt.Printf("SendTerminalInput: 发送输入 [%d bytes]\n", len(input))
	}

	_, err := terminalSession.Stdin.Write([]byte(input))
	if err != nil {
		fmt.Printf("SendTerminalInput: 写入失败: %v\n", err)
	}
	return err
}

// CreateInteractiveTerminal 创建交互式终端会话
func (a *App) CreateInteractiveTerminal(configID string) error {
	fmt.Printf("CreateInteractiveTerminal: 开始创建交互式终端，配置ID: %s\n", configID)

	// 检查是否已经有交互式会话
	terminalSessionsMutex.RLock()
	if _, exists := terminalSessions[configID]; exists {
		terminalSessionsMutex.RUnlock()
		fmt.Printf("CreateInteractiveTerminal: 交互式会话已存在，先关闭旧会话\n")
		a.CloseTerminalSession(configID)
	} else {
		terminalSessionsMutex.RUnlock()
	}

	session, err := a.sessionManager.GetSession(configID)
	if err != nil {
		fmt.Printf("CreateInteractiveTerminal: 获取会话失败: %v\n", err)
		return err
	}

	// 测试SSH连接是否正常
	testSession, err := session.SSHClient.NewSession()
	if err != nil {
		fmt.Printf("CreateInteractiveTerminal: SSH连接测试失败: %v\n", err)
		return fmt.Errorf("SSH连接不可用: %w", err)
	}

	// 运行一个简单命令测试连接
	if err := testSession.Run("echo 'connection test'"); err != nil {
		testSession.Close()
		fmt.Printf("CreateInteractiveTerminal: SSH连接功能测试失败: %v\n", err)
		return fmt.Errorf("SSH连接功能异常: %w", err)
	}
	testSession.Close()
	fmt.Printf("CreateInteractiveTerminal: SSH连接测试通过\n")

	// 创建交互式会话
	sshSession, err := session.SSHClient.NewSession()
	if err != nil {
		fmt.Printf("CreateInteractiveTerminal: 创建SSH会话失败: %v\n", err)
		return err
	}

	// 设置终端模式 - 为交互式程序优化
	modes := gossh.TerminalModes{
		gossh.ECHO:          1,     // 启用回显
		gossh.TTY_OP_ISPEED: 14400, // 输入速度
		gossh.TTY_OP_OSPEED: 14400, // 输出速度
		gossh.ICRNL:         1,     // 将回车转换为换行
		gossh.OPOST:         1,     // 启用输出处理
		gossh.ONLCR:         1,     // 将换行转换为回车换行
		gossh.ICANON:        0,     // 禁用规范模式 - 这对交互式程序很重要
		gossh.ISIG:          1,     // 启用信号处理
		gossh.IEXTEN:        1,     // 启用扩展处理
		gossh.ECHOE:         1,     // 启用擦除字符回显
		gossh.ECHOK:         1,     // 启用杀死字符回显
		gossh.ECHONL:        0,     // 禁用换行回显
	}

	// 设置环境变量 - 这对交互式程序很重要
	if err := sshSession.Setenv("TERM", "xterm-256color"); err != nil {
		fmt.Printf("CreateInteractiveTerminal: 设置TERM环境变量失败: %v\n", err)
		// 不要因为这个失败就退出，继续尝试
	}

	if err := sshSession.Setenv("LANG", "en_US.UTF-8"); err != nil {
		fmt.Printf("CreateInteractiveTerminal: 设置LANG环境变量失败: %v\n", err)
		// 不要因为这个失败就退出，继续尝试
	}

	// 请求伪终端 - 使用更大的默认尺寸
	if err := sshSession.RequestPty("xterm-256color", 120, 30, modes); err != nil {
		fmt.Printf("CreateInteractiveTerminal: 请求伪终端失败: %v\n", err)
		sshSession.Close()
		return err
	}

	fmt.Printf("CreateInteractiveTerminal: 伪终端创建成功\n")

	// 获取输入输出管道
	stdin, err := sshSession.StdinPipe()
	if err != nil {
		sshSession.Close()
		return err
	}

	stdout, err := sshSession.StdoutPipe()
	if err != nil {
		sshSession.Close()
		return err
	}

	stderr, err := sshSession.StderrPipe()
	if err != nil {
		sshSession.Close()
		return err
	}

	// 启动 shell
	if err := sshSession.Shell(); err != nil {
		fmt.Printf("CreateInteractiveTerminal: 启动Shell失败: %v\n", err)
		sshSession.Close()
		return err
	}

	fmt.Printf("CreateInteractiveTerminal: Shell启动成功\n")

	// 启动输出读取协程
	go func() {
		defer sshSession.Close()
		defer stdin.Close()

		// 读取标准输出 - 使用更小的缓冲区以获得更好的实时性
		go func() {
			defer fmt.Printf("CreateInteractiveTerminal: stdout读取协程结束\n")
			buf := make([]byte, 1024) // 适中的缓冲区大小
			for {
				n, err := stdout.Read(buf)
				if err != nil {
					if err != io.EOF {
						fmt.Printf("CreateInteractiveTerminal: 读取stdout失败: %v\n", err)
					}
					break
				}
				if n > 0 {
					output := string(buf[:n])
					// 立即发送输出，保持原始格式
					runtime.EventsEmit(a.ctx, "terminal-output", map[string]interface{}{
						"configId": configID,
						"output":   output,
						"type":     "stdout",
					})
				}
			}
		}()

		// 读取标准错误
		go func() {
			defer fmt.Printf("CreateInteractiveTerminal: stderr读取协程结束\n")
			buf := make([]byte, 1024)
			for {
				n, err := stderr.Read(buf)
				if err != nil {
					if err != io.EOF {
						fmt.Printf("CreateInteractiveTerminal: 读取stderr失败: %v\n", err)
					}
					break
				}
				if n > 0 {
					output := string(buf[:n])
					runtime.EventsEmit(a.ctx, "terminal-output", map[string]interface{}{
						"configId": configID,
						"output":   output,
						"type":     "stderr",
					})
				}
			}
		}()

		// 存储终端会话以供后续输入使用
		terminalSessionsMutex.Lock()
		terminalSessions[configID] = &TerminalSession{
			SSHSession: sshSession,
			Stdin:      stdin,
			ConfigID:   configID,
		}
		terminalSessionsMutex.Unlock()

		// 会话结束时清理
		defer func() {
			terminalSessionsMutex.Lock()
			delete(terminalSessions, configID)
			terminalSessionsMutex.Unlock()
		}()

		// 等待会话结束
		sshSession.Wait()

		// 发送连接状态变化事件
		runtime.EventsEmit(a.ctx, "terminal-status", map[string]interface{}{
			"configId":  configID,
			"connected": false,
		})
	}()

	// 发送连接成功事件
	runtime.EventsEmit(a.ctx, "terminal-status", map[string]interface{}{
		"configId":  configID,
		"connected": true,
	})

	return nil
}

// CloseTerminalSession 关闭终端会话
func (a *App) CloseTerminalSession(configID string) error {
	terminalSessionsMutex.Lock()
	defer terminalSessionsMutex.Unlock()

	terminalSession, exists := terminalSessions[configID]
	if !exists {
		return fmt.Errorf("终端会话不存在")
	}

	// 关闭 stdin
	if terminalSession.Stdin != nil {
		terminalSession.Stdin.Close()
	}

	// 关闭 SSH 会话
	if terminalSession.SSHSession != nil {
		terminalSession.SSHSession.Close()
	}

	// 从映射中删除
	delete(terminalSessions, configID)

	return nil
}

// ResizeTerminal 调整终端大小
func (a *App) ResizeTerminal(configID string, cols, rows int) error {
	terminalSessionsMutex.RLock()
	terminalSession, exists := terminalSessions[configID]
	terminalSessionsMutex.RUnlock()

	if !exists {
		return fmt.Errorf("终端会话不存在")
	}

	// 发送窗口大小变化信号
	return terminalSession.SSHSession.WindowChange(rows, cols)
}

// Shutdown 应用关闭时清理资源
func (a *App) Shutdown() {
	// 关闭所有会话
	if err := a.sessionManager.CloseAllSessions(); err != nil {
		fmt.Printf("关闭会话失败: %v\n", err)
	}
}
