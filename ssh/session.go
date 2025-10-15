package ssh

import (
	"fmt"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"ssh-mdzz/models"

	"golang.org/x/crypto/ssh"
)

// SessionManager 会话管理器
type SessionManager struct {
	sessions map[string]*Session
	mu       sync.RWMutex
}

// Session SSH 会话
type Session struct {
	ID         string
	Config     *models.SSHConfig
	SSHClient  *ssh.Client
	SFTPClient *SFTPClient
	SCPClient  *SCPClient
	CreatedAt  time.Time
	IsActive   bool
}

var globalSessionManager = &SessionManager{
	sessions: make(map[string]*Session),
}

// GetSessionManager 获取全局会话管理器
func GetSessionManager() *SessionManager {
	return globalSessionManager
}

// CreateSession 创建新会话
func (sm *SessionManager) CreateSession(config *models.SSHConfig) (*Session, error) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// 检查是否已存在
	if session, exists := sm.sessions[config.ID]; exists && session.IsActive {
		return session, nil
	}

	// 创建 SSH 客户端
	sshClient, err := CreateSSHClient(config)
	if err != nil {
		return nil, fmt.Errorf("创建 SSH 客户端失败: %w", err)
	}

	session := &Session{
		ID:        config.ID,
		Config:    config,
		SSHClient: sshClient,
		CreatedAt: time.Now(),
		IsActive:  true,
	}

	// 根据传输模式创建对应客户端
	if config.TransferMode == "scp" {
		// 创建 SCP 客户端
		scpClient, err := NewSCPClient(config)
		if err != nil {
			sshClient.Close()
			return nil, fmt.Errorf("创建 SCP 客户端失败: %w", err)
		}
		session.SCPClient = scpClient
	} else {
		// 默认使用 SFTP
		sftpClient, err := NewSFTPClient(config)
		if err != nil {
			sshClient.Close()
			return nil, fmt.Errorf("创建 SFTP 客户端失败: %w", err)
		}
		session.SFTPClient = sftpClient
	}

	sm.sessions[config.ID] = session
	return session, nil
}

// GetSession 获取会话
func (sm *SessionManager) GetSession(configID string) (*Session, error) {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	session, exists := sm.sessions[configID]
	if !exists || !session.IsActive {
		return nil, fmt.Errorf("会话不存在或已关闭")
	}

	return session, nil
}

// GetOrCreateSession 获取或创建会话
func (sm *SessionManager) GetOrCreateSession(config *models.SSHConfig) (*Session, error) {
	// 先尝试获取
	session, err := sm.GetSession(config.ID)
	if err == nil {
		return session, nil
	}

	// 不存在则创建
	return sm.CreateSession(config)
}

// CloseSession 关闭会话
func (sm *SessionManager) CloseSession(configID string) error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	session, exists := sm.sessions[configID]
	if !exists {
		return fmt.Errorf("会话不存在")
	}

	// 关闭客户端
	if session.SFTPClient != nil {
		if err := session.SFTPClient.Close(); err != nil {
			// 记录错误但继续关闭其他资源
			fmt.Printf("关闭 SFTP 客户端失败: %v\n", err)
		}
	}

	if session.SCPClient != nil {
		if err := session.SCPClient.Close(); err != nil {
			fmt.Printf("关闭 SCP 客户端失败: %v\n", err)
		}
	}

	if session.SSHClient != nil {
		if err := session.SSHClient.Close(); err != nil {
			fmt.Printf("关闭 SSH 客户端失败: %v\n", err)
		}
	}

	session.IsActive = false
	delete(sm.sessions, configID)

	return nil
}

// CloseAllSessions 关闭所有会话
func (sm *SessionManager) CloseAllSessions() error {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	var lastErr error
	for configID := range sm.sessions {
		if err := sm.CloseSession(configID); err != nil {
			lastErr = err
		}
	}

	return lastErr
}

// GetActiveSessions 获取所有活动会话
func (sm *SessionManager) GetActiveSessions() []models.SSHSession {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	var sessions []models.SSHSession
	for _, session := range sm.sessions {
		if session.IsActive {
			sessions = append(sessions, models.SSHSession{
				ID:          session.ID,
				ConfigID:    session.Config.ID,
				ConfigName:  session.Config.Name,
				Host:        session.Config.Host,
				ConnectedAt: session.CreatedAt,
				IsActive:    session.IsActive,
			})
		}
	}

	return sessions
}

// GetSessionCount 获取活动会话数量
func (sm *SessionManager) GetSessionCount() int {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	count := 0
	for _, session := range sm.sessions {
		if session.IsActive {
			count++
		}
	}
	return count
}

// IsSessionActive 检查会话是否活跃
func (sm *SessionManager) IsSessionActive(configID string) bool {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	session, exists := sm.sessions[configID]
	return exists && session.IsActive
}

// KeepAlive 保持会话活跃（发送心跳）
func (sm *SessionManager) KeepAlive(configID string) error {
	session, err := sm.GetSession(configID)
	if err != nil {
		return err
	}

	// 发送一个简单的命令作为心跳
	_, err = ExecuteCommand(session.SSHClient, "echo 'keepalive'")
	return err
}

// StartKeepAliveRoutine 启动会话保活协程
func (sm *SessionManager) StartKeepAliveRoutine(configID string, interval time.Duration) {
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()

		for range ticker.C {
			if !sm.IsSessionActive(configID) {
				return // 会话已关闭，退出协程
			}

			if err := sm.KeepAlive(configID); err != nil {
				fmt.Printf("会话 %s 保活失败: %v\n", configID, err)
				// 可以选择关闭失效的会话
				sm.CloseSession(configID)
				return
			}
		}
	}()
}

// GetSessionUptime 获取会话运行时长
func (sm *SessionManager) GetSessionUptime(configID string) (time.Duration, error) {
	session, err := sm.GetSession(configID)
	if err != nil {
		return 0, err
	}

	return time.Since(session.CreatedAt), nil
}

// ListFiles 列出目录文件（根据会话类型调用对应方法）
func (s *Session) ListFiles(remotePath string) ([]models.FileInfo, error) {
	if s.SFTPClient != nil {
		return s.SFTPClient.ListFiles(remotePath)
	}
	if s.SCPClient != nil {
		return s.SCPClient.ListFiles(remotePath)
	}
	return nil, fmt.Errorf("没有可用的文件传输客户端")
}

// UploadFile 上传文件
func (s *Session) UploadFile(localPath, remotePath string, useSudo bool, progressCallback func(int64, int64)) error {
	if s.SFTPClient != nil {
		// SFTP 不支持 sudo，需要先上传再用 SSH 命令移动
		if useSudo {
			tmpPath := "/tmp/" + filepath.Base(localPath)
			if err := s.SFTPClient.UploadFile(localPath, tmpPath, progressCallback); err != nil {
				return err
			}
			moveCmd := fmt.Sprintf("sudo mv %s %s", tmpPath, remotePath)
			_, err := ExecuteSudoCommand(s.SSHClient, s.Config.Password, moveCmd)
			return err
		}
		return s.SFTPClient.UploadFile(localPath, remotePath, progressCallback)
	}

	if s.SCPClient != nil {
		if useSudo {
			return s.SCPClient.UploadFileWithSudo(localPath, remotePath, progressCallback)
		}
		return s.SCPClient.UploadFile(localPath, remotePath, progressCallback)
	}

	return fmt.Errorf("没有可用的文件传输客户端")
}

// DownloadFile 下载文件
func (s *Session) DownloadFile(remotePath, localPath string, useSudo bool, progressCallback func(int64, int64)) error {
	if s.SFTPClient != nil {
		// SFTP 需要 sudo 时，先用 SSH 命令复制到临时目录
		if useSudo {
			tmpPath := "/tmp/" + filepath.Base(remotePath)
			copyCmd := fmt.Sprintf("sudo cp %s %s && sudo chmod 644 %s", remotePath, tmpPath, tmpPath)
			if _, err := ExecuteSudoCommand(s.SSHClient, s.Config.Password, copyCmd); err != nil {
				return err
			}
			defer func() {
				cleanCmd := fmt.Sprintf("rm -f %s", tmpPath)
				ExecuteCommand(s.SSHClient, cleanCmd)
			}()
			return s.SFTPClient.DownloadFile(tmpPath, localPath, progressCallback)
		}
		return s.SFTPClient.DownloadFile(remotePath, localPath, progressCallback)
	}

	if s.SCPClient != nil {
		if useSudo {
			return s.SCPClient.DownloadFileWithSudo(remotePath, localPath, progressCallback)
		}
		return s.SCPClient.DownloadFile(remotePath, localPath, progressCallback)
	}

	return fmt.Errorf("没有可用的文件传输客户端")
}

// CreateDirectory 创建目录
func (s *Session) CreateDirectory(remotePath string, useSudo bool) error {
	fmt.Printf("Session.CreateDirectory: 创建目录 %s (sudo: %v)\n", remotePath, useSudo)
	
	if s.SFTPClient != nil {
		if useSudo {
			// SFTP 不直接支持 sudo，需要通过 SSH 命令
			escapedPath := escapeShellPath(remotePath)
			cmd := fmt.Sprintf("sudo mkdir -p %s", escapedPath)
			fmt.Printf("Session.CreateDirectory: 执行 sudo 命令: %s\n", cmd)
			_, err := ExecuteCommand(s.SSHClient, cmd)
			return err
		}
		return s.SFTPClient.CreateDirectory(remotePath)
	}
	if s.SCPClient != nil {
		// SCP 需要通过 SSH 命令创建目录
		escapedPath := escapeShellPath(remotePath)
		var cmd string
		if useSudo {
			cmd = fmt.Sprintf("sudo mkdir -p %s", escapedPath)
		} else {
			cmd = fmt.Sprintf("mkdir -p %s", escapedPath)
		}
		fmt.Printf("Session.CreateDirectory: 执行命令: %s\n", cmd)
		_, err := ExecuteCommand(s.SSHClient, cmd)
		return err
	}
	return fmt.Errorf("没有可用的文件传输客户端")
}

// DeleteFile 删除文件
func (s *Session) DeleteFile(remotePath string, useSudo bool) error {
	fmt.Printf("Session.DeleteFile: 删除文件 %s (sudo: %v)\n", remotePath, useSudo)
	
	if s.SFTPClient != nil {
		if useSudo {
			// SFTP 不直接支持 sudo，需要通过 SSH 命令
			escapedPath := escapeShellPath(remotePath)
			cmd := fmt.Sprintf("sudo rm -f %s", escapedPath)
			fmt.Printf("Session.DeleteFile: 执行 sudo 命令: %s\n", cmd)
			_, err := ExecuteCommand(s.SSHClient, cmd)
			if err != nil {
				fmt.Printf("Session.DeleteFile: 命令执行失败: %v\n", err)
				return fmt.Errorf("删除文件失败: %v", err)
			}
			fmt.Printf("Session.DeleteFile: 文件删除成功\n")
			return nil
		}
		return s.SFTPClient.DeleteFile(remotePath)
	}
	if s.SCPClient != nil {
		// 转义路径中的特殊字符
		escapedPath := escapeShellPath(remotePath)
		var cmd string
		if useSudo {
			cmd = fmt.Sprintf("sudo rm -f %s", escapedPath)
		} else {
			cmd = fmt.Sprintf("rm -f %s", escapedPath)
		}
		fmt.Printf("Session.DeleteFile: 执行命令: %s\n", cmd)
		
		_, err := ExecuteCommand(s.SSHClient, cmd)
		if err != nil {
			fmt.Printf("Session.DeleteFile: 命令执行失败: %v\n", err)
			return fmt.Errorf("删除文件失败: %v", err)
		}
		
		fmt.Printf("Session.DeleteFile: 文件删除成功\n")
		return nil
	}
	return fmt.Errorf("没有可用的文件传输客户端")
}

// DeleteDirectory 删除目录
func (s *Session) DeleteDirectory(remotePath string, useSudo bool) error {
	fmt.Printf("Session.DeleteDirectory: 删除目录 %s (sudo: %v)\n", remotePath, useSudo)
	
	if s.SFTPClient != nil {
		if useSudo {
			// SFTP 不直接支持 sudo，需要通过 SSH 命令
			escapedPath := escapeShellPath(remotePath)
			cmd := fmt.Sprintf("sudo rm -rf %s", escapedPath)
			fmt.Printf("Session.DeleteDirectory: 执行 sudo 命令: %s\n", cmd)
			_, err := ExecuteCommand(s.SSHClient, cmd)
			if err != nil {
				fmt.Printf("Session.DeleteDirectory: 命令执行失败: %v\n", err)
				return fmt.Errorf("删除目录失败: %v", err)
			}
			fmt.Printf("Session.DeleteDirectory: 目录删除成功\n")
			return nil
		}
		return s.SFTPClient.DeleteDirectory(remotePath)
	}
	if s.SCPClient != nil {
		// 转义路径中的特殊字符
		escapedPath := escapeShellPath(remotePath)
		var cmd string
		if useSudo {
			cmd = fmt.Sprintf("sudo rm -rf %s", escapedPath)
		} else {
			cmd = fmt.Sprintf("rm -rf %s", escapedPath)
		}
		fmt.Printf("Session.DeleteDirectory: 执行命令: %s\n", cmd)
		
		_, err := ExecuteCommand(s.SSHClient, cmd)
		if err != nil {
			fmt.Printf("Session.DeleteDirectory: 命令执行失败: %v\n", err)
			return fmt.Errorf("删除目录失败: %v", err)
		}
		
		fmt.Printf("Session.DeleteDirectory: 目录删除成功\n")
		return nil
	}
	return fmt.Errorf("没有可用的文件传输客户端")
}

// GetTransferMode 获取传输模式
func (s *Session) GetTransferMode() string {
	if s.SFTPClient != nil {
		return "sftp"
	}
	if s.SCPClient != nil {
		return "scp"
	}
	return "unknown"
}
// escapeShellPath 转义 shell 路径中的特殊字符
func escapeShellPath(path string) string {
	// 如果路径包含空格、特殊字符或中文，用单引号包围
	// 单引号内的所有字符都按字面意思处理，除了单引号本身
	
	// 检查是否需要转义
	needsEscape := false
	for _, char := range path {
		if char == ' ' || char == '\t' || char == '\n' || char == '\r' ||
			char == '"' || char == '\\' || char == '$' || char == '`' ||
			char == '|' || char == '&' || char == ';' || char == '(' ||
			char == ')' || char == '<' || char == '>' || char == '*' ||
			char == '?' || char == '[' || char == ']' || char == '{' ||
			char == '}' || char == '~' || char == '#' || char == '!' ||
			char > 127 { // 非 ASCII 字符（包括中文）
			needsEscape = true
			break
		}
	}
	
	if !needsEscape {
		return path
	}
	
	// 处理路径中的单引号
	escaped := strings.ReplaceAll(path, "'", "'\"'\"'")
	
	// 用单引号包围整个路径
	return "'" + escaped + "'"
}