import bcrypt from 'bcryptjs';
import { db, initDatabase } from './db.js';

export async function seedDatabase() {
  console.log('Seeding Indian Equity & IPO Portfolio Analyzer database...');
  await initDatabase();

  const demoEmail = 'demo@investor.in';
  const demoPassword = 'password123';

  // Check if demo user already exists
  const existingUser = await db.prepare('SELECT id FROM users WHERE email = ?').get(demoEmail);
  if (existingUser) {
    console.log(`Demo user already exists (id: ${existingUser.id}). Clearing existing data for fresh demo seed...`);
    await db.prepare('DELETE FROM users WHERE id = ?').run(existingUser.id);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(demoPassword, salt);

  // 1. Insert User
  const userResult = await db.prepare(`
    INSERT INTO users (name, email, password_hash)
    VALUES (?, ?, ?)
  `).run('Koushik Sharma', demoEmail, passwordHash);
  const userId = userResult.lastInsertRowid;
  console.log(`Created user: ${demoEmail} (ID: ${userId})`);

  // 2. Insert Portfolios (Family Sub-Profiles)
  const portfolioStmt = db.prepare(`
    INSERT INTO portfolios (user_id, profile_name, broker_name)
    VALUES (?, ?, ?)
  `);

  const p1Result = await portfolioStmt.run(userId, 'Main Portfolio', 'Zerodha');
  const p1Id = p1Result.lastInsertRowid;

  const p2Result = await portfolioStmt.run(userId, 'Family IPO Account', 'Groww');
  const p2Id = p2Result.lastInsertRowid;

  console.log(`Created portfolios: Main Portfolio (ID: ${p1Id}), Family IPO Account (ID: ${p2Id})`);

  // 3. Insert Equity Holdings
  const equityStmt = db.prepare(`
    INSERT INTO equity_holdings (portfolio_id, symbol, exchange, sector, quantity, avg_buy_price, current_market_price, corporate_action_note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Main Portfolio Holdings (Zerodha)
  await equityStmt.run(p1Id, 'RELIANCE', 'NSE', 'Energy', 50, 2750.00, 2980.00, 'Original buy cost basis');
  await equityStmt.run(p1Id, 'HDFCBANK', 'NSE', 'Banking', 100, 1520.00, 1680.00, 'Long term compounding');
  await equityStmt.run(p1Id, 'TCS', 'NSE', 'Information Technology', 30, 3800.00, 4250.00, 'Buyback participant');
  await equityStmt.run(p1Id, 'ITC', 'NSE', 'FMCG', 250, 410.00, 510.00, 'Hotels Demerger Entitlement Ratio 1:10');
  await equityStmt.run(p1Id, 'TATASTEEL', 'NSE', 'Metals', 300, 125.00, 155.00, 'Stock Split 10:1 applied');

  // Family IPO Account Holdings (Groww)
  await equityStmt.run(p2Id, 'TATASTEEL', 'NSE', 'Metals', 200, 130.00, 155.00, null);
  await equityStmt.run(p2Id, 'INFY', 'NSE', 'Information Technology', 40, 1620.00, 1890.00, null);
  await equityStmt.run(p2Id, 'VEDL', 'NSE', 'Metals', 150, 360.00, 445.00, 'Demerger scheme announced');

  console.log('Seeded direct equity holdings across both family portfolios.');

  // 4. Insert IPO Tracker Records
  const ipoStmt = db.prepare(`
    INSERT INTO ipo_tracker (portfolio_id, company_name, issue_price, lot_size, lots_applied, status, listing_price, allotment_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Main Portfolio IPOs
  await ipoStmt.run(p1Id, 'Bajaj Housing Finance', 70.00, 214, 1, 'ALLOTTED', 150.00, '2024-09-16');

  // Family IPO Account IPOs
  await ipoStmt.run(p2Id, 'Tata Technologies', 500.00, 30, 2, 'ALLOTTED', 1200.00, '2023-11-30');
  await ipoStmt.run(p2Id, 'Swiggy Limited', 390.00, 38, 2, 'APPLIED', null, null);
  await ipoStmt.run(p2Id, 'Hyundai Motor India', 1960.00, 7, 1, 'NOT_ALLOTTED', 1810.00, '2024-10-22');

  console.log('Seeded IPO mandates & allotments.');

  // 5. Insert Mutual Funds (with Benchmark Alpha parameters)
  const mfStmt = db.prepare(`
    INSERT INTO mf_holdings (portfolio_id, fund_name, category, invested_amount, current_value, top_overlapping_stocks, cagr_pct, benchmark_name, benchmark_cagr_pct, expense_ratio)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Main Portfolio Funds
  // Outperforming (+3.6% alpha)
  await mfStmt.run(
    p1Id,
    'Parag Parikh Flexi Cap Fund - Direct Growth',
    'Flexi Cap',
    250000.00,
    325000.00,
    JSON.stringify(['HDFCBANK', 'ITC', 'BAJFINANCE', 'POWERGRID', 'TCS']),
    21.4,
    'Nifty 500 TRI',
    17.8,
    0.63
  );

  // Underperforming / Lagging (-2.7% alpha - Alpha Audit Alert!)
  await mfStmt.run(
    p1Id,
    'Mirae Asset Large Cap Fund - Direct Growth',
    'Large Cap',
    180000.00,
    215000.00,
    JSON.stringify(['RELIANCE', 'HDFCBANK', 'INFY', 'TCS', 'ICICIBANK']),
    13.8,
    'Nifty 100 TRI',
    16.5,
    0.54
  );

  // Family Account Funds (Outperforming +6.2% alpha)
  await mfStmt.run(
    p2Id,
    'Quant Small Cap Fund - Direct Growth',
    'Small Cap',
    120000.00,
    155000.00,
    JSON.stringify(['VEDL', 'RELIANCE', 'BIOCON', 'IRB']),
    28.2,
    'Nifty Smallcap 250 TRI',
    22.0,
    0.77
  );

  console.log('Seeded mutual fund holdings with benchmark metrics.');

  // 6. Insert Cash & Traditional Schemes Vault
  const cashStmt = db.prepare(`
    INSERT INTO cash_schemes (portfolio_id, scheme_name, scheme_type, invested_amount, current_value, target_maturity_value, monthly_commitment, tenure_info, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  await cashStmt.run(
    p1Id,
    'Family Chitti - 5L Pot',
    'CHITTI',
    300000.00,
    315000.00,
    500000.00,
    25000.00,
    'Month 12 of 20',
    'Traditional family chit fund with monthly dividend discount; planned bid month 16'
  );

  await cashStmt.run(
    p1Id,
    'HDFC Emergency FD',
    'FD_RD',
    200000.00,
    218500.00,
    230000.00,
    0.00,
    '7.25% p.a. (Maturity Nov 2025)',
    'Instant overdraft-linked liquid emergency reserve'
  );

  await cashStmt.run(
    p2Id,
    'SBI High-Yield Liquid Buffer',
    'SAVINGS_CASH',
    150000.00,
    153200.00,
    153200.00,
    10000.00,
    'Savings linked auto-sweep',
    'Working capital buffer reserved for primary market ASBA applications'
  );

  console.log('Seeded traditional cash, chitti & FD schemes vault.');
  console.log('\nSeed completed successfully!');
  console.log('Sandbox Account: demo@investor.in');
}

// Run directly if called from command line
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Seed script failed:', err);
      process.exit(1);
    });
}
