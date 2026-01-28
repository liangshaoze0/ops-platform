package utils

import (
	"encoding/json"
	"develops-ai/internal/models"
	"gorm.io/gorm"
)

// LogAudit 记录审计日志
func LogAudit(db *gorm.DB, log *models.AuditLog) error {
	return db.Create(log).Error
}

// LogLogin 记录登录日志
func LogLogin(db *gorm.DB, userID uint, username, ipAddress, userAgent string) error {
	return LogAudit(db, &models.AuditLog{
		UserID:    userID,
		Username:  username,
		Action:    "login",
		Resource:  "user",
		ResourceID: userID,
		Method:    "POST",
		Path:      "/api/auth/login",
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Status:    200,
		Message:   "用户登录成功",
	})
}

// LogLogout 记录登出日志
func LogLogout(db *gorm.DB, userID uint, username, ipAddress, userAgent string) error {
	return LogAudit(db, &models.AuditLog{
		UserID:    userID,
		Username:  username,
		Action:    "logout",
		Resource:  "user",
		ResourceID: userID,
		Method:    "POST",
		Path:      "/api/logout",
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Status:    200,
		Message:   "用户登出成功",
	})
}

// LogRegister 记录注册日志
func LogRegister(db *gorm.DB, userID uint, username, ipAddress, userAgent string) error {
	return LogAudit(db, &models.AuditLog{
		UserID:    userID,
		Username:  username,
		Action:    "register",
		Resource:  "user",
		ResourceID: userID,
		Method:    "POST",
		Path:      "/api/auth/register",
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Status:    200,
		Message:   "用户注册成功",
	})
}

// LogAction 记录通用操作日志
func LogAction(db *gorm.DB, userID uint, username, action, resource string, resourceID uint, method, path, ipAddress, userAgent string, status int, message string, request, response interface{}) error {
	var requestStr, responseStr string
	
	if request != nil {
		if data, err := json.Marshal(request); err == nil {
			requestStr = string(data)
		}
	}
	
	if response != nil {
		if data, err := json.Marshal(response); err == nil {
			responseStr = string(data)
		}
	}

	return LogAudit(db, &models.AuditLog{
		UserID:     userID,
		Username:   username,
		Action:     action,
		Resource:   resource,
		ResourceID: resourceID,
		Method:     method,
		Path:       path,
		IPAddress:  ipAddress,
		UserAgent:  userAgent,
		Status:     status,
		Message:    message,
		Request:    requestStr,
		Response:   responseStr,
	})
}
