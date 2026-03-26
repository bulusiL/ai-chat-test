/**
 * 数据库配置
 * 支持 MySQL 和 PostgreSQL
 */

import mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';

// 数据库配置接口
export interface DatabaseConfig {
  type: 'mysql' | 'postgresql';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

// MySQL 连接池
let mysqlPool: mysql.Pool | null = null;

// PostgreSQL 连接池
let pgPool: PgPool | null = null;

// 从环境变量读取配置
function getDatabaseConfig(): DatabaseConfig {
  const dbType = (process.env.DB_TYPE || 'mysql').toLowerCase() as 'mysql' | 'postgresql';
  
  return {
    type: dbType,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || (dbType === 'mysql' ? '3306' : '5432')),
    database: process.env.DB_NAME || 'ai_chat',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };
}

/**
 * 获取数据库连接池
 */
export async function getPool() {
  const config = getDatabaseConfig();
  
  if (config.type === 'mysql') {
    if (!mysqlPool) {
      mysqlPool = mysql.createPool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
      });
      console.log(`MySQL 连接池已创建: ${config.host}:${config.port}/${config.database}`);
    }
    return { type: 'mysql' as const, pool: mysqlPool };
  } else {
    if (!pgPool) {
      pgPool = new PgPool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: config.username,
        password: config.password,
        max: 10,
      });
      console.log(`PostgreSQL 连接池已创建: ${config.host}:${config.port}/${config.database}`);
    }
    return { type: 'postgresql' as const, pool: pgPool };
  }
}

/**
 * 执行 SQL 查询
 */
export async function query(sql: string, params?: any[]) {
  const { type, pool } = await getPool();
  
  if (type === 'mysql') {
    const [rows] = await (pool as mysql.Pool).execute(sql, params);
    return rows;
  } else {
    const result = await (pool as PgPool).query(sql, params);
    return result.rows;
  }
}

/**
 * 执行 SQL 并返回受影响的行数
 */
export async function execute(sql: string, params?: any[]) {
  const { type, pool } = await getPool();
  
  if (type === 'mysql') {
    const [result]: any = await (pool as mysql.Pool).execute(sql, params);
    return {
      affectedRows: result.affectedRows,
      insertId: result.insertId,
    };
  } else {
    const result = await (pool as PgPool).query(sql, params);
    return {
      affectedRows: result.rowCount || 0,
      insertId: result.rows[0]?.id || null,
    };
  }
}

/**
 * 关闭数据库连接
 */
export async function closePool() {
  if (mysqlPool) {
    await mysqlPool.end();
    mysqlPool = null;
  }
  if (pgPool) {
    await pgPool.end();
    pgPool = null;
  }
}

/**
 * 测试数据库连接
 */
export async function testConnection(): Promise<{ success: boolean; message: string }> {
  try {
    const config = getDatabaseConfig();
    await query('SELECT 1');
    return {
      success: true,
      message: `数据库连接成功: ${config.type}://${config.host}:${config.port}/${config.database}`
    };
  } catch (error: any) {
    return {
      success: false,
      message: `数据库连接失败: ${error.message}`
    };
  }
}

/**
 * 初始化数据库表
 */
export async function initDatabase() {
  const config = getDatabaseConfig();
  
  if (config.type === 'mysql') {
    await initMySQLTables();
  } else {
    await initPostgreSQLTables();
  }
}

/**
 * 初始化 MySQL 表
 */
async function initMySQLTables() {
  // Token 表 - 存储预生成的 Token
  const createTokensTable = `
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(255) NOT NULL UNIQUE COMMENT '认证Token',
      device_count INT DEFAULT 0 COMMENT '已激活设备数',
      is_active BOOLEAN DEFAULT TRUE COMMENT '是否有效',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_token (token),
      INDEX idx_is_active (is_active)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='Token表';
  `;

  // 设备表 - 记录每个设备的激活信息
  const createDevicesTable = `
    CREATE TABLE IF NOT EXISTS devices (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(255) NOT NULL COMMENT '使用的Token',
      machine_id VARCHAR(255) NOT NULL COMMENT '机器码',
      device_name VARCHAR(255) DEFAULT NULL COMMENT '设备名称',
      last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '最后活跃时间',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '首次激活时间',
      UNIQUE KEY uk_machine_id (machine_id),
      INDEX idx_token (token),
      INDEX idx_machine_id (machine_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='设备表';
  `;

  // 会话表
  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL UNIQUE COMMENT '会话ID',
      machine_id VARCHAR(255) NOT NULL COMMENT '机器码',
      title VARCHAR(255) DEFAULT '新对话' COMMENT '会话标题',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      is_deleted BOOLEAN DEFAULT FALSE,
      INDEX idx_machine_id (machine_id),
      INDEX idx_session_id (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='会话表';
  `;

  // 消息表
  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL COMMENT '会话ID',
      role ENUM('user', 'assistant', 'system') NOT NULL COMMENT '角色',
      content TEXT NOT NULL COMMENT '消息内容',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_session_id (session_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息表';
  `;

  await query(createTokensTable);
  await query(createDevicesTable);
  await query(createSessionsTable);
  await query(createMessagesTable);
  
  console.log('MySQL 表初始化成功');
}

/**
 * 初始化 PostgreSQL 表
 */
async function initPostgreSQLTables() {
  const createTokensTable = `
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id SERIAL PRIMARY KEY,
      token VARCHAR(255) NOT NULL UNIQUE,
      device_count INT DEFAULT 0,
      is_active BOOLEAN DEFAULT TRUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_is_active ON auth_tokens(is_active);
  `;

  const createDevicesTable = `
    CREATE TABLE IF NOT EXISTS devices (
      id SERIAL PRIMARY KEY,
      token VARCHAR(255) NOT NULL,
      machine_id VARCHAR(255) NOT NULL UNIQUE,
      device_name VARCHAR(255),
      last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_devices_token ON devices(token);
    CREATE INDEX IF NOT EXISTS idx_devices_machine_id ON devices(machine_id);
  `;

  const createSessionsTable = `
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL UNIQUE,
      machine_id VARCHAR(255) NOT NULL,
      title VARCHAR(255) DEFAULT '新对话',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_deleted BOOLEAN DEFAULT FALSE
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_machine_id ON sessions(machine_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id);
  `;

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL,
      role VARCHAR(20) NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
      content TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages(session_id);
  `;

  await query(createTokensTable);
  await query(createDevicesTable);
  await query(createSessionsTable);
  await query(createMessagesTable);
  
  console.log('PostgreSQL 表初始化成功');
}

/**
 * 获取数据库操作对象（统一接口）
 */
export function getDb() {
  return {
    query: async (sql: string, params?: unknown[]) => {
      const { type, pool } = await getPool();
      
      if (type === 'mysql') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [rows] = await (pool as any).execute(sql, params);
        return { rows: rows as Record<string, unknown>[], rowCount: Array.isArray(rows) ? rows.length : 0 };
      } else {
        const result = await (pool as PgPool).query(sql, params);
        return { rows: result.rows, rowCount: result.rowCount ?? 0 };
      }
    },
    execute: async (sql: string, params?: unknown[]) => {
      const { type, pool } = await getPool();
      
      if (type === 'mysql') {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const [result] = await (pool as any).execute(sql, params);
        const header = result as mysql.ResultSetHeader;
        return { affectedRows: header.affectedRows, insertId: header.insertId };
      } else {
        const result = await (pool as PgPool).query(sql, params);
        return { affectedRows: result.rowCount ?? 0, insertId: result.rows[0]?.id ?? null };
      }
    }
  };
}

export const Database = {
  getPool,
  query,
  execute,
  closePool,
  initDatabase,
  testConnection,
  getDatabaseConfig,
};
