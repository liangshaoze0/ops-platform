-- DevOps自动化运维平台数据库初始化脚本

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS k8s_platform CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- 使用数据库
USE k8s_platform;

-- 注意：表结构将由GORM的AutoMigrate自动创建
-- 如果需要手动创建，可以参考以下结构：

-- 用户表
-- CREATE TABLE IF NOT EXISTS users (
--     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--     created_at DATETIME(3) NULL,
--     updated_at DATETIME(3) NULL,
--     deleted_at DATETIME(3) NULL,
--     github_id BIGINT NOT NULL UNIQUE,
--     username VARCHAR(255) NOT NULL,
--     email VARCHAR(255),
--     avatar_url VARCHAR(512),
--     name VARCHAR(255),
--     bio TEXT,
--     company VARCHAR(255),
--     location VARCHAR(255),
--     github_url VARCHAR(512),
--     access_token TEXT,
--     INDEX idx_users_deleted_at (deleted_at)
-- );

-- 会话表
-- CREATE TABLE IF NOT EXISTS sessions (
--     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--     created_at DATETIME(3) NULL,
--     updated_at DATETIME(3) NULL,
--     deleted_at DATETIME(3) NULL,
--     user_id BIGINT UNSIGNED NOT NULL,
--     token VARCHAR(255) NOT NULL UNIQUE,
--     expires_at DATETIME NOT NULL,
--     user_agent VARCHAR(512),
--     ip_address VARCHAR(45),
--     INDEX idx_sessions_user_id (user_id),
--     INDEX idx_sessions_expires_at (expires_at),
--     INDEX idx_sessions_deleted_at (deleted_at),
--     FOREIGN KEY (user_id) REFERENCES users(id)
-- );

-- AI图片表
-- CREATE TABLE IF NOT EXISTS ai_images (
--     id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
--     created_at DATETIME(3) NULL,
--     updated_at DATETIME(3) NULL,
--     deleted_at DATETIME(3) NULL,
--     user_id BIGINT UNSIGNED NOT NULL,
--     type VARCHAR(50) NOT NULL,
--     prompt TEXT,
--     image_url TEXT NOT NULL,
--     thumbnail_url TEXT,
--     width INT,
--     height INT,
--     is_active BOOLEAN DEFAULT TRUE,
--     INDEX idx_ai_images_user_id (user_id),
--     INDEX idx_ai_images_deleted_at (deleted_at),
--     FOREIGN KEY (user_id) REFERENCES users(id)
-- );
