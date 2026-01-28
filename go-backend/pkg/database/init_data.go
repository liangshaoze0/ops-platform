package database

import (
	"log"

	"develops-ai/internal/models"
	"develops-ai/internal/utils"

	"gorm.io/gorm"
)

// InitDefaultData 初始化默认数据（管理员用户和角色）
func InitDefaultData(db *gorm.DB) error {
	// 初始化角色
	if err := initRoles(db); err != nil {
		return err
	}

	// 初始化管理员用户
	if err := initAdminUser(db); err != nil {
		return err
	}

	return nil
}

// initRoles 初始化角色
func initRoles(db *gorm.DB) error {
	roles := []models.Role{
		{
			Name:        "admin",
			DisplayName: "管理员",
			Description: "系统管理员，拥有所有权限",
			Permissions: `["*"]`, // 所有权限
			IsSystem:    true,
		},
		{
			Name:        "user",
			DisplayName: "普通用户",
			Description: "普通用户，拥有基本权限",
			Permissions: `["user:read", "user:update", "ai:create", "ai:read"]`,
			IsSystem:    true,
		},
	}

	for _, role := range roles {
		var existingRole models.Role
		result := db.Where("name = ?", role.Name).First(&existingRole)
		if result.Error == gorm.ErrRecordNotFound {
			if err := db.Create(&role).Error; err != nil {
				return err
			}
			log.Printf("创建角色: %s", role.Name)
		}
	}

	return nil
}

// initAdminUser 初始化管理员用户
func initAdminUser(db *gorm.DB) error {
	// 检查管理员用户是否已存在
	var adminUser models.User
	result := db.Where("username = ?", "admin").First(&adminUser)
	
	// 生成新的密码哈希
	hashedPassword, err := utils.HashPassword("admin")
	if err != nil {
		return err
	}

	if result.Error == gorm.ErrRecordNotFound {
		// 创建管理员用户
		adminUser = models.User{
			Username: "admin",
			Email:    "admin@devops-platform.com",
			Password: hashedPassword,
			Name:     "系统管理员",
			IsActive: true,
		}

		if err := db.Create(&adminUser).Error; err != nil {
			return err
		}

		// 分配管理员角色
		var adminRole models.Role
		if err := db.Where("name = ?", "admin").First(&adminRole).Error; err != nil {
			return err
		}

		// 检查是否已有角色关联
		var existingUserRole models.UserRole
		if err := db.Where("user_id = ? AND role_id = ?", adminUser.ID, adminRole.ID).First(&existingUserRole).Error; err == gorm.ErrRecordNotFound {
			userRole := models.UserRole{
				UserID: adminUser.ID,
				RoleID: adminRole.ID,
			}
			if err := db.Create(&userRole).Error; err != nil {
				return err
			}
		}

		log.Printf("创建管理员用户: admin (密码: admin)")
	} else if result.Error != nil {
		return result.Error
	} else {
		// 管理员用户已存在，重置密码为admin
		adminUser.Password = hashedPassword
		adminUser.IsActive = true
		
		// 使用Select指定要更新的字段，确保密码被正确更新
		if err := db.Model(&adminUser).Select("password", "is_active").Updates(map[string]interface{}{
			"password": hashedPassword,
			"is_active": true,
		}).Error; err != nil {
			return err
		}
		
		// 重新查询以获取最新数据
		if err := db.Where("username = ?", "admin").First(&adminUser).Error; err != nil {
			return err
		}

		// 确保管理员角色已分配
		var adminRole models.Role
		if err := db.Where("name = ?", "admin").First(&adminRole).Error; err != nil {
			return err
		}

		// 检查是否已有角色关联
		var existingUserRole models.UserRole
		if err := db.Where("user_id = ? AND role_id = ?", adminUser.ID, adminRole.ID).First(&existingUserRole).Error; err == gorm.ErrRecordNotFound {
			userRole := models.UserRole{
				UserID: adminUser.ID,
				RoleID: adminRole.ID,
			}
			if err := db.Create(&userRole).Error; err != nil {
				return err
			}
			log.Printf("为管理员用户分配admin角色")
		}

		log.Printf("已重置管理员用户密码: admin (密码: admin)")
		
		// 验证密码是否正确设置
		if !utils.CheckPassword("admin", adminUser.Password) {
			log.Printf("警告：admin密码验证失败，请检查密码哈希")
		} else {
			log.Printf("admin密码验证成功")
		}
	}

	return nil
}
