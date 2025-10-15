package ssh

import (
	"fmt"
	"os"
	"time"

	"ssh-mdzz/models"

	"golang.org/x/crypto/ssh"
)

// CreateSSHClient 创建 SSH 客户端
func CreateSSHClient(config *models.SSHConfig) (*ssh.Client, error) {
	var authMethod ssh.AuthMethod

	// 选择认证方式
	if config.KeyPath != "" {
		// 密钥认证
		key, err := os.ReadFile(config.KeyPath)
		if err != nil {
			return nil, fmt.Errorf("读取密钥文件失败: %w", err)
		}

		signer, err := ssh.ParsePrivateKey(key)
		if err != nil {
			return nil, fmt.Errorf("解析密钥失败: %w", err)
		}

		authMethod = ssh.PublicKeys(signer)
	} else if config.Password != "" {
		// 密码认证
		authMethod = ssh.Password(config.Password)
	} else {
		return nil, fmt.Errorf("未提供认证信息")
	}

	// SSH 客户端配置
	clientConfig := &ssh.ClientConfig{
		User:            config.Username,
		Auth:            []ssh.AuthMethod{authMethod},
		HostKeyCallback: ssh.InsecureIgnoreHostKey(), // 生产环境应该验证
		Timeout:         10 * time.Second,
	}

	// 连接
	addr := fmt.Sprintf("%s:%s", config.Host, config.Port)
	client, err := ssh.Dial("tcp", addr, clientConfig)
	if err != nil {
		return nil, fmt.Errorf("SSH 连接失败: %w", err)
	}

	return client, nil
}

// ExecuteCommand 执行单个命令
func ExecuteCommand(client *ssh.Client, command string) (string, error) {
	session, err := client.NewSession()
	if err != nil {
		return "", err
	}
	defer session.Close()

	output, err := session.CombinedOutput(command)
	return string(output), err
}

// ExecuteSudoCommand 执行 sudo 命令
func ExecuteSudoCommand(client *ssh.Client, password, command string) (string, error) {
	session, err := client.NewSession()
	if err != nil {
		return "", err
	}
	defer session.Close()

	// 使用 echo 管道传递密码给 sudo
	sudoCommand := fmt.Sprintf("echo '%s' | sudo -S %s", password, command)

	output, err := session.CombinedOutput(sudoCommand)
	return string(output), err
}
