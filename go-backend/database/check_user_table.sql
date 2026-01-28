-- 检查users表结构的SQL脚本

USE k8s_platform;

-- 1. 检查users表是否存在
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN '✓ users表存在'
        ELSE '✗ users表不存在'
    END as table_status
FROM information_schema.tables 
WHERE table_schema = DATABASE() 
AND table_name = 'users';

-- 2. 查看users表的完整结构
SELECT 
    column_name as '字段名',
    data_type as '数据类型',
    character_maximum_length as '最大长度',
    is_nullable as '允许NULL',
    column_default as '默认值',
    column_key as '键类型',
    extra as '额外信息'
FROM information_schema.columns
WHERE table_schema = DATABASE()
AND table_name = 'users'
ORDER BY ordinal_position;

-- 3. 检查admin用户是否存在
SELECT 
    CASE 
        WHEN COUNT(*) > 0 THEN CONCAT('✓ admin用户存在 (ID: ', id, ')')
        ELSE '✗ admin用户不存在'
    END as user_status,
    id,
    username,
    email,
    name,
    is_active,
    LENGTH(password) as password_hash_length,
    created_at,
    updated_at
FROM users
WHERE username = 'admin';

-- 4. 检查admin用户的角色分配
SELECT 
    u.id as user_id,
    u.username,
    r.id as role_id,
    r.name as role_name,
    r.display_name as role_display_name,
    ur.created_at as role_assigned_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
WHERE u.username = 'admin';

-- 5. 检查所有用户及其角色
SELECT 
    u.id,
    u.username,
    u.email,
    u.is_active,
    GROUP_CONCAT(r.name SEPARATOR ', ') as roles,
    u.created_at
FROM users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
LEFT JOIN roles r ON ur.role_id = r.id
GROUP BY u.id, u.username, u.email, u.is_active, u.created_at
ORDER BY u.created_at DESC;

-- 6. 检查表索引
SELECT 
    index_name as '索引名',
    column_name as '字段名',
    non_unique as '非唯一',
    seq_in_index as '索引顺序'
FROM information_schema.statistics
WHERE table_schema = DATABASE()
AND table_name = 'users'
ORDER BY index_name, seq_in_index;
