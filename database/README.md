# 数据库初始化说明

## 📁 目录结构

```
database/
├── mysql/
│   └── init.sql          # MySQL 初始化脚本
├── postgresql/
│   └── init.sql          # PostgreSQL 初始化脚本
└── README.md             # 本文档
```

## 📊 数据库表结构

### 1. auth_tokens (Token 表)

存储预生成的认证 Token。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 ID |
| token | VARCHAR(255) | 认证 Token，格式: `sk_xxx` |
| device_count | INT | 已激活设备数量 |
| is_active | BOOLEAN | Token 是否有效 |
| created_at | TIMESTAMP | 创建时间 |

### 2. devices (设备表)

记录每个设备的激活信息。一个 Token 可被多个设备使用。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 ID |
| token | VARCHAR(255) | 使用的 Token（外键） |
| machine_id | VARCHAR(255) | 设备机器码（SHA256 哈希，唯一） |
| device_name | VARCHAR(255) | 设备名称（可选） |
| last_active_at | TIMESTAMP | 最后活跃时间 |
| created_at | TIMESTAMP | 首次激活时间 |

### 3. sessions (会话表)

存储用户的对话会话。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 ID |
| session_id | VARCHAR(255) | 会话唯一标识 |
| machine_id | VARCHAR(255) | 所属设备机器码 |
| title | VARCHAR(255) | 会话标题 |
| created_at | TIMESTAMP | 创建时间 |
| updated_at | TIMESTAMP | 更新时间 |
| is_deleted | BOOLEAN | 是否已删除（软删除） |

### 4. messages (消息表)

存储会话中的消息记录。

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INT | 主键 ID |
| session_id | VARCHAR(255) | 所属会话 ID（外键） |
| role | ENUM/VARCHAR | 消息角色: user/assistant/system |
| content | TEXT | 消息内容 |
| created_at | TIMESTAMP | 创建时间 |

## 🔗 表关系

```
auth_tokens (1) ──────< (N) devices
                              │
                              │ machine_id
                              │
                              ▼
                        sessions (N) ──────< (N) messages
                              │                      │
                              │ session_id           │ session_id
                              │                      │
                              └──────────────────────┘
```

## 🚀 快速开始

### MySQL

```bash
# 1. 登录 MySQL
mysql -u root -p

# 2. 执行初始化脚本
source database/mysql/init.sql

# 或者直接导入
mysql -u root -p < database/mysql/init.sql
```

### PostgreSQL

```bash
# 1. 登录 PostgreSQL
psql -U postgres

# 2. 创建数据库
CREATE DATABASE ai_chat;

# 3. 连接数据库
\c ai_chat

# 4. 执行初始化脚本
\i database/postgresql/init.sql

# 或者直接导入
psql -U postgres -d ai_chat -f database/postgresql/init.sql
```

## 📋 常用操作

### 生成 Token

```sql
-- MySQL
INSERT INTO auth_tokens (token, device_count, is_active) 
VALUES ('sk_your_token_here', 0, TRUE);

-- 批量生成
INSERT INTO auth_tokens (token, device_count, is_active) VALUES
('sk_token_1', 0, TRUE),
('sk_token_2', 0, TRUE),
('sk_token_3', 0, TRUE);
```

### 查看活跃设备

```sql
SELECT * FROM v_device_stats;
```

### 查看会话统计

```sql
SELECT * FROM v_session_stats ORDER BY updated_at DESC;
```

### 禁用 Token

```sql
UPDATE auth_tokens SET is_active = FALSE WHERE token = 'sk_xxx';
```

### 清理过期数据

```sql
-- MySQL
CALL cleanup_expired_data(30);  -- 清理 30 天前的已删除数据

-- PostgreSQL
SELECT cleanup_expired_data(30);
```

## ⚠️ 注意事项

1. **外键约束**: 删除 Token 时会级联删除关联的设备记录
2. **软删除**: 会话使用软删除机制，数据不会立即丢失
3. **机器码唯一**: 每个设备只能绑定一个 Token
4. **字符集**: MySQL 建议使用 `utf8mb4` 字符集以支持 emoji

## 🔧 索引说明

| 表 | 索引 | 用途 |
|------|------|------|
| auth_tokens | idx_token | Token 快速查找 |
| auth_tokens | idx_is_active | 筛选有效 Token |
| devices | uk_machine_id | 机器码唯一约束 |
| devices | idx_token | 按设备查 Token |
| sessions | idx_machine_id | 按设备查会话 |
| sessions | idx_updated_at | 按更新时间排序 |
| messages | idx_session_id | 按会话查消息 |
