package handlers

import (
	"develops-ai/internal/models"
	"develops-ai/internal/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// DebugCheckAdmin 调试接口：检查admin用户信息（仅开发环境）
func DebugCheckAdmin(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var user models.User
		if err := db.Where("username = ?", "admin").First(&user).Error; err != nil {
			utils.Error(c, 404, "admin用户不存在: "+err.Error())
			return
		}

		// 测试密码验证
		testPassword := "admin"
		isValid := utils.CheckPassword(testPassword, user.Password)

		// 如果密码验证失败，尝试重置
		if !isValid {
			hashedPassword, err := utils.HashPassword("admin")
			if err == nil {
				user.Password = hashedPassword
				user.IsActive = true
				if err := db.Save(&user).Error; err == nil {
					// 重新验证
					isValid = utils.CheckPassword(testPassword, user.Password)
				}
			}
		}

		utils.Success(c, gin.H{
			"user": gin.H{
				"id":                 user.ID,
				"username":           user.Username,
				"email":              user.Email,
				"is_active":          user.IsActive,
				"password_hash_length": len(user.Password),
				"password_hash_preview": func() string {
					previewLen := 30
					if len(user.Password) < previewLen {
						previewLen = len(user.Password)
					}
					return user.Password[:previewLen] + "..."
				}(),
			},
			"password_test": gin.H{
				"test_password": testPassword,
				"is_valid":      isValid,
			},
		})
	}
}
