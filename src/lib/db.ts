/**
 * 数据库配置
 * 支持 MySQL、PostgreSQL 和内存存储（降级方案）
 */

import mysql from 'mysql2/promise';
import { Pool as PgPool } from 'pg';

// 数据库配置接口
export interface DatabaseConfig {
  type: 'mysql' | 'postgresql' | 'memory';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
}

// ============ 内存存储 ============
interface MemoryToken {
  id: number;
  token: string;
  is_used: boolean;
  created_at: Date;
  used_at: Date | null;
}

interface MemoryUser {
  id: number;
  token: string;
  machine_id: string;
  created_at: Date;
  last_active_at: Date;
  is_active: boolean;
}

interface MemorySession {
  id: number;
  session_id: string;
  machine_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
  is_deleted: boolean;
}

interface MemoryMessage {
  id: number;
  session_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: Date;
}

// 内存存储
class MemoryStore {
  private tokens: MemoryToken[] = [];
  private users: MemoryUser[] = [];
  private sessions: MemorySession[] = [];
  private messages: MemoryMessage[] = [];
  private nextId = 1;

  // Token 操作
  async insertToken(token: string): Promise<number> {
    const id = this.nextId++;
    this.tokens.push({
      id,
      token,
      is_used: false,
      created_at: new Date(),
      used_at: null,
    });
    return id;
  }

  async getTokens(): Promise<any[]> {
    return this.tokens.map(t => ({
      id: t.id,
      token: t.token,
      is_used: t.is_used,
      created_at: t.created_at,
      used_at: t.used_at,
    }));
  }

  async deleteToken(id: number): Promise<boolean> {
    const index = this.tokens.findIndex(t => t.id === id);
    if (index === -1) return false;
    if (this.tokens[index].is_used) return false;
    this.tokens.splice(index, 1);
    return true;
  }

  async useToken(token: string): Promise<boolean> {
    const t = this.tokens.find(t => t.token === token && !t.is_used);
    if (!t) return false;
    t.is_used = true;
    t.used_at = new Date();
    return true;
  }

  async validateToken(token: string): Promise<boolean> {
    return this.tokens.some(t => t.token === token && !t.is_used);
  }

  // User 操作
  async createUser(token: string, machineId: string): Promise<number> {
    const id = this.nextId++;
    this.users.push({
      id,
      token,
      machine_id: machineId,
      created_at: new Date(),
      last_active_at: new Date(),
      is_active: true,
    });
    return id;
  }

  async getUserByMachineId(machineId: string): Promise<MemoryUser | null> {
    return this.users.find(u => u.machine_id === machineId) || null;
  }

  async getUserByToken(token: string): Promise<MemoryUser | null> {
    return this.users.find(u => u.token === token) || null;
  }

  // Session 操作
  async createSession(sessionId: string, machineId: string, title: string = '新对话'): Promise<number> {
    const id = this.nextId++;
    this.sessions.push({
      id,
      session_id: sessionId,
      machine_id: machineId,
      title,
      created_at: new Date(),
      updated_at: new Date(),
      is_deleted: false,
    });
    return id;
  }

  async getSessionsByMachineId(machineId: string): Promise<MemorySession[]> {
    return this.sessions.filter(s => s.machine_id === machineId && !s.is_deleted);
  }

  async getSession(sessionId: string): Promise<MemorySession | null> {
    return this.sessions.find(s => s.session_id === sessionId && !s.is_deleted) || null;
  }

  async updateSessionTitle(sessionId: string, title: string): Promise<boolean> {
    const s = this.sessions.find(s => s.session_id === sessionId);
    if (!s) return false;
    s.title = title;
    s.updated_at = new Date();
    return true;
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    const s = this.sessions.find(s => s.session_id === sessionId);
    if (!s) return false;
    s.is_deleted = true;
    return true;
  }

  // Message 操作
  async createMessage(sessionId: string, role: 'user' | 'assistant' | 'system', content: string): Promise<number> {
    const id = this.nextId++;
    this.messages.push({
      id,
      session_id: sessionId,
      role,
      content,
      created_at: new Date(),
    });
    return id;
  }

  async getMessagesBySessionId(sessionId: string): Promise<MemoryMessage[]> {
    return this.messages.filter(m => m.session_id === sessionId);
  }

  // 初始化（内存存储不需要创建表）
  async init(): Promise<void> {
    console.log('Memory store initialized successfully');
  }
}

// 全局内存存储实例
let memoryStore: MemoryStore | null = null;

// 从环境变量读取配置
function getDatabaseConfig(): DatabaseConfig {
  const dbType = (process.env.DB_TYPE || '').toLowerCase();
  
  // 如果没有配置数据库类型，使用内存存储
  if (!dbType || dbType === 'memory') {
    return {
      type: 'memory',
      host: '',
      port: 0,
      database: '',
      username: '',
      password: '',
    };
  }
  
  return {
    type: dbType as 'mysql' | 'postgresql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || (dbType === 'mysql' ? '3306' : '5432')),
    database: process.env.DB_NAME || 'ai_chat',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };
}

// MySQL 连接池
let mysqlPool: mysql.Pool | null = null;

// PostgreSQL 连接池
let pgPool: PgPool | null = null;

/**
 * 检查是否使用内存存储
 */
export function isMemoryStore(): boolean {
  const config = getDatabaseConfig();
  return config.type === 'memory';
}

/**
 * 获取内存存储实例
 */
export function getMemoryStore(): MemoryStore {
  if (!memoryStore) {
    memoryStore = new MemoryStore();
  }
  return memoryStore;
}

/**
 * 获取数据库连接池
 */
export async function getPool() {
  const config = getDatabaseConfig();
  
  if (config.type === 'memory') {
    return { type: 'memory' as const, pool: null };
  }
  
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
    }
    return { type: 'postgresql' as const, pool: pgPool };
  }
}

/**
 * 执行 SQL 查询
 */
export async function query(sql: string, params?: any[]) {
  const { type, pool } = await getPool();
  
  // 内存存储不支持直接 SQL 查询，使用 MemoryStore 的方法
  if (type === 'memory') {
    throw new Error('Memory store does not support raw SQL queries. Use MemoryStore methods instead.');
  }
  
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
  
  // 内存存储不支持直接 SQL 执行，使用 MemoryStore 的方法
  if (type === 'memory') {
    throw new Error('Memory store does not support raw SQL execution. Use MemoryStore methods instead.');
  }
  
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
 * 初始化数据库表
 */
export async function initDatabase() {
  const config = getDatabaseConfig();
  
  if (config.type === 'memory') {
    await getMemoryStore().init();
    return;
  }
  
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
  const createTokensTable = `
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(255) NOT NULL UNIQUE COMMENT '预生成的认证token',
      is_used BOOLEAN DEFAULT FALSE COMMENT '是否已被使用',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      used_at TIMESTAMP NULL,
      INDEX idx_token (token)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='认证token表';
  `;

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      token VARCHAR(255) NOT NULL UNIQUE COMMENT '认证token',
      machine_id VARCHAR(255) NOT NULL UNIQUE COMMENT '机器码',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE COMMENT '是否激活',
      INDEX idx_token (token),
      INDEX idx_machine_id (machine_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='用户表';
  `;

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

  const createMessagesTable = `
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,
      session_id VARCHAR(255) NOT NULL COMMENT '会话ID',
      role ENUM('user', 'assistant', 'system') NOT NULL COMMENT '角色',
      content TEXT NOT NULL COMMENT '消息内容',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_session_id (session_id),
      FOREIGN KEY (session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='消息表';
  `;

  await query(createTokensTable);
  await query(createUsersTable);
  await query(createSessionsTable);
  await query(createMessagesTable);
  
  console.log('MySQL tables initialized successfully');
}

/**
 * 初始化 PostgreSQL 表
 */
async function initPostgreSQLTables() {
  const createTokensTable = `
    CREATE TABLE IF NOT EXISTS auth_tokens (
      id SERIAL PRIMARY KEY,
      token VARCHAR(255) NOT NULL UNIQUE,
      is_used BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      used_at TIMESTAMP NULL
    );
    CREATE INDEX IF NOT EXISTS idx_auth_tokens_token ON auth_tokens(token);
  `;

  const createUsersTable = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      token VARCHAR(255) NOT NULL UNIQUE,
      machine_id VARCHAR(255) NOT NULL UNIQUE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_active_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE
    );
    CREATE INDEX IF NOT EXISTS idx_users_token ON users(token);
    CREATE INDEX IF NOT EXISTS idx_users_machine_id ON users(machine_id);
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
  await query(createUsersTable);
  await query(createSessionsTable);
  await query(createMessagesTable);
  
  console.log('PostgreSQL tables initialized successfully');
}

export const Database = {
  getPool,
  query,
  execute,
  closePool,
  initDatabase,
  isMemoryStore,
  getMemoryStore,
};
