package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"ssh-mdzz/models"
)

// deriveKey 从用户输入的密钥生成固定长度的加密密钥
func deriveKey(userKey string) []byte {
	hash := sha256.Sum256([]byte(userKey))
	return hash[:]
}

// Encrypt 使用 AES-256-GCM 加密数据
func Encrypt(plaintext string, userKey string) (string, error) {
	if plaintext == "" {
		return "", nil
	}

	key := deriveKey(userKey)

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	ciphertext := gcm.Seal(nonce, nonce, []byte(plaintext), nil)
	return base64.StdEncoding.EncodeToString(ciphertext), nil
}

// Decrypt 使用 AES-256-GCM 解密数据
func Decrypt(ciphertext string, userKey string) (string, error) {
	if ciphertext == "" {
		return "", nil
	}

	key := deriveKey(userKey)

	data, err := base64.StdEncoding.DecodeString(ciphertext)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(key)
	if err != nil {
		return "", err
	}

	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := gcm.NonceSize()
	if len(data) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, cipherData := data[:nonceSize], data[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, cipherData, nil)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

// EncryptConfig 加密 SSH 配置中的敏感信息
func EncryptConfig(config *models.SSHConfig, userKey string) error {
	if config.Password != "" {
		encrypted, err := Encrypt(config.Password, userKey)
		if err != nil {
			return err
		}
		config.Password = encrypted
	}
	return nil
}

// DecryptConfig 解密 SSH 配置中的敏感信息
func DecryptConfig(config *models.SSHConfig, userKey string) error {
	if config.Password != "" {
		decrypted, err := Decrypt(config.Password, userKey)
		if err != nil {
			return err
		}
		config.Password = decrypted
	}
	return nil
}
