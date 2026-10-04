import express from 'express';
import { db } from '../db.js';
import { authenticateToken, getScopedPortfolioIds } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

// GET /api/ipos?portfolioId=
router.get('/', async (req, res) => {
  try {
    const scope = await getScopedPortfolioIds(req);
    if (!scope.valid || scope.portfolioIds.length === 0) {
      return res.json([]);
    }

    const placeholders = scope.portfolioIds.map(() => '?').join(',');
    const query = `
      SELECT 
        i.*,
        p.profile_name,
        p.broker_name
      FROM ipo_tracker i
      JOIN portfolios p ON i.portfolio_id = p.id
      WHERE i.portfolio_id IN (${placeholders})
      ORDER BY i.created_at DESC
    `;

    const ipos = await db.prepare(query).all(...scope.portfolioIds);

    const enriched = ipos.map(item => {
      const blockedAmount = Number((item.lots_applied * item.lot_size * item.issue_price).toFixed(2));
      const totalShares = item.lots_applied * item.lot_size;
      const allottedShares = item.status === 'ALLOTTED' ? totalShares : 0;
      
      let listingGain = 0;
      let listingGainPct = 0;

      if (item.status === 'ALLOTTED' && item.listing_price !== null && item.listing_price !== undefined) {
        listingGain = Number(((item.listing_price - item.issue_price) * allottedShares).toFixed(2));
        listingGainPct = item.issue_price > 0 ? Number((((item.listing_price - item.issue_price) / item.issue_price) * 100).toFixed(2)) : 0;
      }

      return {
        ...item,
        blocked_amount: blockedAmount,
        total_shares: totalShares,
        allotted_shares: allottedShares,
        listing_gain: listingGain,
        listing_gain_pct: listingGainPct
      };
    });

    return res.json(enriched);
  } catch (err) {
    console.error('Fetch IPOs error:', err);
    return res.status(500).json({ error: 'Failed to fetch IPO applications' });
  }
});

// POST /api/ipos
router.post('/', async (req, res) => {
  try {
    const {
      portfolio_id,
      company_name,
      issue_price,
      lot_size,
      lots_applied,
      status = 'APPLIED',
      listing_price = null,
      allotment_date = null
    } = req.body;

    if (!portfolio_id || !company_name || issue_price === undefined || lot_size === undefined || lots_applied === undefined) {
      return res.status(400).json({ error: 'portfolio_id, company_name, issue_price, lot_size, and lots_applied are required' });
    }

    const portfolio = await db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').get(portfolio_id, req.user.id);
    if (!portfolio) {
      return res.status(403).json({ error: 'Invalid or unauthorized portfolio' });
    }

    const stmt = db.prepare(`
      INSERT INTO ipo_tracker (portfolio_id, company_name, issue_price, lot_size, lots_applied, status, listing_price, allotment_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      portfolio_id,
      company_name.trim(),
      parseFloat(issue_price),
      parseInt(lot_size, 10),
      parseInt(lots_applied, 10),
      status,
      listing_price !== null && listing_price !== undefined && listing_price !== '' ? parseFloat(listing_price) : null,
      allotment_date ? allotment_date.trim() : null
    );

    const newIpo = await db.prepare(`
      SELECT i.*, p.profile_name, p.broker_name
      FROM ipo_tracker i
      JOIN portfolios p ON i.portfolio_id = p.id
      WHERE i.id = ?
    `).get(result.lastInsertRowid);

    return res.status(201).json(newIpo);
  } catch (err) {
    console.error('Create IPO error:', err);
    return res.status(500).json({ error: 'Failed to create IPO application' });
  }
});

// PATCH /api/ipos/:id
router.patch('/:id', async (req, res) => {
  try {
    const ipoId = req.params.id;
    const { status, listing_price, allotment_date } = req.body;

    const existing = await db.prepare(`
      SELECT i.* FROM ipo_tracker i
      JOIN portfolios p ON i.portfolio_id = p.id
      WHERE i.id = ? AND p.user_id = ?
    `).get(ipoId, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'IPO record not found or unauthorized' });
    }

    const newStatus = status !== undefined ? status : existing.status;
    const newListingPrice = listing_price !== undefined ? (listing_price === '' ? null : parseFloat(listing_price)) : existing.listing_price;
    const newAllotmentDate = allotment_date !== undefined ? allotment_date : existing.allotment_date;

    await db.prepare(`
      UPDATE ipo_tracker
      SET status = ?, listing_price = ?, allotment_date = ?
      WHERE id = ?
    `).run(newStatus, newListingPrice, newAllotmentDate, ipoId);

    const updated = await db.prepare(`
      SELECT i.*, p.profile_name, p.broker_name
      FROM ipo_tracker i
      JOIN portfolios p ON i.portfolio_id = p.id
      WHERE i.id = ?
    `).get(ipoId);

    return res.json({
      message: 'IPO status updated successfully',
      ipo: updated
    });
  } catch (err) {
    console.error('Update IPO error:', err);
    return res.status(500).json({ error: 'Failed to update IPO record' });
  }
});

// DELETE /api/ipos/:id
router.delete('/:id', async (req, res) => {
  try {
    const ipoId = req.params.id;
    const existing = await db.prepare(`
      SELECT i.id FROM ipo_tracker i
      JOIN portfolios p ON i.portfolio_id = p.id
      WHERE i.id = ? AND p.user_id = ?
    `).get(ipoId, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'IPO record not found or unauthorized' });
    }

    await db.prepare('DELETE FROM ipo_tracker WHERE id = ?').run(ipoId);
    return res.json({ message: 'IPO application deleted successfully' });
  } catch (err) {
    console.error('Delete IPO error:', err);
    return res.status(500).json({ error: 'Failed to delete IPO record' });
  }
});

export default router;
