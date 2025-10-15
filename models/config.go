package models

import "time"

// SSHConfig SSH 连接配置
type SSHConfig struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Host         string    `json:"host"`
	Port         string    `json:"port"`
	Username     string    `json:"username"`
	Password     string    `json:"password"`     // 加密存储
	KeyPath      string    `json:"keyPath"`      // 私钥文件路径
	TransferMode string    `json:"transferMode"` // sftp 或 scp
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// SSHSession SSH 会话信息
type SSHSession struct {
	ID          string    `json:"id"`
	ConfigID    string    `json:"configId"`
	ConfigName  string    `json:"configName"`
	Host        string    `json:"host"`
	ConnectedAt time.Time `json:"connectedAt"`
	IsActive    bool      `json:"isActive"`
}

// FileInfo 文件信息
type FileInfo struct {
	Name    string `json:"name"`
	Path    string `json:"path"`
	Size    int64  `json:"size"`
	IsDir   bool   `json:"isDir"`
	Mode    string `json:"mode"`
	ModTime string `json:"modTime"`
}

// TransferProgress 传输进度
type TransferProgress struct {
	FileName    string  `json:"fileName"`
	Transferred int64   `json:"transferred"`
	Total       int64   `json:"total"`
	Percentage  float64 `json:"percentage"`
	Speed       string  `json:"speed"`
}

// ConnectionStatus 连接状态
type ConnectionStatus struct {
	IsConnected bool   `json:"isConnected"`
	Latency     int64  `json:"latency"`
	Error       string `json:"error"`
}
