import YahooFinance from 'yahoo-finance2';
import { db } from '../db.js';

const yf = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes cache cooldown

/**
 * Returns Indian Stock Market (NSE/BSE) status based on Asia/Kolkata time.
 * Standard hours: Monday - Friday, 9:15 AM - 3:30 PM IST.
 */
export function getIndianMarketStatus() {
  const now = new Date();
  // Format in Asia/Kolkata
  const istString = now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istString);

  const day = istDate.getDay(); // 0 is Sunday, 6 is Saturday
  const hours = istDate.getHours();
  const minutes = istDate.getMinutes();
  const timeInMinutes = hours * 60 + minutes;

  const isWeekday = day >= 1 && day <= 5;
  const isMarketHours = timeInMinutes >= (9 * 60 + 15) && timeInMinutes <= (15 * 60 + 30);
  const isOpen = isWeekday && isMarketHours;

  return {
    isOpen,
    status: isOpen ? 'OPEN' : 'CLOSED',
    badge: isOpen ? 'NSE/BSE Live' : 'Market Closed',
    istTime: istDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })
  };
}

/**
 * Normalizes symbol for NSE/BSE Yahoo Finance tickers.
 * Removes existing .NS/.BO and appends correct suffix based on exchange.
 */
export function formatYahooTicker(symbol, exchange = 'NSE') {
  const clean = symbol.replace(/\.(NS|BO)$/i, '').toUpperCase().trim();
  const ex = exchange?.toUpperCase().trim() || 'NSE';
  return ex === 'BSE' ? `${clean}.BO` : `${clean}.NS`;
}

/**
 * Fetches current market price and previous close for a single stock.
 * Primary: yahoo-finance2
 * Fallback: Yahoo Finance v8 chart API
 */
export async function fetchLivePrice(symbol, exchange = 'NSE') {
  const ticker = formatYahooTicker(symbol, exchange);

  // 1. Primary: yahoo-finance2
  try {
    const quote = await yf.quote(ticker);
    if (quote && typeof quote.regularMarketPrice === 'number') {
      const price = quote.regularMarketPrice;
      const prevClose = typeof quote.regularMarketPreviousClose === 'number' && quote.regularMarketPreviousClose > 0 
        ? quote.regularMarketPreviousClose 
        : price;
      
      let dayChangePct = quote.regularMarketChangePercent;
      if (typeof dayChangePct !== 'number') {
        dayChangePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;
      }

      return {
        ticker,
        price: Number(price.toFixed(2)),
        prevClose: Number(prevClose.toFixed(2)),
        dayChangePct: Number(dayChangePct.toFixed(2)),
        source: 'yahoo-finance2'
      };
    }
  } catch (err) {
    // Suppress schema validation or transient warnings and proceed to fallback
  }

  // 2. Fallback: Yahoo Finance v8 chart API
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=2d`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json'
      }
    });

    if (response.ok) {
      const data = await response.json();
      const meta = data?.chart?.result?.[0]?.meta;

      if (meta && typeof meta.regularMarketPrice === 'number') {
        const price = meta.regularMarketPrice;
        const prevClose = meta.chartPreviousClose || meta.previousClose || price;
        const dayChangePct = prevClose > 0 ? ((price - prevClose) / prevClose) * 100 : 0;

        return {
          ticker,
          price: Number(price.toFixed(2)),
          prevClose: Number(prevClose.toFixed(2)),
          dayChangePct: Number(dayChangePct.toFixed(2)),
          source: 'v8-chart-api'
        };
      }
    }
  } catch (err) {
    console.warn(`Fallback fetch failed for ${ticker}:`, err.message);
  }

  // If both failed, return null gracefully
  return null;
}

/**
 * Synchronizes live prices for all holdings belonging to specified portfolioIds.
 * Supports cooldown cache check and force override.
 */
export async function syncPortfolioPrices(portfolioIds, { force = false } = {}) {
  if (!portfolioIds || portfolioIds.length === 0) {
    return {
      updatedCount: 0,
      timestamp: new Date().toISOString(),
      marketStatus: getIndianMarketStatus()
    };
  }

  const placeholders = portfolioIds.map(() => '?').join(',');
  const holdings = await db.prepare(`
    SELECT id, portfolio_id, symbol, exchange, current_market_price, previous_close, day_change_pct, last_price_sync
    FROM equity_holdings
    WHERE portfolio_id IN (${placeholders})
  `).all(...portfolioIds);

  if (holdings.length === 0) {
    return {
      updatedCount: 0,
      timestamp: new Date().toISOString(),
      marketStatus: getIndianMarketStatus()
    };
  }

  const now = Date.now();
  const holdingsToSync = holdings.filter(h => {
    if (force) return true;
    if (!h.last_price_sync) return true;
    const lastSyncTime = new Date(h.last_price_sync).getTime();
    return (now - lastSyncTime) > SYNC_COOLDOWN_MS;
  });

  if (holdingsToSync.length === 0) {
    return {
      updatedCount: 0,
      cached: true,
      message: 'Prices are fresh (synced within the last 5 minutes)',
      timestamp: new Date().toISOString(),
      marketStatus: getIndianMarketStatus()
    };
  }

  // Gather unique (symbol + exchange) pairs to avoid redundant queries
  const uniqueKeys = new Map();
  holdingsToSync.forEach(h => {
    const key = `${h.symbol.toUpperCase()}_${h.exchange.toUpperCase()}`;
    if (!uniqueKeys.has(key)) {
      uniqueKeys.set(key, { symbol: h.symbol, exchange: h.exchange });
    }
  });

  // Fetch prices concurrently
  const fetchPromises = Array.from(uniqueKeys.entries()).map(async ([key, info]) => {
    const result = await fetchLivePrice(info.symbol, info.exchange);
    return { key, result };
  });

  const settled = await Promise.allSettled(fetchPromises);
  const priceMap = new Map();

  settled.forEach(item => {
    if (item.status === 'fulfilled' && item.value.result) {
      priceMap.set(item.value.key, item.value.result);
    }
  });

  const syncTimestamp = new Date().toISOString();
  let updatedCount = 0;
  const updatePromises = [];

  for (const h of holdingsToSync) {
    const key = `${h.symbol.toUpperCase()}_${h.exchange.toUpperCase()}`;
    const liveData = priceMap.get(key);

    if (liveData) {
      updatePromises.push(
        db.prepare(`
          UPDATE equity_holdings
          SET current_market_price = ?,
              previous_close = ?,
              day_change_pct = ?,
              last_price_sync = ?
          WHERE id = ?
        `).run(
          liveData.price,
          liveData.prevClose,
          liveData.dayChangePct,
          syncTimestamp,
          h.id
        )
      );
      updatedCount += 1;
    }
  }

  await Promise.all(updatePromises);

  return {
    updatedCount,
    totalHoldingsInScope: holdings.length,
    cached: false,
    timestamp: syncTimestamp,
    marketStatus: getIndianMarketStatus()
  };
}
