import jwt from 'jsonwebtoken';
import { db } from '../db.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'equity_ipo_super_secret_jwt_key_2026';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

/**
 * Resolves which portfolio IDs should be included in query.
 * If portfolioId query parameter is omitted or set to 'ALL', all user's portfolios are returned.
 * If specific portfolioId is requested, verifies user ownership.
 */
export async function getScopedPortfolioIds(req) {
  const userId = req.user.id;
  const userPortfolios = await db.prepare('SELECT id, profile_name, broker_name FROM portfolios WHERE user_id = ?').all(userId);
  const userPortfolioIds = userPortfolios.map(p => p.id);

  const reqPortfolioId = req.query.portfolioId;

  if (!reqPortfolioId || reqPortfolioId === 'ALL') {
    return {
      portfolioIds: userPortfolioIds,
      portfolios: userPortfolios,
      isCombined: true,
      valid: true
    };
  }

  const numericId = parseInt(reqPortfolioId, 10);
  if (isNaN(numericId) || !userPortfolioIds.includes(numericId)) {
    return {
      portfolioIds: [],
      portfolios: userPortfolios,
      isCombined: false,
      valid: false
    };
  }

  return {
    portfolioIds: [numericId],
    portfolios: userPortfolios,
    isCombined: false,
    valid: true,
    activePortfolio: userPortfolios.find(p => p.id === numericId)
  };
}
