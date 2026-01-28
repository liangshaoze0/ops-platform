package middleware

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// SetDB 设置数据库连接到上下文的中间件
func SetDB(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Set("db", db)
		c.Next()
	}
}
