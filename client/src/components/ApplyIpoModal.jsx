import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, Send, Lock } from 'lucide-react';
import { formatINR } from '../utils/formatters';

export default function ApplyIpoModal({ onClose, onSuccess }) {
  const { portfolios, activePortfolioId } = useAuth();

  const defaultPortfolioId = activePortfolioId !== 'ALL' 
    ? activePortfolioId 
    : (portfolios[0]?.id || '');

  const [portfolioId, setPortfolioId] = useState(defaultPortfolioId);
  const [companyName, setCompanyName] = useState('');
  const [issuePrice, setIssuePrice] = useState('');
  const [lotSize, setLotSize] = useState('15');
  const [lotsApplied, setLotsApplied] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const ip = parseFloat(issuePrice) || 0;
  const ls = parseInt(lotSize, 10) || 0;
  const la = parseInt(lotsApplied, 10) || 0;
  const blockedMandate = ip * ls * la;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!companyName.trim() || !issuePrice || !lotSize || !lotsApplied) {
      setError('Please fill in all IPO application fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.addIpo({
        portfolio_id: Number(portfolioId),
        company_name: companyName.trim(),
        issue_price: ip,
        lot_size: ls,
        lots_applied: la,
        status: 'APPLIED'
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit IPO application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Lock size={20} className="text-amber" />
            <h2 className="modal-title">Apply for IPO (UPI Mandate)</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} id="form-apply-ipo">
          <div className="modal-body">
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--red-loss-bg)', border: '1px solid var(--red-loss-border)', borderRadius: 'var(--radius-sm)', color: 'var(--red-loss)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Applying Family Demat Account</label>
              <select
                className="form-select"
                value={portfolioId}
                onChange={e => setPortfolioId(e.target.value)}
                required
                id="select-ipo-portfolio"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.profile_name} ({p.broker_name} Demat)
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Company / IPO Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Acme Tech Limited"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                required
                autoFocus
                id="input-ipo-company"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Issue Price / Cut-off (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 500"
                  value={issuePrice}
                  onChange={e => setIssuePrice(e.target.value)}
                  required
                  min="1"
                  id="input-ipo-price"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Lot Size (Shares/Lot)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 30"
                  value={lotSize}
                  onChange={e => setLotSize(e.target.value)}
                  required
                  min="1"
                  id="input-ipo-lot-size"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Number of Lots Applied</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 1"
                value={lotsApplied}
                onChange={e => setLotsApplied(e.target.value)}
                required
                min="1"
                id="input-ipo-lots-applied"
              />
            </div>

            {/* Blocked Mandate Calculation */}
            <div style={{ background: 'var(--amber-mandate-bg)', border: '1px solid var(--amber-mandate-border)', borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.78rem', color: 'var(--amber-mandate)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  UPI ASBA Blocked Amount
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {la * ls} total shares requested
                </div>
              </div>
              <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--amber-mandate)' }}>
                {formatINR(blockedMandate)}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              id="btn-submit-apply-ipo"
            >
              <Send size={16} />
              <span>{loading ? 'Submitting...' : 'Confirm Mandate Application'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
