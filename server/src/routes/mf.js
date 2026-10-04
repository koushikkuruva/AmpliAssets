import express from 'express';
import { db } from '../db.js';
import { authenticateToken, getScopedPortfolioIds } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/mf?portfolioId=
router.get('/', async (req, res) => {
  try {
    const scope = await getScopedPortfolioIds(req);
    if (!scope.valid || scope.portfolioIds.length === 0) {
      return res.json([]);
    }

    const placeholders = scope.portfolioIds.map(() => '?').join(',');
    const query = `
      SELECT 
        m.*,
        p.profile_name,
        p.broker_name
      FROM mf_holdings m
      JOIN portfolios p ON m.portfolio_id = p.id
      WHERE m.portfolio_id IN (${placeholders})
      ORDER BY m.current_value DESC
    `;

    const funds = await db.prepare(query).all(...scope.portfolioIds);

    const enriched = funds.map(f => {
      const pnl = Number((f.current_value - f.invested_amount).toFixed(2));
      const pnlPct = f.invested_amount > 0 ? Number(((pnl / f.invested_amount) * 100).toFixed(2)) : 0;
      let topStocks = [];
      try {
        topStocks = JSON.parse(f.top_overlapping_stocks);
      } catch (e) {
        topStocks = [];
      }

      return {
        ...f,
        unrealized_pnl: pnl,
        pnl_percentage: pnlPct,
        top_overlapping_stocks_list: topStocks
      };
    });

    return res.json(enriched);
  } catch (err) {
    console.error('Fetch MF error:', err);
    return res.status(500).json({ error: 'Failed to fetch mutual fund holdings' });
  }
});

// POST /api/mf
router.post('/', async (req, res) => {
  try {
    const {
      portfolio_id,
      fund_name,
      category = 'Equity',
      invested_amount,
      current_value,
      top_overlapping_stocks = [],
      cagr_pct,
      benchmark_name = 'Nifty 500 TRI',
      benchmark_cagr_pct,
      expense_ratio
    } = req.body;

    if (!portfolio_id || !fund_name || invested_amount === undefined || current_value === undefined) {
      return res.status(400).json({ error: 'portfolio_id, fund_name, invested_amount, and current_value are required' });
    }

    const portfolio = await db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').get(portfolio_id, req.user.id);
    if (!portfolio) {
      return res.status(403).json({ error: 'Invalid or unauthorized portfolio' });
    }

    const stocksJson = Array.isArray(top_overlapping_stocks) 
      ? JSON.stringify(top_overlapping_stocks.map(s => String(s).toUpperCase().trim()))
      : JSON.stringify([]);

    // Default CAGR calculation if omitted
    const inv = parseFloat(invested_amount);
    const cur = parseFloat(current_value);
    const computedCagr = cagr_pct !== undefined && cagr_pct !== '' 
      ? parseFloat(cagr_pct) 
      : (inv > 0 ? Number((((cur - inv) / inv) * 100).toFixed(2)) : 15.0);

    const computedBenchCagr = benchmark_cagr_pct !== undefined && benchmark_cagr_pct !== ''
      ? parseFloat(benchmark_cagr_pct)
      : 16.0;

    const computedExpRatio = expense_ratio !== undefined && expense_ratio !== ''
      ? parseFloat(expense_ratio)
      : 0.65;

    const stmt = db.prepare(`
      INSERT INTO mf_holdings (
        portfolio_id, fund_name, category, invested_amount, current_value, 
        top_overlapping_stocks, cagr_pct, benchmark_name, benchmark_cagr_pct, expense_ratio
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      portfolio_id,
      fund_name.trim(),
      category.trim(),
      inv,
      cur,
      stocksJson,
      computedCagr,
      benchmark_name.trim(),
      computedBenchCagr,
      computedExpRatio
    );

    const newFund = await db.prepare(`
      SELECT m.*, p.profile_name, p.broker_name
      FROM mf_holdings m
      JOIN portfolios p ON m.portfolio_id = p.id
      WHERE m.id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json(newFund);
  } catch (err) {
    console.error('Add MF error:', err);
    return res.status(500).json({ error: 'Failed to add mutual fund holding' });
  }
});

// DELETE /api/mf/:id
router.delete('/:id', async (req, res) => {
  try {
    const mfId = req.params.id;
    const existing = await db.prepare(`
      SELECT m.id FROM mf_holdings m
      JOIN portfolios p ON m.portfolio_id = p.id
      WHERE m.id = ? AND p.user_id = ?
    `).get(mfId, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Mutual fund record not found or unauthorized' });
    }

    await db.prepare('DELETE FROM mf_holdings WHERE id = ?').run(mfId);
    return res.json({ message: 'Mutual fund holding removed successfully' });
  } catch (err) {
    console.error('Delete MF error:', err);
    return res.status(500).json({ error: 'Failed to delete mutual fund holding' });
  }
});

export default router;
