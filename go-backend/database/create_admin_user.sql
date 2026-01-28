-- 创建admin管理员用户的SQL脚本
-- 使用前请确保已创建数据库和roles表

USE k8s_platform;

-- 检查并创建admin角色（如果不存在）
INSERT INTO roles (name, display_name, description, permissions, is_system, created_at, updated_at)
SELECT 'admin', '管理员', '系统管理员，拥有所有权限', '["*"]', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin');

-- 检查并创建user角色（如果不存在）
INSERT INTO roles (name, display_name, description, permissions, is_system, created_at, updated_at)
SELECT 'user', '普通用户', '普通用户，拥有基本权限', '["user:read", "user:update", "ai:create", "ai:read"]', true, NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'user');

-- 获取admin角色的ID
SET @admin_role_id = (SELECT id FROM roles WHERE name = 'admin' LIMIT 1);

-- 删除已存在的admin用户（如果需要重置）
-- DELETE FROM user_roles WHERE user_id IN (SELECT id FROM users WHERE username = 'admin');
-- DELETE FROM users WHERE username = 'admin';

-- 创建admin用户
-- 注意：密码哈希是 'admin' 的bcrypt哈希值
-- 这里使用一个示例哈希，实际使用时应该通过Go程序生成
-- 密码: admin
-- 哈希: $2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy (示例，请使用实际生成的哈希)

-- 方法1：如果users表已存在，直接插入或更新
INSERT INTO users (username, email, password, name, is_active, created_at, updated_at)
VALUES (
    'admin',
    'admin@devops-platform.com',
    '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', -- 这是 'admin' 的bcrypt哈希示例
    '系统管理员',
    true,
    NOW(),
    NOW()
)
ON DUPLICATE KEY UPDATE
    password = VALUES(password),
    is_active = true,
    updated_at = NOW();

-- 获取admin用户的ID
SET @admin_user_id = (SELECT id FROM users WHERE username = 'admin' LIMIT 1);

-- 分配admin角色给admin用户
INSERT INTO user_roles (user_id, role_id, created_at, updated_at)
SELECT @admin_user_id, @admin_role_id, NOW(), NOW()
WHERE NOT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = @admin_user_id AND role_id = @admin_role_id
);

-- 验证创建结果
SELECT 
    u.id,
    u.username,
    u.email,
    u.name,
    u.is_active,
    r.name as role_name,
    r.display_name as role_display_name
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.username = 'admin';
