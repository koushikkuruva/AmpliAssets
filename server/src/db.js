import { createClient } from '@libsql/client';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database connection mode:
// Turso Cloud: when TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are supplied
// Local SQLite fallback: local file:data/portfolio.db
const isCloud = Boolean(process.env.TURSO_DATABASE_URL && process.env.TURSO_AUTH_TOKEN);

let clientConfig;
if (isCloud) {
  clientConfig = {
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  };
  console.log('Connecting to Turso Cloud SQLite database...');
} else {
  const localDbDir = path.resolve(__dirname, '../data');
  if (!fs.existsSync(localDbDir)) {
    fs.mkdirSync(localDbDir, { recursive: true });
  }
  const defaultLocalPath = `file:${path.resolve(localDbDir, 'portfolio.db').replace(/\\/g, '/')}`;
  const dbUrl = process.env.DB_PATH || defaultLocalPath;
  clientConfig = { url: dbUrl };
  console.log(`Connecting to local SQLite database: ${dbUrl}`);
}

export const rawClient = createClient(clientConfig);

export const db = {
  raw: rawClient,

  prepare(sql) {
    return {
      async get(...args) {
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await rawClient.execute({ sql, args: flatArgs });
        return res.rows && res.rows[0] ? { ...res.rows[0] } : null;
      },
      async all(...args) {
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await rawClient.execute({ sql, args: flatArgs });
        return res.rows ? res.rows.map(row => ({ ...row })) : [];
      },
      async run(...args) {
        const flatArgs = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
        const res = await rawClient.execute({ sql, args: flatArgs });
        return {
          lastInsertRowid: res.lastInsertRowid !== undefined ? Number(res.lastInsertRowid) : 0,
          changes: res.rowsAffected
        };
      }
    };
  },

  async exec(sql) {
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const stmt of statements) {
      await rawClient.execute(stmt);
    }
  },

  async execute(params) {
    return await rawClient.execute(params);
  },

  async batch(statements) {
    return await rawClient.batch(statements);
  }
};

export async function initDatabase() {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS portfolios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      profile_name TEXT NOT NULL,
      broker_name TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS equity_holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      symbol TEXT NOT NULL,
      exchange TEXT NOT NULL DEFAULT 'NSE',
      sector TEXT NOT NULL,
      quantity REAL NOT NULL,
      avg_buy_price REAL NOT NULL,
      current_market_price REAL NOT NULL,
      previous_close REAL,
      day_change_pct REAL DEFAULT 0,
      last_price_sync TEXT,
      corporate_action_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS ipo_tracker (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      company_name TEXT NOT NULL,
      issue_price REAL NOT NULL,
      lot_size INTEGER NOT NULL,
      lots_applied INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('APPLIED', 'ALLOTTED', 'NOT_ALLOTTED')),
      listing_price REAL,
      allotment_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS mf_holdings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      fund_name TEXT NOT NULL,
      category TEXT NOT NULL,
      invested_amount REAL NOT NULL,
      current_value REAL NOT NULL,
      top_overlapping_stocks TEXT NOT NULL,
      cagr_pct REAL,
      benchmark_name TEXT,
      benchmark_cagr_pct REAL,
      expense_ratio REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS cash_schemes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      portfolio_id INTEGER NOT NULL REFERENCES portfolios(id) ON DELETE CASCADE,
      scheme_name TEXT NOT NULL,
      scheme_type TEXT NOT NULL CHECK(scheme_type IN ('CHITTI', 'FD_RD', 'SAVINGS_CASH', 'GOLD_SCHEME', 'OTHER')),
      invested_amount REAL NOT NULL,
      current_value REAL NOT NULL,
      target_maturity_value REAL,
      monthly_commitment REAL DEFAULT 0,
      tenure_info TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_portfolios_user ON portfolios(user_id);
    CREATE INDEX IF NOT EXISTS idx_equities_portfolio ON equity_holdings(portfolio_id);
    CREATE INDEX IF NOT EXISTS idx_ipos_portfolio ON ipo_tracker(portfolio_id);
    CREATE INDEX IF NOT EXISTS idx_mf_portfolio ON mf_holdings(portfolio_id);
    CREATE INDEX IF NOT EXISTS idx_cash_portfolio ON cash_schemes(portfolio_id);
  `);

  // Auto-seed if database is freshly initialized and users table is empty
  try {
    const userCountRow = await db.prepare('SELECT COUNT(*) as count FROM users').get();
    if (!userCountRow || Number(userCountRow.count) === 0) {
      console.log('Fresh database detected (0 users). Auto-seeding default sandbox environment...');
      const { seedDatabase } = await import('./seed.js');
      await seedDatabase();
    }
  } catch (err) {
    console.warn('Auto-seed check notification:', err.message);
  }
}
