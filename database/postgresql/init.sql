-- ===========================================
-- AI Chat Assistant - PostgreSQL 数据库初始化脚本
-- ===========================================
-- 版本: 1.0.0
-- 数据库: ai_chat
-- ===========================================

-- 创建数据库（需要超级用户权限，可手动执行）
-- CREATE DATABASE ai_chat WITH ENCODING 'UTF8';

-- 连接到数据库后执行以下语句
-- \c ai_chat;

-- ===========================================
-- 1. Token 表 (auth_tokens)
-- 用途: 存储预生成的认证 Token
-- ===========================================
DROP TABLE IF EXISTS auth_tokens CASCADE;
CREATE TABLE auth_tokens (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL UNIQUE,
    device_count INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_auth_tokens_is_active ON auth_tokens(is_active);
CREATE INDEX idx_auth_tokens_created_at ON auth_tokens(created_at);

-- 注释
COMMENT ON TABLE auth_tokens IS 'Token认证表';
COMMENT ON COLUMN auth_tokens.id IS '主键ID';
COMMENT ON COLUMN auth_tokens.token IS '认证Token，格式: sk_xxx';
COMMENT ON COLUMN auth_tokens.device_count IS '已激活设备数量';
COMMENT ON COLUMN auth_tokens.is_active IS 'Token是否有效';
COMMENT ON COLUMN auth_tokens.created_at IS '创建时间';

-- ===========================================
-- 2. 设备表 (devices)
-- 用途: 记录每个设备的激活信息
-- 说明: 一个 Token 可被多个设备使用
-- ===========================================
DROP TABLE IF EXISTS devices CASCADE;
CREATE TABLE devices (
    id SERIAL PRIMARY KEY,
    token VARCHAR(255) NOT NULL REFERENCES auth_tokens(token) ON DELETE CASCADE ON UPDATE CASCADE,
    machine_id VARCHAR(255) NOT NULL UNIQUE,
    device_name VARCHAR(255) DEFAULT NULL,
    last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_devices_token ON devices(token);
CREATE INDEX idx_devices_last_active_at ON devices(last_active_at);

-- 注释
COMMENT ON TABLE devices IS '设备信息表';
COMMENT ON COLUMN devices.id IS '主键ID';
COMMENT ON COLUMN devices.token IS '使用的Token';
COMMENT ON COLUMN devices.machine_id IS '设备机器码(SHA256哈希)';
COMMENT ON COLUMN devices.device_name IS '设备名称(可选)';
COMMENT ON COLUMN devices.last_active_at IS '最后活跃时间';
COMMENT ON COLUMN devices.created_at IS '首次激活时间';

-- ===========================================
-- 3. 会话表 (sessions)
-- 用途: 存储用户的对话会话
-- ===========================================
DROP TABLE IF EXISTS sessions CASCADE;
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL UNIQUE,
    machine_id VARCHAR(255) NOT NULL,
    title VARCHAR(255) DEFAULT '新对话',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT FALSE
);

-- 索引
CREATE INDEX idx_sessions_machine_id ON sessions(machine_id);
CREATE INDEX idx_sessions_updated_at ON sessions(updated_at);
CREATE INDEX idx_sessions_is_deleted ON sessions(is_deleted);

-- 注释
COMMENT ON TABLE sessions IS '会话表';
COMMENT ON COLUMN sessions.id IS '主键ID';
COMMENT ON COLUMN sessions.session_id IS '会话唯一标识';
COMMENT ON COLUMN sessions.machine_id IS '所属设备机器码';
COMMENT ON COLUMN sessions.title IS '会话标题';
COMMENT ON COLUMN sessions.created_at IS '创建时间';
COMMENT ON COLUMN sessions.updated_at IS '更新时间';
COMMENT ON COLUMN sessions.is_deleted IS '是否已删除(软删除)';

-- 自动更新 updated_at 触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_sessions_updated_at 
    BEFORE UPDATE ON sessions 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- ===========================================
-- 4. 消息表 (messages)
-- 用途: 存储会话中的消息记录
-- ===========================================
DROP TABLE IF EXISTS messages CASCADE;
CREATE TABLE messages (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL REFERENCES sessions(session_id) ON DELETE CASCADE ON UPDATE CASCADE,
    role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_messages_session_id ON messages(session_id);
CREATE INDEX idx_messages_created_at ON messages(created_at);

-- 注释
COMMENT ON TABLE messages IS '消息表';
COMMENT ON COLUMN messages.id IS '主键ID';
COMMENT ON COLUMN messages.session_id IS '所属会话ID';
COMMENT ON COLUMN messages.role IS '消息角色';
COMMENT ON COLUMN messages.content IS '消息内容';
COMMENT ON COLUMN messages.created_at IS '创建时间';

-- ===========================================
-- 5. 知识库表 (knowledge_entries)
-- 用途: 存储知识库条目，支持动态管理
-- ===========================================
DROP TABLE IF EXISTS knowledge_entries CASCADE;

-- 创建枚举类型
CREATE TYPE knowledge_category AS ENUM ('book', 'study', 'other');

CREATE TABLE knowledge_entries (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    category knowledge_category NOT NULL DEFAULT 'other',
    tags VARCHAR(500) DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 索引
CREATE INDEX idx_knowledge_category ON knowledge_entries(category);
CREATE INDEX idx_knowledge_is_active ON knowledge_entries(is_active);
CREATE INDEX idx_knowledge_sort_order ON knowledge_entries(sort_order);

-- 全文搜索索引
CREATE INDEX idx_knowledge_content_search ON knowledge_entries USING gin(to_tsvector('chinese', title || ' ' || content));

-- 注释
COMMENT ON TABLE knowledge_entries IS '知识库条目表';
COMMENT ON COLUMN knowledge_entries.id IS '主键ID';
COMMENT ON COLUMN knowledge_entries.title IS '知识标题';
COMMENT ON COLUMN knowledge_entries.content IS '知识内容';
COMMENT ON COLUMN knowledge_entries.category IS '分类：图书/学习/其他';
COMMENT ON COLUMN knowledge_entries.tags IS '标签，逗号分隔';
COMMENT ON COLUMN knowledge_entries.is_active IS '是否启用';
COMMENT ON COLUMN knowledge_entries.sort_order IS '排序顺序';

-- 更新时间触发器
CREATE TRIGGER update_knowledge_entries_updated_at 
    BEFORE UPDATE ON knowledge_entries 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

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
-- 函数: 清理过期数据
-- ===========================================
CREATE OR REPLACE FUNCTION cleanup_expired_data(days_to_keep INT)
RETURNS TEXT AS $$
DECLARE
    deleted_sessions INT;
BEGIN
    -- 清理已删除的会话及其消息
    DELETE FROM sessions 
    WHERE is_deleted = TRUE 
    AND updated_at < CURRENT_TIMESTAMP - (days_to_keep || ' days')::INTERVAL;
    
    GET DIAGNOSTICS deleted_sessions = ROW_COUNT;
    
    RETURN format('Cleanup completed. Removed %s sessions deleted more than %s days ago.', 
                  deleted_sessions, days_to_keep);
END;
$$ LANGUAGE plpgsql;

-- ===========================================
-- 初始化数据
-- ===========================================

-- 插入测试 Token (可选)
-- INSERT INTO auth_tokens (token, device_count, is_active) VALUES ('sk_test_token_for_development', 0, TRUE);

-- ===========================================
-- 完成
-- ===========================================
SELECT 'Database initialization completed!' AS status;
SELECT 
    (SELECT COUNT(*) FROM auth_tokens) AS tokens_count,
    (SELECT COUNT(*) FROM devices) AS devices_count,
    (SELECT COUNT(*) FROM sessions WHERE is_deleted = FALSE) AS active_sessions,
    (SELECT COUNT(*) FROM messages) AS messages_count;
