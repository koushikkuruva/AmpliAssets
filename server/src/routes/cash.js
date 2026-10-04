import express from 'express';
import { db } from '../db.js';
import { authenticateToken, getScopedPortfolioIds } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticateToken);

const VALID_SCHEME_TYPES = ['CHITTI', 'FD_RD', 'SAVINGS_CASH', 'GOLD_SCHEME', 'OTHER'];

// GET /api/cash?portfolioId=
router.get('/', async (req, res) => {
  try {
    const scope = await getScopedPortfolioIds(req);
    if (!scope.valid || scope.portfolioIds.length === 0) {
      return res.json([]);
    }

    const placeholders = scope.portfolioIds.map(() => '?').join(',');
    const query = `
      SELECT 
        c.*,
        p.profile_name,
        p.broker_name
      FROM cash_schemes c
      JOIN portfolios p ON c.portfolio_id = p.id
      WHERE c.portfolio_id IN (${placeholders})
      ORDER BY c.current_value DESC
    `;

    const schemes = await db.prepare(query).all(...scope.portfolioIds);

    const enriched = schemes.map(s => {
      const pnl = Number((s.current_value - s.invested_amount).toFixed(2));
      const pnlPct = s.invested_amount > 0 ? Number(((pnl / s.invested_amount) * 100).toFixed(2)) : 0;
      
      // Calculate tenure progress if in "Month X of Y" format
      let progressPct = null;
      if (s.tenure_info) {
        const match = s.tenure_info.match(/Month\s+(\d+)\s+of\s+(\d+)/i);
        if (match) {
          const current = parseInt(match[1], 10);
          const total = parseInt(match[2], 10);
          if (total > 0) {
            progressPct = Math.min(100, Math.round((current / total) * 100));
          }
        }
      }

      return {
        ...s,
        unrealized_pnl: pnl,
        pnl_percentage: pnlPct,
        tenure_progress_pct: progressPct
      };
    });

    return res.json(enriched);
  } catch (err) {
    console.error('Fetch cash schemes error:', err);
    return res.status(500).json({ error: 'Failed to fetch cash & traditional schemes' });
  }
});

// POST /api/cash
router.post('/', async (req, res) => {
  try {
    const {
      portfolio_id,
      scheme_name,
      scheme_type = 'CHITTI',
      invested_amount,
      current_value,
      target_maturity_value = null,
      monthly_commitment = 0,
      tenure_info = '',
      notes = ''
    } = req.body;

    if (!portfolio_id || !scheme_name || invested_amount === undefined || current_value === undefined) {
      return res.status(400).json({ 
        error: 'portfolio_id, scheme_name, invested_amount, and current_value are required' 
      });
    }

    if (!VALID_SCHEME_TYPES.includes(scheme_type)) {
      return res.status(400).json({ 
        error: `scheme_type must be one of: ${VALID_SCHEME_TYPES.join(', ')}` 
      });
    }

    const portfolio = await db.prepare('SELECT id FROM portfolios WHERE id = ? AND user_id = ?').get(portfolio_id, req.user.id);
    if (!portfolio) {
      return res.status(403).json({ error: 'Invalid or unauthorized portfolio' });
    }

    const stmt = db.prepare(`
      INSERT INTO cash_schemes (
        portfolio_id, scheme_name, scheme_type, invested_amount, current_value, 
        target_maturity_value, monthly_commitment, tenure_info, notes
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = await stmt.run(
      portfolio_id,
      scheme_name.trim(),
      scheme_type,
      parseFloat(invested_amount),
      parseFloat(current_value),
      target_maturity_value !== null && target_maturity_value !== '' ? parseFloat(target_maturity_value) : null,
      parseFloat(monthly_commitment) || 0,
      tenure_info ? tenure_info.trim() : null,
      notes ? notes.trim() : null
    );

    const created = await db.prepare(`
      SELECT c.*, p.profile_name, p.broker_name
      FROM cash_schemes c
      JOIN portfolios p ON c.portfolio_id = p.id
      WHERE c.id = ?
    `).get(result.lastInsertRowid);

    const pnl = Number((created.current_value - created.invested_amount).toFixed(2));
    const pnlPct = created.invested_amount > 0 ? Number(((pnl / created.invested_amount) * 100).toFixed(2)) : 0;

    return res.status(201).json({
      ...created,
      unrealized_pnl: pnl,
      pnl_percentage: pnlPct
    });
  } catch (err) {
    console.error('Add cash scheme error:', err);
    return res.status(500).json({ error: 'Failed to create cash/chitti scheme' });
  }
});

// PATCH /api/cash/:id
router.patch('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await db.prepare(`
      SELECT c.* FROM cash_schemes c
      JOIN portfolios p ON c.portfolio_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Cash scheme not found or unauthorized' });
    }

    const {
      scheme_name,
      scheme_type,
      invested_amount,
      current_value,
      target_maturity_value,
      monthly_commitment,
      tenure_info,
      notes
    } = req.body;

    const updatedSchemeName = scheme_name !== undefined ? scheme_name.trim() : existing.scheme_name;
    const updatedSchemeType = scheme_type !== undefined ? scheme_type : existing.scheme_type;
    const updatedInvested = invested_amount !== undefined ? parseFloat(invested_amount) : existing.invested_amount;
    const updatedCurrent = current_value !== undefined ? parseFloat(current_value) : existing.current_value;
    const updatedTarget = target_maturity_value !== undefined 
      ? (target_maturity_value !== '' && target_maturity_value !== null ? parseFloat(target_maturity_value) : null)
      : existing.target_maturity_value;
    const updatedMonthly = monthly_commitment !== undefined ? parseFloat(monthly_commitment) : existing.monthly_commitment;
    const updatedTenure = tenure_info !== undefined ? (tenure_info ? tenure_info.trim() : null) : existing.tenure_info;
    const updatedNotes = notes !== undefined ? (notes ? notes.trim() : null) : existing.notes;

    if (scheme_type && !VALID_SCHEME_TYPES.includes(scheme_type)) {
      return res.status(400).json({ 
        error: `scheme_type must be one of: ${VALID_SCHEME_TYPES.join(', ')}` 
      });
    }

    await db.prepare(`
      UPDATE cash_schemes
      SET scheme_name = ?, scheme_type = ?, invested_amount = ?, current_value = ?,
          target_maturity_value = ?, monthly_commitment = ?, tenure_info = ?, notes = ?
      WHERE id = ?
    `).run(
      updatedSchemeName,
      updatedSchemeType,
      updatedInvested,
      updatedCurrent,
      updatedTarget,
      updatedMonthly,
      updatedTenure,
      updatedNotes,
      id
    );

    const updated = await db.prepare(`
      SELECT c.*, p.profile_name, p.broker_name
      FROM cash_schemes c
      JOIN portfolios p ON c.portfolio_id = p.id
      WHERE c.id = ?
    `).get(id);

    const pnl = Number((updated.current_value - updated.invested_amount).toFixed(2));
    const pnlPct = updated.invested_amount > 0 ? Number(((pnl / updated.invested_amount) * 100).toFixed(2)) : 0;

    return res.json({
      ...updated,
      unrealized_pnl: pnl,
      pnl_percentage: pnlPct
    });
  } catch (err) {
    console.error('Update cash scheme error:', err);
    return res.status(500).json({ error: 'Failed to update cash scheme' });
  }
});

// DELETE /api/cash/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await db.prepare(`
      SELECT c.id FROM cash_schemes c
      JOIN portfolios p ON c.portfolio_id = p.id
      WHERE c.id = ? AND p.user_id = ?
    `).get(id, req.user.id);

    if (!existing) {
      return res.status(404).json({ error: 'Cash scheme not found or unauthorized' });
    }

    await db.prepare('DELETE FROM cash_schemes WHERE id = ?').run(id);
    return res.json({ message: 'Cash scheme removed successfully' });
  } catch (err) {
    console.error('Delete cash scheme error:', err);
    return res.status(500).json({ error: 'Failed to delete cash scheme' });
  }
});

export default router;
