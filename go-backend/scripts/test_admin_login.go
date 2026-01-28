package main

import (
	"fmt"
	"log"

	"develops-ai/internal/config"
	"develops-ai/internal/models"
	"develops-ai/internal/utils"
	"develops-ai/pkg/database"

	"gorm.io/gorm"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 连接数据库
	db, err := database.InitDB(cfg)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}

	// 查找admin用户
	var user models.User
	if err := db.Where("username = ?", "admin").First(&user).Error; err != nil {
		log.Fatalf("找不到admin用户: %v", err)
	}

	fmt.Printf("找到admin用户:\n")
	fmt.Printf("  ID: %d\n", user.ID)
	fmt.Printf("  Username: %s\n", user.Username)
	fmt.Printf("  Email: %s\n", user.Email)
	fmt.Printf("  IsActive: %v\n", user.IsActive)
	fmt.Printf("  密码哈希长度: %d\n", len(user.Password))
	fmt.Printf("  密码哈希前30字符: %s\n", user.Password[:min(30, len(user.Password))])

	// 测试密码验证
	testPassword := "admin"
	fmt.Printf("\n测试密码验证:\n")
	fmt.Printf("  测试密码: %s\n", testPassword)
	isValid := utils.CheckPassword(testPassword, user.Password)
	fmt.Printf("  验证结果: %v\n", isValid)

	if !isValid {
		fmt.Printf("\n密码验证失败，正在重置密码...\n")
		hashedPassword, err := utils.HashPassword("admin")
		if err != nil {
			log.Fatalf("生成密码哈希失败: %v", err)
		}

		user.Password = hashedPassword
		user.IsActive = true
		if err := db.Save(&user).Error; err != nil {
			log.Fatalf("保存用户失败: %v", err)
		}

		fmt.Printf("密码已重置，新哈希长度: %d\n", len(hashedPassword))
		isValid = utils.CheckPassword("admin", hashedPassword)
		fmt.Printf("新密码验证结果: %v\n", isValid)
	} else {
		fmt.Printf("\n密码验证成功！\n")
	}
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
