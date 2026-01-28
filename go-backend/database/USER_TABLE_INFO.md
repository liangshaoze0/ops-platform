# Users表结构信息

## 表结构

根据 `go-backend/internal/models/user.go` 中的定义，users表结构如下：

```sql
CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    created_at DATETIME(3) NULL,
    updated_at DATETIME(3) NULL,
    deleted_at DATETIME(3) NULL,
    username VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255) NOT NULL,  -- bcrypt哈希，60字符
    name VARCHAR(255),
    avatar_url VARCHAR(512),
    bio TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    INDEX idx_users_deleted_at (deleted_at),
    INDEX idx_users_username (username),
    INDEX idx_users_email (email)
);
```

## 字段说明

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| id | BIGINT UNSIGNED | 主键，自增 | PRIMARY KEY |
| created_at | DATETIME(3) | 创建时间 | NULL |
| updated_at | DATETIME(3) | 更新时间 | NULL |
| deleted_at | DATETIME(3) | 软删除时间 | NULL, INDEX |
| username | VARCHAR(255) | 用户名 | NOT NULL, UNIQUE |
| email | VARCHAR(255) | 邮箱 | UNIQUE |
| password | VARCHAR(255) | 密码哈希(bcrypt) | NOT NULL |
| name | VARCHAR(255) | 显示名称 | NULL |
| avatar_url | VARCHAR(512) | 头像URL | NULL |
| bio | TEXT | 个人简介 | NULL |
| is_active | BOOLEAN | 是否激活 | DEFAULT TRUE |

## Admin用户信息

### 默认账号信息
- **用户名**: `admin`
- **密码**: `admin`
- **邮箱**: `admin@devops-platform.com`
- **显示名称**: `系统管理员`
- **状态**: `激活 (is_active = true)`
- **角色**: `admin` (拥有所有权限)

### 创建方式

#### 方式1：通过Go程序自动创建（推荐）
系统启动时会自动调用 `InitDefaultData` 函数创建admin用户。

#### 方式2：通过SQL脚本创建
执行 `database/create_admin_user.sql` 脚本。

#### 方式3：手动生成密码哈希后创建
1. 运行 `go run scripts/generate_admin_hash.go` 生成密码哈希
2. 使用生成的哈希值执行SQL插入语句

## 检查表结构

执行 `database/check_user_table.sql` 可以检查：
- users表是否存在
- 表结构是否完整
- admin用户是否存在
- admin用户的角色分配
- 所有用户及其角色信息

## 密码哈希说明

- 使用 bcrypt 算法加密
- 默认 cost 为 10
- 哈希长度通常为 60 字符
- 每次生成的哈希值不同，但都能验证同一密码

## 相关文件

- 模型定义: `go-backend/internal/models/user.go`
- 初始化逻辑: `go-backend/pkg/database/init_data.go`
- 密码工具: `go-backend/internal/utils/password.go`
- 检查脚本: `go-backend/database/check_user_table.sql`
- 创建脚本: `go-backend/database/create_admin_user.sql`
- 哈希生成工具: `go-backend/scripts/generate_admin_hash.go`
