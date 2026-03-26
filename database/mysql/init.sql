-- ===========================================
-- AI Chat Assistant - MySQL 数据库初始化脚本
-- ===========================================
-- 版本: 1.0.0
-- 数据库: ai_chat
-- 字符集: utf8mb4
-- ===========================================

-- 创建数据库（如果不存在）
CREATE DATABASE IF NOT EXISTS ai_chat 
    CHARACTER SET utf8mb4 
    COLLATE utf8mb4_unicode_ci;

USE ai_chat;

-- ===========================================
-- 1. Token 表 (auth_tokens)
-- 用途: 存储预生成的认证 Token
-- ===========================================
DROP TABLE IF EXISTS auth_tokens;
CREATE TABLE auth_tokens (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    token VARCHAR(255) NOT NULL COMMENT '认证Token，格式: sk_xxx',
    device_count INT DEFAULT 0 COMMENT '已激活设备数量',
    is_active BOOLEAN DEFAULT TRUE COMMENT 'Token是否有效',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    UNIQUE KEY uk_token (token),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Token认证表';

-- ===========================================
-- 2. 设备表 (devices)
-- 用途: 记录每个设备的激活信息
-- 说明: 一个 Token 可被多个设备使用
-- ===========================================
DROP TABLE IF EXISTS devices;
CREATE TABLE devices (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    token VARCHAR(255) NOT NULL COMMENT '使用的Token',
    machine_id VARCHAR(255) NOT NULL COMMENT '设备机器码(SHA256哈希)',
    device_name VARCHAR(255) DEFAULT NULL COMMENT '设备名称(可选)',
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后活跃时间',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '首次激活时间',
    
    UNIQUE KEY uk_machine_id (machine_id),
    INDEX idx_token (token),
    INDEX idx_last_active_at (last_active_at),
    
    FOREIGN KEY (token) REFERENCES auth_tokens(token) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='设备信息表';

-- ===========================================
-- 3. 会话表 (sessions)
-- 用途: 存储用户的对话会话
-- ===========================================
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    session_id VARCHAR(255) NOT NULL COMMENT '会话唯一标识',
    machine_id VARCHAR(255) NOT NULL COMMENT '所属设备机器码',
    title VARCHAR(255) DEFAULT '新对话' COMMENT '会话标题',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    is_deleted BOOLEAN DEFAULT FALSE COMMENT '是否已删除(软删除)',
    
    UNIQUE KEY uk_session_id (session_id),
    INDEX idx_machine_id (machine_id),
    INDEX idx_updated_at (updated_at),
    INDEX idx_is_deleted (is_deleted)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='会话表';

-- ===========================================
-- 4. 消息表 (messages)
-- 用途: 存储会话中的消息记录
-- ===========================================
DROP TABLE IF EXISTS messages;
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY COMMENT '主键ID',
    session_id VARCHAR(255) NOT NULL COMMENT '所属会话ID',
    role ENUM('user', 'assistant', 'system') NOT NULL COMMENT '消息角色',
    content TEXT NOT NULL COMMENT '消息内容',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    
    INDEX idx_session_id (session_id),
    INDEX idx_created_at (created_at),
    
    FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='消息表';

-- ===========================================
-- 初始化数据
-- ===========================================

-- 插入测试 Token (可选)
-- INSERT INTO auth_tokens (token, device_count, is_active) VALUES ('sk_test_token_for_development', 0, TRUE);

-- ===========================================
-- 视图: 活跃设备统计
-- ===========================================
CREATE OR REPLACE VIEW v_device_stats AS
SELECT 
    t.id AS token_id,
    t.token,
    t.device_count,
    t.is_active,
    t.created_at AS token_created_at,
    COUNT(d.id) AS actual_device_count,
    MAX(d.last_active_at) AS last_device_active
FROM auth_tokens t
LEFT JOIN devices d ON t.token = d.token
GROUP BY t.id, t.token, t.device_count, t.is_active, t.created_at;

-- ===========================================
-- 视图: 会话消息统计
-- ===========================================
CREATE OR REPLACE VIEW v_session_stats AS
SELECT 
    s.id,
    s.session_id,
    s.machine_id,
    s.title,
    s.created_at,
    s.updated_at,
    COUNT(m.id) AS message_count
FROM sessions s
LEFT JOIN messages m ON s.session_id = m.session_id
WHERE s.is_deleted = FALSE
GROUP BY s.id, s.session_id, s.machine_id, s.title, s.created_at, s.updated_at;

-- ===========================================
-- 存储过程: 清理过期数据
-- ===========================================
DELIMITER //
CREATE PROCEDURE cleanup_expired_data(IN days_to_keep INT)
BEGIN
    -- 清理已删除的会话及其消息
    DELETE FROM sessions 
    WHERE is_deleted = TRUE 
    AND updated_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    -- 清理未激活的 Token (可选)
    -- DELETE FROM auth_tokens 
    -- WHERE is_active = FALSE 
    -- AND created_at < DATE_SUB(NOW(), INTERVAL days_to_keep DAY);
    
    SELECT CONCAT('Cleanup completed. Removed sessions deleted more than ', days_to_keep, ' days ago.') AS result;
END //
DELIMITER ;

-- ===========================================
-- 完成
-- ===========================================
SELECT 'Database initialization completed!' AS status;
SELECT 
    (SELECT COUNT(*) FROM auth_tokens) AS tokens_count,
    (SELECT COUNT(*) FROM devices) AS devices_count,
    (SELECT COUNT(*) FROM sessions WHERE is_deleted = FALSE) AS active_sessions,
    (SELECT COUNT(*) FROM messages) AS messages_count;
