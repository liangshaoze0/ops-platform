package database

import (
	"fmt"
	"log"

	"develops-ai/internal/config"
	"develops-ai/internal/models"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func InitDB(cfg *config.Config) (*gorm.DB, error) {
	// 添加sql_mode参数，允许某些字段没有默认值（在严格模式下）
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local&sql_mode=TRADITIONAL",
		cfg.Database.User,
		cfg.Database.Password,
		cfg.Database.Host,
		cfg.Database.Port,
		cfg.Database.DBName,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, fmt.Errorf("连接数据库失败: %w", err)
	}

	// 设置MySQL的sql_mode，允许某些字段为空
	// 这样可以避免"Field 'code' doesn't have a default value"错误
	if err := db.Exec("SET SESSION sql_mode = 'TRADITIONAL'").Error; err != nil {
		log.Printf("设置sql_mode失败: %v", err)
	}

	// 自动迁移
	if err := autoMigrate(db); err != nil {
		return nil, fmt.Errorf("数据库迁移失败: %w", err)
	}

	// 初始化默认数据（管理员用户和角色）
	if err := InitDefaultData(db); err != nil {
		log.Printf("初始化默认数据失败: %v", err)
		// 不返回错误，允许系统继续运行
	}

	log.Println("数据库连接成功")
	return db, nil
}

func autoMigrate(db *gorm.DB) error {
	// 检查并修复user_roles表（如果存在旧结构）
	if needsRebuild := checkUserRolesTable(db); needsRebuild {
		log.Println("检测到user_roles表结构不正确，将删除重建...")
		// 删除旧表，让GORM重新创建
		if err := db.Exec("DROP TABLE IF EXISTS user_roles").Error; err != nil {
			log.Printf("删除user_roles表失败: %v", err)
		} else {
			log.Println("已删除旧的user_roles表")
		}
	}

	// 修复audit_logs表的数据（如果存在）
	fixAuditLogsTable(db)

	// 检查并修复可能存在的code字段问题
	fixCodeFieldIssue(db)

	return db.AutoMigrate(
		&models.User{},
		&models.Session{},
		&models.AIImage{},
		&models.Role{},
		&models.UserRole{},
		&models.AuditLog{},
		&models.UserPreference{},
		&models.K8sCluster{},
	)
}

// fixCodeFieldIssue 修复code字段问题
// 如果数据库中存在code字段但模型中没有，尝试删除该字段或设置默认值
func fixCodeFieldIssue(db *gorm.DB) {
	tables := []string{"users", "sessions", "ai_images", "roles", "user_roles", "audit_logs"}
	
	for _, tableName := range tables {
		// 检查表是否存在code字段
		var hasCode int64
		if err := db.Raw(`
			SELECT COUNT(*) 
			FROM information_schema.columns 
			WHERE table_schema = DATABASE() 
			AND table_name = ? 
			AND column_name = 'code'
		`, tableName).Scan(&hasCode).Error; err != nil {
			continue
		}

		if hasCode > 0 {
			log.Printf("检测到表 %s 存在code字段，但模型中没有定义，尝试删除...", tableName)
			// 尝试删除code字段
			if err := db.Exec(fmt.Sprintf("ALTER TABLE %s DROP COLUMN code", tableName)).Error; err != nil {
				log.Printf("删除表 %s 的code字段失败: %v", tableName, err)
				// 如果删除失败，尝试设置默认值
				if err := db.Exec(fmt.Sprintf("ALTER TABLE %s MODIFY COLUMN code VARCHAR(255) DEFAULT ''", tableName)).Error; err != nil {
					log.Printf("设置表 %s 的code字段默认值失败: %v", tableName, err)
				}
			} else {
				log.Printf("已删除表 %s 的code字段", tableName)
			}
		}
	}
}

// fixAuditLogsTable 修复audit_logs表的数据
func fixAuditLogsTable(db *gorm.DB) {
	// 检查表是否存在
	var count int64
	if err := db.Raw("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'audit_logs'").Scan(&count).Error; err != nil {
		return
	}

	if count == 0 {
		// 表不存在，直接返回
		return
	}

	// 检查resource_id列的数据类型
	var columnType string
	if err := db.Raw(`
		SELECT DATA_TYPE 
		FROM information_schema.columns 
		WHERE table_schema = DATABASE() 
		AND table_name = 'audit_logs' 
		AND column_name = 'resource_id'
	`).Scan(&columnType).Error; err != nil {
		// 列不存在，不需要修复
		return
	}

	// 如果列类型不是bigint，说明需要修复数据
	if columnType != "bigint" && columnType != "" {
		log.Println("检测到audit_logs表的resource_id列类型不正确，正在清理无效数据...")
		
		// 删除包含无效resource_id的记录（空字符串或NULL）
		// 使用更安全的方式：先检查再删除
		if err := db.Exec(`
			DELETE FROM audit_logs 
			WHERE resource_id = '' 
			OR resource_id IS NULL
			OR CAST(resource_id AS CHAR) = ''
		`).Error; err != nil {
			log.Printf("清理audit_logs无效数据失败: %v", err)
		} else {
			log.Println("已清理audit_logs表中的无效数据")
		}
	} else if columnType == "bigint" {
		// 即使类型正确，也可能有无效数据，清理一下
		if err := db.Exec(`
			UPDATE audit_logs 
			SET resource_id = 0 
			WHERE resource_id IS NULL
		`).Error; err != nil {
			// 忽略错误，可能列不允许NULL
			log.Printf("更新audit_logs NULL值失败（可忽略）: %v", err)
		}
	}
}

// checkUserRolesTable 检查user_roles表是否需要重建
func checkUserRolesTable(db *gorm.DB) bool {
	// 检查表是否存在
	var count int64
	if err := db.Raw("SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'user_roles'").Scan(&count).Error; err != nil {
		// 查询失败，假设需要重建
		return true
	}

	if count == 0 {
		// 表不存在，不需要重建
		return false
	}

	// 检查表是否有id字段
	var hasID int64
	if err := db.Raw(`
		SELECT COUNT(*) 
		FROM information_schema.columns 
		WHERE table_schema = DATABASE() 
		AND table_name = 'user_roles' 
		AND column_name = 'id'
	`).Scan(&hasID).Error; err != nil {
		// 查询失败，假设需要重建
		return true
	}

	if hasID == 0 {
		// 表存在但没有id字段，需要重建
		return true
	}

	// 检查主键数量（应该只有1个）
	var pkCount int64
	if err := db.Raw(`
		SELECT COUNT(*) 
		FROM information_schema.table_constraints 
		WHERE table_schema = DATABASE() 
		AND table_name = 'user_roles' 
		AND constraint_type = 'PRIMARY KEY'
	`).Scan(&pkCount).Error; err != nil {
		// 查询失败，假设需要重建
		return true
	}

	if pkCount != 1 {
		// 主键数量不对，需要重建
		return true
	}

	// 表结构正确，不需要重建
	return false
}
