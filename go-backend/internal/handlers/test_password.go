package handlers

import (
	"log"

	"develops-ai/internal/models"
	"develops-ai/internal/utils"

	"gorm.io/gorm"
)

// TestAdminPassword 测试admin密码（用于调试）
func TestAdminPassword(db *gorm.DB) {
	var user models.User
	if err := db.Where("username = ?", "admin").First(&user).Error; err != nil {
		log.Printf("测试失败：找不到admin用户: %v", err)
		return
	}

	log.Printf("找到admin用户: ID=%d, Username=%s, IsActive=%v", user.ID, user.Username, user.IsActive)
	log.Printf("密码哈希长度: %d", len(user.Password))
	previewLen := 20
	if len(user.Password) < previewLen {
		previewLen = len(user.Password)
	}
	log.Printf("密码哈希前20字符: %s", user.Password[:previewLen])

	// 测试密码验证
	testPassword := "admin"
	isValid := utils.CheckPassword(testPassword, user.Password)
	log.Printf("密码验证结果: %v (测试密码: %s)", isValid, testPassword)

	// 生成新的哈希并测试
	newHash, err := utils.HashPassword("admin")
	if err != nil {
		log.Printf("生成新哈希失败: %v", err)
		return
	}
	log.Printf("新密码哈希长度: %d", len(newHash))
	isValidNew := utils.CheckPassword("admin", newHash)
	log.Printf("新哈希验证结果: %v", isValidNew)
}
