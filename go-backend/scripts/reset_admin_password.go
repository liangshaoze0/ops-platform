package main

import (
	"fmt"
	"log"
	"os"

	"develops-ai/internal/config"
	"develops-ai/internal/models"
	"develops-ai/internal/utils"
	"develops-ai/pkg/database"

	"gorm.io/gorm"
)

func main() {
	// 加载配置
	cfg := config.Load()

	// 初始化数据库
	db, err := database.InitDB(cfg)
	if err != nil {
		log.Fatalf("数据库初始化失败: %v", err)
	}

	// 获取要设置的新密码（从命令行参数或使用默认值）
	newPassword := "admin"
	if len(os.Args) > 1 {
		newPassword = os.Args[1]
	}

	// 查找admin用户
	var adminUser models.User
	result := db.Where("username = ?", "admin").First(&adminUser)
	
	if result.Error == gorm.ErrRecordNotFound {
		// 如果admin用户不存在，创建它
		hashedPassword, err := utils.HashPassword(newPassword)
		if err != nil {
			log.Fatalf("密码加密失败: %v", err)
		}

		adminUser = models.User{
			Username: "admin",
			Email:    "admin@devops-platform.com",
			Password: hashedPassword,
			Name:     "系统管理员",
			IsActive: true,
		}

		if err := db.Create(&adminUser).Error; err != nil {
			log.Fatalf("创建admin用户失败: %v", err)
		}

		// 分配管理员角色
		var adminRole models.Role
		if err := db.Where("name = ?", "admin").First(&adminRole).Error; err != nil {
			log.Fatalf("查找admin角色失败: %v", err)
		}

		// 检查是否已有角色关联
		var existingUserRole models.UserRole
		if err := db.Where("user_id = ? AND role_id = ?", adminUser.ID, adminRole.ID).First(&existingUserRole).Error; err == gorm.ErrRecordNotFound {
			userRole := models.UserRole{
				UserID: adminUser.ID,
				RoleID: adminRole.ID,
			}
			if err := db.Create(&userRole).Error; err != nil {
				log.Fatalf("分配admin角色失败: %v", err)
			}
		}

		fmt.Printf("✓ 已创建admin用户\n")
		fmt.Printf("  用户名: admin\n")
		fmt.Printf("  密码: %s\n", newPassword)
	} else if result.Error != nil {
		log.Fatalf("查询admin用户失败: %v", result.Error)
	} else {
		// 重置密码
		hashedPassword, err := utils.HashPassword(newPassword)
		if err != nil {
			log.Fatalf("密码加密失败: %v", err)
		}

		// 更新密码和激活状态
		if err := db.Model(&adminUser).Updates(map[string]interface{}{
			"password":  hashedPassword,
			"is_active": true,
		}).Error; err != nil {
			log.Fatalf("重置密码失败: %v", err)
		}

		// 重新查询以验证
		if err := db.Where("username = ?", "admin").First(&adminUser).Error; err != nil {
			log.Fatalf("重新查询admin用户失败: %v", err)
		}

		// 验证密码是否正确设置
		if !utils.CheckPassword(newPassword, adminUser.Password) {
			log.Fatalf("✗ 密码验证失败！密码哈希可能有问题")
		}

		// 确保admin角色已分配
		var adminRole models.Role
		if err := db.Where("name = ?", "admin").First(&adminRole).Error; err != nil {
			log.Fatalf("查找admin角色失败: %v", err)
		}

		var existingUserRole models.UserRole
		if err := db.Where("user_id = ? AND role_id = ?", adminUser.ID, adminRole.ID).First(&existingUserRole).Error; err == gorm.ErrRecordNotFound {
			userRole := models.UserRole{
				UserID: adminUser.ID,
				RoleID: adminRole.ID,
			}
			if err := db.Create(&userRole).Error; err != nil {
				log.Printf("警告：分配admin角色失败: %v", err)
			} else {
				fmt.Printf("✓ 已为admin用户分配admin角色\n")
			}
		}

		fmt.Printf("✓ 已重置admin用户密码\n")
		fmt.Printf("  用户名: admin\n")
		fmt.Printf("  密码: %s\n", newPassword)
		fmt.Printf("  激活状态: %v\n", adminUser.IsActive)
	}

	// 显示用户信息
	fmt.Printf("\n用户信息:\n")
	fmt.Printf("  ID: %d\n", adminUser.ID)
	fmt.Printf("  用户名: %s\n", adminUser.Username)
	fmt.Printf("  邮箱: %s\n", adminUser.Email)
	fmt.Printf("  名称: %s\n", adminUser.Name)
	fmt.Printf("  激活: %v\n", adminUser.IsActive)
	fmt.Printf("  密码哈希长度: %d\n", len(adminUser.Password))

	// 验证密码
	if utils.CheckPassword(newPassword, adminUser.Password) {
		fmt.Printf("\n✓ 密码验证成功！\n")
	} else {
		fmt.Printf("\n✗ 密码验证失败！\n")
	}
}
