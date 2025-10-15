package ssh

import (
	"fmt"
	"io"
	"os"

	"ssh-mdzz/models"

	"github.com/pkg/sftp"
	"golang.org/x/crypto/ssh"
)

// SFTPClient SFTP 客户端封装
type SFTPClient struct {
	sshClient  *ssh.Client
	sftpClient *sftp.Client
}

// NewSFTPClient 创建 SFTP 客户端
func NewSFTPClient(config *models.SSHConfig) (*SFTPClient, error) {
	sshClient, err := CreateSSHClient(config)
	if err != nil {
		return nil, err
	}

	sftpClient, err := sftp.NewClient(sshClient)
	if err != nil {
		sshClient.Close()
		return nil, fmt.Errorf("创建 SFTP 客户端失败: %w", err)
	}

	return &SFTPClient{
		sshClient:  sshClient,
		sftpClient: sftpClient,
	}, nil
}

// Close 关闭连接
func (c *SFTPClient) Close() error {
	if c.sftpClient != nil {
		c.sftpClient.Close()
	}
	if c.sshClient != nil {
		return c.sshClient.Close()
	}
	return nil
}

// ListFiles 列出目录文件
func (c *SFTPClient) ListFiles(remotePath string) ([]models.FileInfo, error) {
	fmt.Printf("SFTPClient.ListFiles: 列出目录 %s\n", remotePath)
	
	files, err := c.sftpClient.ReadDir(remotePath)
	if err != nil {
		fmt.Printf("SFTPClient.ListFiles: 读取目录失败: %v\n", err)
		return nil, err
	}

	var fileInfos []models.FileInfo
	for _, file := range files {
		// 使用正斜杠构建 Unix 路径，避免 Windows 路径分隔符问题
		var fullPath string
		if remotePath == "/" {
			fullPath = "/" + file.Name()
		} else {
			fullPath = remotePath + "/" + file.Name()
		}
		
		fmt.Printf("SFTPClient.ListFiles: 文件路径构建 - 目录: %s, 文件名: %s, 完整路径: %s\n", remotePath, file.Name(), fullPath)
		
		fileInfos = append(fileInfos, models.FileInfo{
			Name:    file.Name(),
			Path:    fullPath,
			Size:    file.Size(),
			IsDir:   file.IsDir(),
			Mode:    file.Mode().String(),
			ModTime: file.ModTime().Format("2006-01-02 15:04:05"),
		})
	}

	fmt.Printf("SFTPClient.ListFiles: 成功列出 %d 个文件\n", len(fileInfos))
	return fileInfos, nil
}

// UploadFile 上传文件
func (c *SFTPClient) UploadFile(localPath, remotePath string, progressCallback func(int64, int64)) error {
	srcFile, err := os.Open(localPath)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	fileInfo, err := srcFile.Stat()
	if err != nil {
		return err
	}

	dstFile, err := c.sftpClient.Create(remotePath)
	if err != nil {
		return err
	}
	defer dstFile.Close()

	// 带进度的复制
	buf := make([]byte, 32*1024)
	var transferred int64
	totalSize := fileInfo.Size()

	for {
		n, err := srcFile.Read(buf)
		if n > 0 {
			_, writeErr := dstFile.Write(buf[:n])
			if writeErr != nil {
				return writeErr
			}
			transferred += int64(n)

			if progressCallback != nil {
				progressCallback(transferred, totalSize)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}

	return nil
}

// DownloadFile 下载文件
func (c *SFTPClient) DownloadFile(remotePath, localPath string, progressCallback func(int64, int64)) error {
	srcFile, err := c.sftpClient.Open(remotePath)
	if err != nil {
		return err
	}
	defer srcFile.Close()

	fileInfo, err := srcFile.Stat()
	if err != nil {
		return err
	}

	dstFile, err := os.Create(localPath)
	if err != nil {
		return err
	}
	defer dstFile.Close()

	buf := make([]byte, 32*1024)
	var transferred int64
	totalSize := fileInfo.Size()

	for {
		n, err := srcFile.Read(buf)
		if n > 0 {
			_, writeErr := dstFile.Write(buf[:n])
			if writeErr != nil {
				return writeErr
			}
			transferred += int64(n)

			if progressCallback != nil {
				progressCallback(transferred, totalSize)
			}
		}
		if err == io.EOF {
			break
		}
		if err != nil {
			return err
		}
	}

	return nil
}

// CreateDirectory 创建目录
func (c *SFTPClient) CreateDirectory(remotePath string) error {
	return c.sftpClient.Mkdir(remotePath)
}

// DeleteFile 删除文件
func (c *SFTPClient) DeleteFile(remotePath string) error {
	fmt.Printf("SFTPClient.DeleteFile: 删除文件 %s\n", remotePath)
	
	// 先检查文件是否存在
	if _, err := c.sftpClient.Stat(remotePath); err != nil {
		fmt.Printf("SFTPClient.DeleteFile: 文件不存在或无法访问: %v\n", err)
		return fmt.Errorf("文件不存在或无法访问: %s", remotePath)
	}
	
	err := c.sftpClient.Remove(remotePath)
	if err != nil {
		fmt.Printf("SFTPClient.DeleteFile: 删除文件失败: %v\n", err)
		return fmt.Errorf("删除文件失败: %v", err)
	}
	
	fmt.Printf("SFTPClient.DeleteFile: 文件删除成功\n")
	return nil
}

// DeleteDirectory 删除目录
func (c *SFTPClient) DeleteDirectory(remotePath string) error {
	fmt.Printf("SFTPClient.DeleteDirectory: 删除目录 %s\n", remotePath)
	
	// 先检查目录是否存在
	if _, err := c.sftpClient.Stat(remotePath); err != nil {
		fmt.Printf("SFTPClient.DeleteDirectory: 目录不存在或无法访问: %v\n", err)
		return fmt.Errorf("目录不存在或无法访问: %s", remotePath)
	}
	
	err := c.sftpClient.RemoveDirectory(remotePath)
	if err != nil {
		fmt.Printf("SFTPClient.DeleteDirectory: 删除目录失败: %v\n", err)
		return fmt.Errorf("删除目录失败: %v", err)
	}
	
	fmt.Printf("SFTPClient.DeleteDirectory: 目录删除成功\n")
	return nil
}
