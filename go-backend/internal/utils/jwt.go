package utils

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var jwtSecret []byte

// JWTClaims JWT声明结构
type JWTClaims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// InitJWT 初始化JWT密钥
func InitJWT(secret string) {
	jwtSecret = []byte(secret)
}

// GenerateToken 生成JWT token
func GenerateToken(userID uint, username string, expirationHours int) (string, error) {
	if len(jwtSecret) == 0 {
		return "", errors.New("JWT密钥未初始化，请先调用InitJWT")
	}

	// 创建声明
	claims := JWTClaims{
		UserID:   userID,
		Username: username,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Duration(expirationHours) * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
	}

	// 创建token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// 签名并获取完整的编码后的字符串token
	tokenString, err := token.SignedString(jwtSecret)
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// ParseToken 解析JWT token
func ParseToken(tokenString string) (*JWTClaims, error) {
	if len(jwtSecret) == 0 {
		return nil, errors.New("JWT密钥未初始化，请先调用InitJWT")
	}

	// 解析token
	token, err := jwt.ParseWithClaims(tokenString, &JWTClaims{}, func(token *jwt.Token) (interface{}, error) {
		// 验证签名方法
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("无效的签名方法")
		}
		return jwtSecret, nil
	})

	if err != nil {
		return nil, err
	}

	// 验证token并提取声明
	if claims, ok := token.Claims.(*JWTClaims); ok && token.Valid {
		return claims, nil
	}

	return nil, errors.New("无效的token")
}
