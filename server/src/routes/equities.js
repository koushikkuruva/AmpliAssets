import express from 'express';
import { db } from '../db.js';
import { authenticateToken, getScopedPortfolioIds } from '../middleware/auth.js';
import { syncPortfolioPrices, fetchLivePrice, getIndianMarketStatus } from '../services/marketPriceService.js';

const router = express.Router();
router.use(authenticateToken);

// POST /api/equities/sync-prices
// Protected endpoint to sync live prices for holdings in scope
router.post('/sync-prices', async (req, res) => {
  try {
    const scope = await getScopedPortfolioIds(req);
    if (!scope.valid || scope.portfolioIds.length === 0) {
      return res.json({
        success: true,
        updated_count: 0,
        message: 'No portfolios in scope',
        market_status: getIndianMarketStatus()
      });
    }

    const force = Boolean(req.body?.force);
    const syncResult = await syncPortfolioPrices(scope.portfolioIds, { force });

    return res.json({
      success: true,
      updated_count: syncResult.updatedCount,
      cached: syncResult.cached || false,
      message: syncResult.message || `Successfully synced ${syncResult.updatedCount} stock prices with NSE/BSE`,
      timestamp: syncResult.timestamp,
      market_status: syncResult.marketStatus
    });
  } catch (err) {
    console.error('Price sync error:', err);
    return res.status(500).json({ error: 'Failed to synchronize live market prices' });
  }
});

// GET /api/equities?portfolioId=
router.get('/', async (req, res) => {
  try {
    const scope = await getScopedPortfolioIds(req);
    if (!scope.valid || scope.portfolioIds.length === 0) {
      return res.json([]);
    }

    const placeholders = scope.portfolioIds.map(() => '?').join(',');
    const query = `
      SELECT 
        e.*,
        p.profile_name,
        p.broker_name
      FROM equity_holdings e
      JOIN portfolios p ON e.portfolio_id = p.id
      WHERE e.portfolio_id IN (${placeholders})
      ORDER BY (e.quantity * e.current_market_price) DESC
    `;

    const holdings = await db.prepare(query).all(...scope.portfolioIds);

    // Compute live metrics
    const enriched = holdings.map(h => {
      const invested = Number((h.quantity * h.avg_buy_price).toFixed(2));
      const currentVal = Number((h.quantity * h.current_market_price).toFixed(2));
      const pnl = Number((currentVal - invested).toFixed(2));
      const pnlPct = invested > 0 ? Number(((pnl / invested) * 100).toFixed(2)) : 0;

      const prevClose = h.previous_close !== null && h.previous_close !== undefined && h.previous_close > 0
        ? h.previous_close
        : h.current_market_price;

      const todayPnl = Number(((h.current_market_price - prevClose) * h.quantity).toFixed(2));
      const dayChangePct = h.day_change_pct !== null && h.day_change_pct !== undefined
        ? Number(h.day_change_pct.toFixed(2))
        : (prevClose > 0 ? Number((((h.current_market_price - prevClose) / prevClose) * 100).toFixed(2)) : 0);

      return {
        ...h,
        previous_close: prevClose,
        day_change_pct: dayChangePct,
        today_pnl: todayPnl,
        invested_value: invested,
        current_value: currentVal,
        unrealized_pnl: pnl,
        pnl_percentage: pnlPct
      };
    });

    return res.json(enriched);
  } catch (err) {
    console.error('Fetch equities error:', err);
    return res.status(500).json({ error: 'Failed to fetch equity holdings' });
  }
});

// POST /api/equities
// Adds stock with optional CMP (auto-fetches live price if omitted)
router.post('/', async (req, res) => {
  try {
    const {
      portfolio_id,
      symbol,
      exchange = 'NSE',
      sector = 'Other',
      quantity,
      avg_buy_price,
      current_market_price,
      corporate_action_note = null
    } = req.body;

    if (!portfolio_id || !symbol || quantity === undefined || avg_buy_price === undefined) {
      return res.status(400).json({ error: 'portfolio_id, symbol, quantity, and avg_buy_price are required' });
    }

    // Verify portfolio ownership
    const portfolio = await db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').get(portfolio_id, req.user.id);
    if (!portfolio) {
      return res.status(403).json({ error: 'Invalid or unauthorized portfolio' });
    }

    let cmp = current_market_price !== undefined && current_market_price !== null && current_market_price !== ''
      ? parseFloat(current_market_price)
      : null;

    let previousClose = cmp;
    let dayChangePct = 0;
    let lastPriceSync = null;

    // Auto-fetch live market price if CMP was omitted
    if (cmp === null || isNaN(cmp)) {
      try {
        const live = await fetchLivePrice(symbol, exchange);
        if (live && live.price > 0) {
          cmp = live.price;
          previousClose = live.prevClose;
          dayChangePct = live.dayChangePct;
          lastPriceSync = new Date().toISOString();
        }
      } catch (e) {
        console.warn('Could not auto-fetch price on creation for:', symbol);
      }
    }

    // Final fallback if live fetch unavailable
    if (cmp === null || isNaN(cmp)) {
      cmp = parseFloat(avg_buy_price);
      previousClose = cmp;
    }

    const stmt = db.prepare(`
      INSERT INTO equity_holdings (
        portfolio_id, symbol, exchange, sector, quantity, avg_buy_price, 
        current_market_price, previous_close, day_change_pct, last_price_sync, corporate_action_note
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      portfolio_id,
      symbol.toUpperCase().trim(),
      exchange.toUpperCase().trim(),
      sector.trim(),
      parseFloat(quantity),
      parseFloat(avg_buy_price),
      cmp,
      previousClose,
      dayChangePct,
      lastPriceSync,
      corporate_action_note ? corporate_action_note.trim() : null
    );

    const newHolding = await db.prepare(`
      SELECT e.*, p.profile_name, p.broker_name
      FROM equity_holdings e
      JOIN portfolios p ON e.portfolio_id = p.id
      WHERE e.id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json(newHolding);
  } catch (err) {
    console.error('Add equity error:', err);
    return res.status(500).json({ error: 'Failed to add equity holding' });
  }
});

// PATCH /api/equities/:id/corporate-action
// Supports Stock Split, Bonus shares, Demerger cost basis reduction
router.patch('/:id/corporate-action', async (req, res) => {
  try {
    const holdingId = req.params.id;
    const {
      action_type, // 'SPLIT', 'BONUS', 'DEMERGER', 'CUSTOM'
      ratio, // e.g. "1:10" or "1:1"
      multiplier, // e.g. 10 for split, or 2 for 1:1 bonus
      cost_ratio, // e.g. 0.60 for demerger where parent keeps 60%
      new_quantity,
      new_avg_buy_price,
      action_note
    } = req.body;

    // Verify ownership
    const holding = await db.prepare(`
      SELECT e.* FROM equity_holdings e
      JOIN portfolios p ON e.portfolio_id = p.id
      WHERE e.id = ? AND p.user_id = ?
    `).get(holdingId, req.user.id);

    if (!holding) {
      return res.status(404).json({ error: 'Holding not found or unauthorized' });
    }

    let calculatedQty = holding.quantity;
    let calculatedAvgPrice = holding.avg_buy_price;
    let generatedNote = '';

    if (new_quantity !== undefined && new_avg_buy_price !== undefined) {
      calculatedQty = parseFloat(new_quantity);
      calculatedAvgPrice = parseFloat(new_avg_buy_price);
      generatedNote = action_note || `Adjusted to ${calculatedQty} shares @ ₹${calculatedAvgPrice}`;
    } else if (action_type === 'SPLIT') {
      const mult = parseFloat(multiplier) || 2;
      calculatedQty = holding.quantity * mult;
      calculatedAvgPrice = holding.avg_buy_price / mult;
      generatedNote = action_note || `Stock Split applied (${ratio || `1:${mult}`}): Qty ${holding.quantity} -> ${calculatedQty}, Cost ₹${holding.avg_buy_price} -> ₹${calculatedAvgPrice.toFixed(2)}`;
    } else if (action_type === 'BONUS') {
      const mult = parseFloat(multiplier) || 1;
      const newTotalQty = holding.quantity * (1 + mult);
      calculatedAvgPrice = (holding.quantity * holding.avg_buy_price) / newTotalQty;
      calculatedQty = newTotalQty;
      generatedNote = action_note || `Bonus issue applied (${ratio || `${mult}:1`}): Qty increased to ${calculatedQty}, Cost basis revised to ₹${calculatedAvgPrice.toFixed(2)}`;
    } else if (action_type === 'DEMERGER') {
      const allocation = parseFloat(cost_ratio) || 0.7;
      calculatedAvgPrice = holding.avg_buy_price * allocation;
      generatedNote = action_note || `Demerger cost allocation (${Math.round(allocation * 100)}% parent basis): Cost revised to ₹${calculatedAvgPrice.toFixed(2)}`;
    }

    const previousNote = holding.corporate_action_note ? `${holding.corporate_action_note} | ` : '';
    const updatedNote = `${previousNote}${generatedNote}`.trim();

    const updateStmt = db.prepare(`
      UPDATE equity_holdings
      SET quantity = ?, avg_buy_price = ?, corporate_action_note = ?
      WHERE id = ?
    `);

    await updateStmt.run(calculatedQty, calculatedAvgPrice, updatedNote, holdingId);

    const updated = await db.prepare(`
      SELECT e.*, p.profile_name, p.broker_name
      FROM equity_holdings e
      JOIN portfolios p ON e.portfolio_id = p.id
      WHERE e.id = ?
    `).get(holdingId);

    return res.json({
      message: 'Corporate action applied successfully',
      holding: updated
    });
  } catch (err) {
    console.error('Corporate action error:', err);
    return res.status(500).json({ error: 'Failed to adjust corporate action' });
  }
});

// DELETE /api/equities/:id
router.delete('/:id', async (req, res) => {
  try {
    const holdingId = req.params.id;
    const holding = await db.prepare(`
      SELECT e.id FROM equity_holdings e
      JOIN portfolios p ON e.portfolio_id = p.id
      WHERE e.id = ? AND p.user_id = ?
    `).get(holdingId, req.user.id);

    if (!holding) {
      return res.status(404).json({ error: 'Holding not found or unauthorized' });
    }

    await db.prepare('DELETE FROM equity_holdings WHERE id = ?').run(holdingId);
    return res.json({ message: 'Holding removed successfully' });
  } catch (err) {
    console.error('Delete equity error:', err);
    return res.status(500).json({ error: 'Failed to delete holding' });
  }
});

export default router;
