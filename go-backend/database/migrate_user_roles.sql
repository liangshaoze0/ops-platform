-- 修复user_roles表结构的迁移脚本
-- 如果表已存在但结构不对，执行此脚本

-- 检查并删除旧的主键约束（如果存在）
SET @exist := (SELECT COUNT(*) FROM information_schema.table_constraints 
               WHERE table_schema = DATABASE() 
               AND table_name = 'user_roles' 
               AND constraint_type = 'PRIMARY KEY');

SET @sqlstmt := IF(@exist > 0, 
    'ALTER TABLE user_roles DROP PRIMARY KEY', 
    'SELECT "No primary key to drop"');
PREPARE stmt FROM @sqlstmt;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- 检查id字段是否存在
SET @has_id := (SELECT COUNT(*) FROM information_schema.columns 
                WHERE table_schema = DATABASE() 
                AND table_name = 'user_roles' 
                AND column_name = 'id');

-- 如果不存在id字段，添加它
SET @sqlstmt2 := IF(@has_id = 0, 
    'ALTER TABLE user_roles ADD id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY FIRST', 
    'SELECT "id column already exists"');
PREPARE stmt2 FROM @sqlstmt2;
EXECUTE stmt2;
DEALLOCATE PREPARE stmt2;

-- 添加created_at和updated_at字段（如果不存在）
ALTER TABLE user_roles 
ADD COLUMN IF NOT EXISTS created_at DATETIME(3) NULL,
ADD COLUMN IF NOT EXISTS updated_at DATETIME(3) NULL,
ADD COLUMN IF NOT EXISTS deleted_at DATETIME(3) NULL;

-- 添加唯一索引（如果不存在）
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_role ON user_roles(user_id, role_id);
