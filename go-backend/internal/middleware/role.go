package middleware

import (
	"develops-ai/internal/models"
	"develops-ai/internal/utils"
	"strings"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// RequireRole 要求特定角色的中间件
// 注意：需要在路由中通过SetDB中间件设置数据库连接
func RequireRole(db *gorm.DB, roleNames ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			utils.Unauthorized(c, "未找到用户信息")
			c.Abort()
			return
		}

		// 查询用户角色
		var user models.User
		if err := db.Preload("UserRoles.Role").First(&user, userID).Error; err != nil {
			utils.Unauthorized(c, "用户不存在")
			c.Abort()
			return
		}

		// 检查用户是否有所需角色
		hasRole := false
		for _, userRole := range user.UserRoles {
			for _, requiredRole := range roleNames {
				if userRole.Role.Name == requiredRole {
					hasRole = true
					break
				}
			}
			if hasRole {
				break
			}
		}

		if !hasRole {
			utils.Forbidden(c, "权限不足，需要以下角色之一: "+strings.Join(roleNames, ", "))
			c.Abort()
			return
		}

		c.Next()
	}
}

// RequirePermission 要求特定权限的中间件
// 注意：需要在路由中通过SetDB中间件设置数据库连接
func RequirePermission(db *gorm.DB, permission string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("user_id")
		if !exists {
			utils.Unauthorized(c, "未找到用户信息")
			c.Abort()
			return
		}

		// 查询用户角色
		var user models.User
		if err := db.Preload("UserRoles.Role").First(&user, userID).Error; err != nil {
			utils.Unauthorized(c, "用户不存在")
			c.Abort()
			return
		}

		// 检查用户是否有所需权限
		hasPermission := false
		for _, userRole := range user.UserRoles {
			// 管理员拥有所有权限
			if userRole.Role.Name == "admin" {
				hasPermission = true
				break
			}
			// 检查权限列表（简化实现，实际应该解析JSON）
			if strings.Contains(userRole.Role.Permissions, permission) || strings.Contains(userRole.Role.Permissions, "*") {
				hasPermission = true
				break
			}
		}

		if !hasPermission {
			utils.Forbidden(c, "权限不足，需要权限: "+permission)
			c.Abort()
			return
		}

		c.Next()
	}
}
