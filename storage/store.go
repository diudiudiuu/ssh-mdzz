package storage

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"sync"
	"time"

	"ssh-mdzz/crypto"
	"ssh-mdzz/models"
)

type Store struct {
	configs     []models.SSHConfig
	userKey     string
	filePath    string
	sessionPath string
	mu          sync.RWMutex
}

// SessionData 会话数据结构
type SessionData struct {
	Token     string    `json:"token"`
	KeyHash   string    `json:"keyHash"`
	CreatedAt time.Time `json:"createdAt"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func NewStore() *Store {
	home, _ := os.UserHomeDir()
	return &Store{
		configs:     []models.SSHConfig{},
		filePath:    filepath.Join(home, ".ssh-mdzz-configs.enc"),
		sessionPath: filepath.Join(home, ".ssh-mdzz-session.json"),
	}
}

// SetUserKey 设置用户加密密钥
func (s *Store) SetUserKey(key string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.userKey = key

	// 如果已有配置文件，尝试用新密钥加载
	if _, err := os.Stat(s.filePath); err == nil {
		return s.loadConfigsNoLock() // 调用不加锁的内部方法
	}

	return nil
}

// GetUserKey 获取当前密钥
func (s *Store) GetUserKey() string {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.userKey
}

// IsKeySet 检查是否已设置密钥（检查本地文件）
func (s *Store) IsKeySet() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	
	// 检查是否有加密配置文件
	if _, err := os.Stat(s.filePath); err == nil {
		fmt.Printf("IsKeySet: 发现配置文件，密钥已设置\n")
		return true
	}
	
	// 检查是否有会话文件
	if _, err := os.Stat(s.sessionPath); err == nil {
		fmt.Printf("IsKeySet: 发现会话文件，密钥已设置\n")
		return true
	}
	
	fmt.Printf("IsKeySet: 未发现配置文件或会话文件，密钥未设置\n")
	return false
}

// loadConfigsNoLock 从文件加载配置（内部方法，不加锁）
func (s *Store) loadConfigsNoLock() error {
	data, err := os.ReadFile(s.filePath)
	if err != nil {
		if os.IsNotExist(err) {
			s.configs = []models.SSHConfig{}
			return nil
		}
		return err
	}

	var encryptedConfigs []models.SSHConfig
	if err := json.Unmarshal(data, &encryptedConfigs); err != nil {
		return err
	}

	// 解密配置
	s.configs = make([]models.SSHConfig, 0, len(encryptedConfigs))
	for _, config := range encryptedConfigs {
		if err := crypto.DecryptConfig(&config, s.userKey); err != nil {
			return err
		}
		s.configs = append(s.configs, config)
	}

	return nil
}

// LoadConfigs 加载所有配置
func (s *Store) LoadConfigs() ([]models.SSHConfig, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.userKey == "" { // 避免调用带锁的 IsKeySet，防止死锁
		return nil, errors.New("未设置加密密钥")
	}

	if err := s.loadConfigsNoLock(); err != nil {
		return nil, err
	}

	return s.configs, nil
}

// SaveConfigs 保存所有配置
func (s *Store) SaveConfigs() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	return s.saveConfigsNoLock()
}

// saveConfigsNoLock 保存所有配置（内部方法，不加锁）
func (s *Store) saveConfigsNoLock() error {
	fmt.Printf("saveConfigsNoLock: 开始保存配置\n")
	
	if s.userKey == "" {
		fmt.Printf("saveConfigsNoLock: 未设置加密密钥\n")
		return errors.New("未设置加密密钥")
	}

	fmt.Printf("saveConfigsNoLock: 开始加密 %d 个配置\n", len(s.configs))
	
	// 加密配置
	encryptedConfigs := make([]models.SSHConfig, len(s.configs))
	for i, config := range s.configs {
		configCopy := config
		if err := crypto.EncryptConfig(&configCopy, s.userKey); err != nil {
			fmt.Printf("saveConfigsNoLock: 加密配置失败: %v\n", err)
			return err
		}
		encryptedConfigs[i] = configCopy
	}

	fmt.Printf("saveConfigsNoLock: 开始序列化配置\n")
	data, err := json.MarshalIndent(encryptedConfigs, "", "  ")
	if err != nil {
		fmt.Printf("saveConfigsNoLock: 序列化失败: %v\n", err)
		return err
	}

	fmt.Printf("saveConfigsNoLock: 开始写入文件 %s\n", s.filePath)
	err = os.WriteFile(s.filePath, data, 0600)
	if err != nil {
		fmt.Printf("saveConfigsNoLock: 写入文件失败: %v\n", err)
	} else {
		fmt.Printf("saveConfigsNoLock: 文件写入成功\n")
	}
	
	return err
}

// GetConfig 获取指定配置
func (s *Store) GetConfig(id string) (*models.SSHConfig, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	for _, config := range s.configs {
		if config.ID == id {
			return &config, nil
		}
	}
	return nil, errors.New("配置不存在")
}

// AddConfig 添加配置
func (s *Store) AddConfig(config models.SSHConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 添加调试日志
	fmt.Printf("AddConfig: 开始添加配置 %s\n", config.Name)
	
	s.configs = append(s.configs, config)
	
	fmt.Printf("AddConfig: 开始保存配置到文件\n")
	err := s.saveConfigsNoLock()
	
	if err != nil {
		fmt.Printf("AddConfig: 保存配置失败: %v\n", err)
	} else {
		fmt.Printf("AddConfig: 配置保存成功\n")
	}
	
	return err
}

// UpdateConfig 更新配置
func (s *Store) UpdateConfig(config models.SSHConfig) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, c := range s.configs {
		if c.ID == config.ID {
			s.configs[i] = config
			return s.saveConfigsNoLock()
		}
	}
	return errors.New("配置不存在")
}

// DeleteConfig 删除配置
func (s *Store) DeleteConfig(id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	for i, config := range s.configs {
		if config.ID == id {
			s.configs = append(s.configs[:i], s.configs[i+1:]...)
			return s.saveConfigsNoLock()
		}
	}
	return errors.New("配置不存在")
}

// GetAllConfigs 获取所有配置（不解密敏感信息）
func (s *Store) GetAllConfigs() []models.SSHConfig {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]models.SSHConfig, len(s.configs))
	for i, config := range s.configs {
		configCopy := config
		if configCopy.Password != "" {
			configCopy.Password = "******"
		}
		result[i] = configCopy
	}
	return result
}

// ============ 会话管理 ============

// generateToken 生成随机令牌
func (s *Store) generateToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// hashKey 对密钥进行哈希
func (s *Store) hashKey(key string) string {
	hash := sha256.Sum256([]byte(key))
	return hex.EncodeToString(hash[:])
}

// CreateSession 创建会话
func (s *Store) CreateSession() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if s.userKey == "" {
		return errors.New("未设置用户密钥")
	}

	fmt.Printf("CreateSession: 开始创建会话\n")

	// 生成令牌
	token, err := s.generateToken()
	if err != nil {
		fmt.Printf("CreateSession: 生成令牌失败: %v\n", err)
		return err
	}

	// 创建会话数据
	sessionData := SessionData{
		Token:     token,
		KeyHash:   s.hashKey(s.userKey),
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(24 * time.Hour), // 24小时过期
	}

	// 保存会话到文件
	data, err := json.MarshalIndent(sessionData, "", "  ")
	if err != nil {
		fmt.Printf("CreateSession: 序列化会话数据失败: %v\n", err)
		return err
	}

	if err := os.WriteFile(s.sessionPath, data, 0600); err != nil {
		fmt.Printf("CreateSession: 写入会话文件失败: %v\n", err)
		return err
	}

	fmt.Printf("CreateSession: 会话创建成功，过期时间: %v\n", sessionData.ExpiresAt)
	return nil
}

// HasValidSession 检查是否有有效会话
func (s *Store) HasValidSession() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// 检查会话文件是否存在
	if _, err := os.Stat(s.sessionPath); os.IsNotExist(err) {
		fmt.Printf("HasValidSession: 会话文件不存在\n")
		return false
	}

	// 读取会话数据
	data, err := os.ReadFile(s.sessionPath)
	if err != nil {
		fmt.Printf("HasValidSession: 读取会话文件失败: %v\n", err)
		return false
	}

	var sessionData SessionData
	if err := json.Unmarshal(data, &sessionData); err != nil {
		fmt.Printf("HasValidSession: 解析会话数据失败: %v\n", err)
		return false
	}

	// 检查是否过期
	if time.Now().After(sessionData.ExpiresAt) {
		fmt.Printf("HasValidSession: 会话已过期\n")
		s.ClearSession() // 清除过期会话
		return false
	}

	fmt.Printf("HasValidSession: 会话有效，剩余时间: %v\n", sessionData.ExpiresAt.Sub(time.Now()))
	return true
}

// RestoreFromSession 从会话恢复密钥
func (s *Store) RestoreFromSession() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	fmt.Printf("RestoreFromSession: 开始从会话恢复\n")

	// 读取会话数据
	data, err := os.ReadFile(s.sessionPath)
	if err != nil {
		fmt.Printf("RestoreFromSession: 读取会话文件失败: %v\n", err)
		return err
	}

	var sessionData SessionData
	if err := json.Unmarshal(data, &sessionData); err != nil {
		fmt.Printf("RestoreFromSession: 解析会话数据失败: %v\n", err)
		return err
	}

	// 检查是否过期
	if time.Now().After(sessionData.ExpiresAt) {
		fmt.Printf("RestoreFromSession: 会话已过期\n")
		return errors.New("会话已过期")
	}

	// 尝试加载配置来验证会话的有效性
	// 这里我们需要通过尝试解密配置来反推密钥是否正确
	// 但由于安全考虑，我们不能直接从哈希反推密钥
	// 所以这个方法需要配合前端的密钥缓存使用

	fmt.Printf("RestoreFromSession: 会话验证成功\n")
	return nil
}

// ClearSession 清除会话
func (s *Store) ClearSession() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	fmt.Printf("ClearSession: 清除会话\n")

	if err := os.Remove(s.sessionPath); err != nil && !os.IsNotExist(err) {
		fmt.Printf("ClearSession: 删除会话文件失败: %v\n", err)
		return err
	}

	fmt.Printf("ClearSession: 会话清除成功\n")
	return nil
}

// ValidateKeyWithSession 使用会话验证密钥
func (s *Store) ValidateKeyWithSession(key string) error {
	s.mu.RLock()
	defer s.mu.RUnlock()

	// 读取会话数据
	data, err := os.ReadFile(s.sessionPath)
	if err != nil {
		return err
	}

	var sessionData SessionData
	if err := json.Unmarshal(data, &sessionData); err != nil {
		return err
	}

	// 检查密钥哈希是否匹配
	if s.hashKey(key) != sessionData.KeyHash {
		return errors.New("密钥不匹配")
	}

	// 检查是否过期
	if time.Now().After(sessionData.ExpiresAt) {
		return errors.New("会话已过期")
	}

	return nil
}
