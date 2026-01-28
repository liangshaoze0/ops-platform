package main

import (
	"fmt"
	"log"

	"develops-ai/internal/utils"
)

func main() {
	// 生成admin密码的bcrypt哈希
	password := "admin"
	hash, err := utils.HashPassword(password)
	if err != nil {
		log.Fatalf("生成密码哈希失败: %v", err)
	}

	fmt.Println("============================================================")
	fmt.Println("Admin用户密码哈希生成")
	fmt.Println("============================================================")
	fmt.Printf("用户名: %s\n", "admin")
	fmt.Printf("密码: %s\n", password)
	fmt.Printf("密码哈希: %s\n", hash)
	fmt.Printf("哈希长度: %d\n", len(hash))
	fmt.Println("============================================================")
	fmt.Println("\nSQL插入语句:")
	fmt.Println("-- 使用以下SQL创建admin用户:")
	fmt.Printf("INSERT INTO users (username, email, password, name, is_active, created_at, updated_at)\n")
	fmt.Printf("VALUES ('admin', 'admin@devops-platform.com', '%s', '系统管理员', true, NOW(), NOW())\n", hash)
	fmt.Printf("ON DUPLICATE KEY UPDATE password = VALUES(password), is_active = true, updated_at = NOW();\n")
	fmt.Println("============================================================")
	
	// 验证哈希
	isValid := utils.CheckPassword(password, hash)
	fmt.Printf("\n密码验证测试: %v\n", isValid)
	if isValid {
		fmt.Println("✓ 密码哈希验证成功！")
	} else {
		fmt.Println("✗ 密码哈希验证失败！")
	}
}
