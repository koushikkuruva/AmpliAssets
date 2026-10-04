import express from 'express';
import { db } from '../db.js';
import { authenticateToken, getScopedPortfolioIds } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/overlap?portfolioId=
router.get('/', async (req, res) => {
  try {
    const scope = await getScopedPortfolioIds(req);
    if (!scope.valid || scope.portfolioIds.length === 0) {
      return res.json({
        total_direct_stocks: 0,
        overlapping_stocks_count: 0,
        overlap_direct_value: 0,
        overlap_direct_percentage: 0,
        concentration_risk_level: 'LOW',
        overlapping_stocks: []
      });
    }

    const placeholders = scope.portfolioIds.map(() => '?').join(',');

    // 1. Fetch direct equity holdings
    const equities = await db.prepare(`
      SELECT symbol, sector, quantity, current_market_price, (quantity * current_market_price) as current_val
      FROM equity_holdings
      WHERE portfolio_id IN (${placeholders})
    `).all(...scope.portfolioIds);

    // Group direct holdings by symbol (in case user has same stock across multiple sub-portfolios)
    const directStocksMap = {};
    let totalDirectEquityValue = 0;

    equities.forEach(e => {
      const sym = e.symbol.toUpperCase().trim();
      const val = e.current_val;
      totalDirectEquityValue += val;

      if (!directStocksMap[sym]) {
        directStocksMap[sym] = {
          symbol: sym,
          sector: e.sector,
          total_quantity: e.quantity,
          current_market_price: e.current_market_price,
          total_direct_value: val
        };
      } else {
        directStocksMap[sym].total_quantity += e.quantity;
        directStocksMap[sym].total_direct_value += val;
      }
    });

    // 2. Fetch mutual funds
    const funds = await db.prepare(`
      SELECT id, fund_name, category, current_value, top_overlapping_stocks
      FROM mf_holdings
      WHERE portfolio_id IN (${placeholders})
    `).all(...scope.portfolioIds);

    // 3. Map MF top stocks
    const mfStockMap = {}; // symbol -> array of funds holding it
    funds.forEach(f => {
      let topList = [];
      try {
        topList = JSON.parse(f.top_overlapping_stocks);
      } catch (err) {
        topList = [];
      }

      topList.forEach(stock => {
        const s = String(stock).toUpperCase().trim();
        if (!mfStockMap[s]) {
          mfStockMap[s] = [];
        }
        mfStockMap[s].push({
          fund_id: f.id,
          fund_name: f.fund_name,
          category: f.category,
          current_value: f.current_value
        });
      });
    });

    // 4. Find intersection (Overlap)
    const overlappingStocks = [];
    let overlapDirectValue = 0;

    Object.keys(directStocksMap).forEach(sym => {
      if (mfStockMap[sym] && mfStockMap[sym].length > 0) {
        const directStock = directStocksMap[sym];
        overlapDirectValue += directStock.total_direct_value;
        const weightPct = totalDirectEquityValue > 0 ? (directStock.total_direct_value / totalDirectEquityValue) * 100 : 0;

        overlappingStocks.push({
          symbol: sym,
          sector: directStock.sector,
          quantity: directStock.total_quantity,
          current_price: directStock.current_market_price,
          direct_value: Number(directStock.total_direct_value.toFixed(2)),
          direct_weight_pct: Number(weightPct.toFixed(2)),
          funds_holding: mfStockMap[sym]
        });
      }
    });

    overlappingStocks.sort((a, b) => b.direct_value - a.direct_value);

    const overlapPct = totalDirectEquityValue > 0 ? (overlapDirectValue / totalDirectEquityValue) * 100 : 0;
    
    let riskLevel = 'LOW';
    if (overlapPct >= 45) {
      riskLevel = 'HIGH';
    } else if (overlapPct >= 20) {
      riskLevel = 'MODERATE';
    }

    return res.json({
      total_direct_stocks: Object.keys(directStocksMap).length,
      overlapping_stocks_count: overlappingStocks.length,
      total_direct_value: Number(totalDirectEquityValue.toFixed(2)),
      overlap_direct_value: Number(overlapDirectValue.toFixed(2)),
      overlap_direct_percentage: Number(overlapPct.toFixed(2)),
      concentration_risk_level: riskLevel,
      overlapping_stocks: overlappingStocks
    });
  } catch (err) {
    console.error('Overlap error:', err);
    return res.status(500).json({ error: 'Failed to calculate overlap' });
  }
});

export default router;
