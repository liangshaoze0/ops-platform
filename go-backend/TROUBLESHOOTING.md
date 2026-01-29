# 故障排查指南

## admin用户登录问题

如果使用 `admin/admin` 无法登录，请按以下步骤排查：

### 1. 检查admin用户是否存在

访问调试接口（仅开发环境）：
```bash
GET http://localhost:8080/debug/admin
```

这会返回admin用户的详细信息，包括密码验证测试结果。

### 2. 手动重置admin密码

如果密码验证失败，可以：

**方法1：重启服务**
系统启动时会自动重置admin密码为`admin`。

**方法2：使用SQL直接重置**
```sql
-- 连接到数据库
USE k8s_platform;

-- 查看当前admin用户
SELECT id, username, email, is_active, LENGTH(password) as pwd_len 
FROM users 
WHERE username = 'admin';

-- 手动更新密码（需要先加密）
-- 注意：这需要先运行Go程序生成bcrypt哈希
```

**方法3：运行重置密码脚本（推荐）**
```bash
cd go-backend
# 重置为默认密码 admin
go run scripts/reset_admin_password.go

# 或者重置为自定义密码
go run scripts/reset_admin_password.go your_new_password
```

**方法4：运行测试脚本**
```bash
cd go-backend
go run scripts/test_admin_login.go
```

### 3. 检查常见问题

1. **用户未激活**
   - 检查 `is_active` 字段是否为 `true`
   - SQL: `UPDATE users SET is_active = true WHERE username = 'admin';`

2. **密码哈希被截断**
   - bcrypt哈希应该是60字符
   - 检查数据库字段大小是否足够
   - SQL: `SELECT LENGTH(password) FROM users WHERE username = 'admin';`

3. **用户被软删除**
   - GORM的软删除会隐藏用户
   - 检查 `deleted_at` 字段是否为NULL

### 4. 验证密码哈希

```go
// 在Go代码中测试
import "develops-ai/internal/utils"

hash, _ := utils.HashPassword("admin")
fmt.Println("哈希长度:", len(hash))
fmt.Println("验证结果:", utils.CheckPassword("admin", hash))
```

### 5. 数据库直接检查

```sql
-- 查看admin用户完整信息
SELECT * FROM users WHERE username = 'admin';

-- 检查角色分配
SELECT u.username, r.name as role_name 
FROM users u
JOIN user_roles ur ON u.id = ur.user_id
JOIN roles r ON ur.role_id = r.id
WHERE u.username = 'admin';
```

## 常见错误

### "用户名或密码错误"
- 检查用户名是否正确（区分大小写）
- 检查密码是否正确
- 检查用户是否存在且未删除
- 检查用户是否激活

### "用户账号已被禁用"
- 检查 `is_active` 字段
- 使用SQL: `UPDATE users SET is_active = true WHERE username = 'admin';`

### "查询用户失败"
- 检查数据库连接
- 检查表是否存在
- 检查数据库权限
