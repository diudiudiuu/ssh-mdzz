package ssh

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"ssh-mdzz/models"

	scp "github.com/bramvdbogaerde/go-scp"
	"golang.org/x/crypto/ssh"
)

// SCPClient SCP 客户端封装
type SCPClient struct {
	sshClient *ssh.Client
	scpClient scp.Client
	config    *models.SSHConfig
}

// NewSCPClient 创建 SCP 客户端
func NewSCPClient(config *models.SSHConfig) (*SCPClient, error) {
	sshClient, err := CreateSSHClient(config)
	if err != nil {
		return nil, err
	}

	scpClient, err := scp.NewClientBySSH(sshClient)
	if err != nil {
		sshClient.Close()
		return nil, fmt.Errorf("创建 SCP 客户端失败: %w", err)
	}

	return &SCPClient{
		sshClient: sshClient,
		scpClient: scpClient,
		config:    config,
	}, nil
}

// Close 关闭连接
func (c *SCPClient) Close() error {
	c.scpClient.Close()
	if c.sshClient != nil {
		return c.sshClient.Close()
	}
	return nil
}

// UploadFile 上传文件
func (c *SCPClient) UploadFile(localPath, remotePath string, progressCallback func(int64, int64)) error {
	file, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer file.Close()

	fileInfo, err := file.Stat()
	if err != nil {
		return err
	}

	// SCP 上传
	err = c.scpClient.CopyFile(context.Background(), file, remotePath,
		fmt.Sprintf("0%o", fileInfo.Mode()))

	if err != nil {
		return err
	}

	// 简单进度回调（SCP 不支持实时进度）
	if progressCallback != nil {
		progressCallback(fileInfo.Size(), fileInfo.Size())
	}

	return nil
}

// UploadFileWithSudo 使用 sudo 上传文件
func (c *SCPClient) UploadFileWithSudo(localPath, remotePath string, progressCallback func(int64, int64)) error {
	// 先上传到临时目录
	tmpPath := "/tmp/" + filepath.Base(localPath)

	if err := c.UploadFile(localPath, tmpPath, progressCallback); err != nil {
		return err
	}

	// 使用 sudo 移动到目标位置
	moveCmd := fmt.Sprintf("sudo mv %s %s", tmpPath, remotePath)
	_, err := ExecuteSudoCommand(c.sshClient, c.config.Password, moveCmd)

	return err
}

// DownloadFile 下载文件
func (c *SCPClient) DownloadFile(remotePath, localPath string, progressCallback func(int64, int64)) error {
	file, err := os.Create(localPath)
	if err != nil {
		return err
	}
	defer file.Close()

	err = c.scpClient.CopyFromRemote(context.Background(), file, remotePath)
	if err != nil {
		return err
	}

	// 获取文件大小
	fileInfo, _ := file.Stat()
	if progressCallback != nil && fileInfo != nil {
		progressCallback(fileInfo.Size(), fileInfo.Size())
	}

	return nil
}

// DownloadFileWithSudo 使用 sudo 下载文件
func (c *SCPClient) DownloadFileWithSudo(remotePath, localPath string, progressCallback func(int64, int64)) error {
	// 先用 sudo 复制到临时目录
	tmpPath := "/tmp/" + filepath.Base(remotePath)
	copyCmd := fmt.Sprintf("sudo cp %s %s && sudo chmod 644 %s", remotePath, tmpPath, tmpPath)

	_, err := ExecuteSudoCommand(c.sshClient, c.config.Password, copyCmd)
	if err != nil {
		return err
	}

	// 从临时目录下载
	err = c.DownloadFile(tmpPath, localPath, progressCallback)

	// 清理临时文件
	cleanCmd := fmt.Sprintf("rm -f %s", tmpPath)
	ExecuteCommand(c.sshClient, cleanCmd)

	return err
}

// ListFiles 列出目录文件（通过 SSH 命令）
func (c *SCPClient) ListFiles(remotePath string) ([]models.FileInfo, error) {
	fmt.Printf("SCPClient.ListFiles: 列出目录 %s\n", remotePath)
	
	// SCP 不支持列目录，需要通过 SSH 命令
	// 转义路径中的特殊字符
	escapedPath := escapeShellPath(remotePath)
	cmd := fmt.Sprintf("ls -la --time-style=long-iso %s", escapedPath)
	fmt.Printf("SCPClient.ListFiles: 执行命令: %s\n", cmd)
	
	output, err := ExecuteCommand(c.sshClient, cmd)
	if err != nil {
		fmt.Printf("SCPClient.ListFiles: 命令执行失败: %v\n", err)
		return nil, err
	}

	// 解析 ls 输出（简化版本）
	// 生产环境建议使用更健壮的解析方法
	files := parseLsOutput(output, remotePath)
	fmt.Printf("SCPClient.ListFiles: 成功列出 %d 个文件\n", len(files))
	return files, nil
}

// parseLsOutput 解析 ls 命令输出
func parseLsOutput(output, basePath string) []models.FileInfo {
	// 这里是简化实现，生产环境需要更完善的解析
	// 建议使用 stat 命令或其他更可靠的方式
	var files []models.FileInfo
	// TODO: 实现 ls 输出解析
	return files
}