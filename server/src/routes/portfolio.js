import express from 'express';
import { db } from '../db.js';
import { authenticateToken, getScopedPortfolioIds } from '../middleware/auth.js';
import { getIndianMarketStatus } from '../services/marketPriceService.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/portfolio/summary?portfolioId=
router.get('/summary', async (req, res) => {
  try {
    const scope = await getScopedPortfolioIds(req);
    const marketStatus = getIndianMarketStatus();

    if (!scope.valid || scope.portfolioIds.length === 0) {
      return res.json({
        total_invested: 0,
        total_current_value: 0,
        overall_pnl: 0,
        overall_pnl_pct: 0,
        today_pnl: 0,
        today_pnl_pct: 0,
        total_net_worth: 0,
        blocked_mandate_cash: 0,
        active_mandates_count: 0,
        allotted_ipos_count: 0,
        market_status: marketStatus,
        equity: {
          invested: 0,
          current_value: 0,
          pnl: 0,
          pnl_pct: 0,
          today_pnl: 0,
          today_pnl_pct: 0,
          holdings_count: 0
        },
        mf: {
          invested: 0,
          current_value: 0,
          pnl: 0,
          pnl_pct: 0,
          funds_count: 0
        },
        cash: {
          invested: 0,
          current_value: 0,
          monthly_commitment: 0,
          target_maturity_value: 0,
          schemes_count: 0
        },
        asset_allocation: {
          equities_pct: 0,
          mutual_funds_pct: 0,
          cash_chittis_pct: 0,
          blocked_ipo_pct: 0
        },
        sectors: []
      });
    }

    const placeholders = scope.portfolioIds.map(() => '?').join(',');

    // 1. Direct Equities Aggregates
    const equities = await db.prepare(`
      SELECT symbol, sector, quantity, avg_buy_price, current_market_price, previous_close, day_change_pct, last_price_sync
      FROM equity_holdings
      WHERE portfolio_id IN (${placeholders})
    `).all(...scope.portfolioIds);

    let equityInvested = 0;
    let equityCurrentValue = 0;
    let equityTodayPnl = 0;
    let equityYesterdayValue = 0;
    const sectorMap = {};
    let latestSync = null;

    equities.forEach(item => {
      const itemInvested = item.quantity * item.avg_buy_price;
      const itemCurrent = item.quantity * item.current_market_price;
      equityInvested += itemInvested;
      equityCurrentValue += itemCurrent;

      const prevPrice = item.previous_close !== null && item.previous_close !== undefined && item.previous_close > 0
        ? item.previous_close
        : item.current_market_price;

      const itemYesterday = prevPrice * item.quantity;
      equityYesterdayValue += itemYesterday;
      equityTodayPnl += (itemCurrent - itemYesterday);

      if (item.last_price_sync) {
        if (!latestSync || new Date(item.last_price_sync) > new Date(latestSync)) {
          latestSync = item.last_price_sync;
        }
      }

      const sec = item.sector || 'Other';
      sectorMap[sec] = (sectorMap[sec] || 0) + itemCurrent;
    });

    const equityPnl = equityCurrentValue - equityInvested;
    const equityPnlPct = equityInvested > 0 ? (equityPnl / equityInvested) * 100 : 0;
    const equityTodayPnlPct = equityYesterdayValue > 0 ? (equityTodayPnl / equityYesterdayValue) * 100 : 0;

    // Sector breakdown
    const sectors = Object.entries(sectorMap)
      .map(([name, value]) => ({
        sector: name,
        value: Number(value.toFixed(2)),
        percentage: equityCurrentValue > 0 ? Number(((value / equityCurrentValue) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.value - a.value);

    // 2. Mutual Funds Aggregates
    const funds = await db.prepare(`
      SELECT invested_amount, current_value
      FROM mf_holdings
      WHERE portfolio_id IN (${placeholders})
    `).all(...scope.portfolioIds);

    let mfInvested = 0;
    let mfCurrentValue = 0;
    funds.forEach(f => {
      mfInvested += f.invested_amount;
      mfCurrentValue += f.current_value;
    });

    const mfPnl = mfCurrentValue - mfInvested;
    const mfPnlPct = mfInvested > 0 ? (mfPnl / mfInvested) * 100 : 0;

    // 3. IPO Mandates Aggregates
    const ipos = await db.prepare(`
      SELECT status, issue_price, lot_size, lots_applied, listing_price
      FROM ipo_tracker
      WHERE portfolio_id IN (${placeholders})
    `).all(...scope.portfolioIds);

    let blockedMandateCash = 0;
    let activeMandatesCount = 0;
    let allottedIposCount = 0;
    let ipoListingGain = 0;

    ipos.forEach(ipo => {
      const appAmount = ipo.lots_applied * ipo.lot_size * ipo.issue_price;
      if (ipo.status === 'APPLIED') {
        blockedMandateCash += appAmount;
        activeMandatesCount += 1;
      } else if (ipo.status === 'ALLOTTED') {
        allottedIposCount += 1;
        if (ipo.listing_price) {
          const shares = ipo.lots_applied * ipo.lot_size;
          ipoListingGain += (ipo.listing_price - ipo.issue_price) * shares;
        }
      }
    });

    // 4. Traditional Cash & Chitti Schemes Aggregates
    const cashSchemes = await db.prepare(`
      SELECT invested_amount, current_value, monthly_commitment, target_maturity_value, scheme_type
      FROM cash_schemes
      WHERE portfolio_id IN (${placeholders})
    `).all(...scope.portfolioIds);

    let cashInvested = 0;
    let cashCurrentValue = 0;
    let cashMonthlyCommitment = 0;
    let cashTargetMaturity = 0;

    cashSchemes.forEach(c => {
      cashInvested += (c.invested_amount || 0);
      cashCurrentValue += (c.current_value || 0);
      cashMonthlyCommitment += (c.monthly_commitment || 0);
      cashTargetMaturity += (c.target_maturity_value || c.current_value || 0);
    });

    // 5. Combined Net Worth & Totals
    const totalInvested = equityInvested + mfInvested + cashInvested;
    const totalCurrentValue = equityCurrentValue + mfCurrentValue + cashCurrentValue;
    const overallPnl = (equityCurrentValue - equityInvested) + (mfCurrentValue - mfInvested) + (cashCurrentValue - cashInvested);
    const overallPnlPct = totalInvested > 0 ? (overallPnl / totalInvested) * 100 : 0;
    const totalNetWorth = totalCurrentValue + blockedMandateCash;

    // Asset Allocation Breakdown (%)
    const totalAssetPool = totalNetWorth > 0 ? totalNetWorth : 1;
    const assetAllocation = {
      equities_pct: Number(((equityCurrentValue / totalAssetPool) * 100).toFixed(1)),
      mutual_funds_pct: Number(((mfCurrentValue / totalAssetPool) * 100).toFixed(1)),
      cash_chittis_pct: Number(((cashCurrentValue / totalAssetPool) * 100).toFixed(1)),
      blocked_ipo_pct: Number(((blockedMandateCash / totalAssetPool) * 100).toFixed(1))
    };

    return res.json({
      total_invested: Number(totalInvested.toFixed(2)),
      total_current_value: Number(totalCurrentValue.toFixed(2)),
      overall_pnl: Number(overallPnl.toFixed(2)),
      overall_pnl_pct: Number(overallPnlPct.toFixed(2)),
      today_pnl: Number(equityTodayPnl.toFixed(2)),
      today_pnl_pct: Number(equityTodayPnlPct.toFixed(2)),
      total_net_worth: Number(totalNetWorth.toFixed(2)),
      blocked_mandate_cash: Number(blockedMandateCash.toFixed(2)),
      active_mandates_count: activeMandatesCount,
      allotted_ipos_count: allottedIposCount,
      ipo_listing_gain: Number(ipoListingGain.toFixed(2)),
      market_status: marketStatus,
      last_price_sync: latestSync,
      equity: {
        invested: Number(equityInvested.toFixed(2)),
        current_value: Number(equityCurrentValue.toFixed(2)),
        pnl: Number(equityPnl.toFixed(2)),
        pnl_pct: Number(equityPnlPct.toFixed(2)),
        today_pnl: Number(equityTodayPnl.toFixed(2)),
        today_pnl_pct: Number(equityTodayPnlPct.toFixed(2)),
        holdings_count: equities.length
      },
      mf: {
        invested: Number(mfInvested.toFixed(2)),
        current_value: Number(mfCurrentValue.toFixed(2)),
        pnl: Number(mfPnl.toFixed(2)),
        pnl_pct: Number(mfPnlPct.toFixed(2)),
        funds_count: funds.length
      },
      cash: {
        invested: Number(cashInvested.toFixed(2)),
        current_value: Number(cashCurrentValue.toFixed(2)),
        monthly_commitment: Number(cashMonthlyCommitment.toFixed(2)),
        target_maturity_value: Number(cashTargetMaturity.toFixed(2)),
        schemes_count: cashSchemes.length
      },
      asset_allocation: assetAllocation,
      sectors
    });
  } catch (err) {
    console.error('Portfolio summary error:', err);
    return res.status(500).json({ error: 'Failed to generate portfolio summary' });
  }
});

// GET /api/portfolio/power-up?portfolioId=
router.get('/power-up', async (req, res) => {
  try {
    const scope = await getScopedPortfolioIds(req);
    if (!scope.valid || scope.portfolioIds.length === 0) {
      return res.json({
        health_score: 50,
        health_grade: 'NEEDS_OPTIMIZATION',
        summary: {
          capital_beating_benchmark: 0,
          capital_beating_pct: 0,
          capital_lagging_benchmark: 0,
          capital_lagging_pct: 0,
          total_missed_alpha_inr: 0,
          total_analyzed_capital: 0,
          concentration_risks_count: 0
        },
        mf_audit: [],
        equity_diagnostics: []
      });
    }

    const placeholders = scope.portfolioIds.map(() => '?').join(',');

    // 1. Mutual Fund Benchmark Alpha Audit
    const mfQuery = `
      SELECT 
        m.*,
        p.profile_name,
        p.broker_name
      FROM mf_holdings m
      JOIN portfolios p ON m.portfolio_id = p.id
      WHERE m.portfolio_id IN (${placeholders})
      ORDER BY m.current_value DESC
    `;
    const mfList = await db.prepare(mfQuery).all(...scope.portfolioIds);

    let totalMfVal = 0;
    let mfBeatingVal = 0;
    let mfLaggingVal = 0;
    let totalMissedAlphaInr = 0;

    const mfAudit = mfList.map(f => {
      totalMfVal += f.current_value;
      const cagr = f.cagr_pct !== null && f.cagr_pct !== undefined ? f.cagr_pct : 15.0;
      const benchName = f.benchmark_name || 'Nifty 500 TRI';
      const benchCagr = f.benchmark_cagr_pct !== null && f.benchmark_cagr_pct !== undefined ? f.benchmark_cagr_pct : 15.0;
      const alphaPct = Number((cagr - benchCagr).toFixed(2));
      const expRatio = f.expense_ratio !== null && f.expense_ratio !== undefined ? f.expense_ratio : 0.65;

      let classification = 'IN_LINE';
      let recommendation = 'Market Performer — Monitor Expense Ratio';
      let statusBadge = 'info';
      let missedGains = 0;

      if (alphaPct >= 1.0) {
        classification = 'OUTPERFORMING';
        recommendation = 'Alpha Leader — Continue SIP & Hold';
        statusBadge = 'success';
        mfBeatingVal += f.current_value;
      } else if (alphaPct <= -1.0) {
        classification = 'UNDERPERFORMING';
        recommendation = 'Power-Up Alert: Lagging Benchmark — Review for Switch to Index / Category Leader';
        statusBadge = 'danger';
        mfLaggingVal += f.current_value;
        missedGains = Number(((f.invested_amount * Math.abs(alphaPct)) / 100).toFixed(2));
        totalMissedAlphaInr += missedGains;
      } else {
        mfBeatingVal += f.current_value;
      }

      return {
        id: f.id,
        portfolio_id: f.portfolio_id,
        profile_name: f.profile_name,
        broker_name: f.broker_name,
        fund_name: f.fund_name,
        category: f.category,
        invested_amount: f.invested_amount,
        current_value: f.current_value,
        cagr_pct: cagr,
        benchmark_name: benchName,
        benchmark_cagr_pct: benchCagr,
        expense_ratio: expRatio,
        alpha_pct: alphaPct,
        missed_gains_inr: missedGains,
        classification,
        recommendation,
        status_badge: statusBadge
      };
    });

    // 2. Direct Stock Diagnostics
    const eqQuery = `
      SELECT 
        e.*,
        p.profile_name,
        p.broker_name
      FROM equity_holdings e
      JOIN portfolios p ON e.portfolio_id = p.id
      WHERE e.portfolio_id IN (${placeholders})
      ORDER BY (e.quantity * e.current_market_price) DESC
    `;
    const eqList = await db.prepare(eqQuery).all(...scope.portfolioIds);

    let totalEquityVal = 0;
    eqList.forEach(e => {
      totalEquityVal += (e.quantity * e.current_market_price);
    });

    let stockBeatingVal = 0;
    let stockLaggingVal = 0;
    let concentrationRisksCount = 0;

    const BENCHMARK_HURDLE_PCT = 14.0;

    const equityDiagnostics = eqList.map(item => {
      const curVal = item.quantity * item.current_market_price;
      const invVal = item.quantity * item.avg_buy_price;
      const pnl = curVal - invVal;
      const pnlPct = invVal > 0 ? Number(((pnl / invVal) * 100).toFixed(2)) : 0;
      const weightPct = totalEquityVal > 0 ? Number(((curVal / totalEquityVal) * 100).toFixed(1)) : 0;

      let diagnosisCode = 'CORE_STEADY';
      let diagnosisTitle = 'Steady Core';
      let recommendation = 'Steady Core Holding — Monitor Earnings Growth';
      let badgeVariant = 'info';

      if (weightPct > 20.0) {
        diagnosisCode = 'CONCENTRATION_RISK';
        diagnosisTitle = 'Concentration Risk';
        recommendation = `High Concentration (${weightPct}% Weight) — Consider Partial Rebalancing`;
        badgeVariant = 'warning';
        concentrationRisksCount += 1;
        if (pnlPct >= BENCHMARK_HURDLE_PCT) {
          stockBeatingVal += curVal;
        } else {
          stockLaggingVal += curVal;
        }
      } else if (pnlPct >= BENCHMARK_HURDLE_PCT) {
        diagnosisCode = 'STAR_COMPOUNDER';
        diagnosisTitle = 'Star Compounder';
        recommendation = 'Outperforming Benchmark — Ride Compounder';
        badgeVariant = 'success';
        stockBeatingVal += curVal;
      } else if (pnlPct < 0) {
        diagnosisCode = 'UNDERPERFORMER_DRAG';
        diagnosisTitle = 'Capital Drag';
        recommendation = 'Capital Drag — Review Thesis or Use for Tax-Loss Harvesting';
        badgeVariant = 'danger';
        stockLaggingVal += curVal;
      } else {
        diagnosisCode = 'CORE_STEADY';
        diagnosisTitle = 'Steady Core';
        recommendation = 'Steady Core Holding — Monitor Earnings Growth';
        badgeVariant = 'info';
        stockLaggingVal += curVal;
      }

      return {
        id: item.id,
        portfolio_id: item.portfolio_id,
        profile_name: item.profile_name,
        broker_name: item.broker_name,
        symbol: item.symbol,
        exchange: item.exchange,
        sector: item.sector,
        quantity: item.quantity,
        avg_buy_price: item.avg_buy_price,
        current_market_price: item.current_market_price,
        current_value: Number(curVal.toFixed(2)),
        invested_amount: Number(invVal.toFixed(2)),
        unrealized_pnl: Number(pnl.toFixed(2)),
        pnl_pct: pnlPct,
        portfolio_weight_pct: weightPct,
        benchmark_hurdle_pct: BENCHMARK_HURDLE_PCT,
        diagnosis_code: diagnosisCode,
        diagnosis_title: diagnosisTitle,
        recommendation,
        badge_variant: badgeVariant
      };
    });

    // 3. Health Score & High Level Analytics
    const totalAnalyzed = totalMfVal + totalEquityVal;
    const totalBeating = mfBeatingVal + stockBeatingVal;
    const totalLagging = mfLaggingVal + stockLaggingVal;
    const beatingPct = totalAnalyzed > 0 ? Number(((totalBeating / totalAnalyzed) * 100).toFixed(1)) : 0;
    const laggingPct = totalAnalyzed > 0 ? Number(((totalLagging / totalAnalyzed) * 100).toFixed(1)) : 0;

    // Power-Up Score (0 - 100)
    let score = Math.round(beatingPct * 0.9);
    score = score - (concentrationRisksCount * 5);
    score = Math.max(20, Math.min(96, score));

    let healthGrade = 'STRONG';
    if (score < 50) healthGrade = 'NEEDS_OPTIMIZATION';
    else if (score < 75) healthGrade = 'MODERATE';

    return res.json({
      health_score: score,
      health_grade: healthGrade,
      summary: {
        capital_beating_benchmark: Number(totalBeating.toFixed(2)),
        capital_beating_pct: beatingPct,
        capital_lagging_benchmark: Number(totalLagging.toFixed(2)),
        capital_lagging_pct: laggingPct,
        total_missed_alpha_inr: Number(totalMissedAlphaInr.toFixed(2)),
        total_analyzed_capital: Number(totalAnalyzed.toFixed(2)),
        concentration_risks_count: concentrationRisksCount
      },
      mf_audit: mfAudit,
      equity_diagnostics: equityDiagnostics
    });
  } catch (err) {
    console.error('Power-Up calculation error:', err);
    return res.status(500).json({ error: 'Failed to generate Power-Up analytics' });
  }
});

export default router;
