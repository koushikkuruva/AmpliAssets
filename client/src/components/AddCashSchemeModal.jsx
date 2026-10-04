import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, Landmark, PlusCircle, AlertCircle } from 'lucide-react';
import { formatINR } from '../utils/formatters';

const SCHEME_TYPES = [
  { id: 'CHITTI', label: 'Chitti / Chit Fund', desc: 'Traditional rotating savings & credit pool' },
  { id: 'FD_RD', label: 'Fixed / Recurring Deposit', desc: 'Bank or NBFC term deposit' },
  { id: 'SAVINGS_CASH', label: 'Liquid Savings / Cash Buffer', desc: 'High-yield savings or cash emergency fund' },
  { id: 'GOLD_SCHEME', label: 'Jeweller Gold Scheme', desc: '11-month gold accumulation scheme' },
  { id: 'OTHER', label: 'Other Traditional Scheme', desc: 'Post office, PPF, or community scheme' }
];

export default function AddCashSchemeModal({ onClose, onSuccess }) {
  const { portfolios, activePortfolioId } = useAuth();

  const defaultPortfolioId = activePortfolioId !== 'ALL'
    ? activePortfolioId
    : (portfolios[0]?.id || '');

  const [portfolioId, setPortfolioId] = useState(defaultPortfolioId);
  const [schemeName, setSchemeName] = useState('');
  const [schemeType, setSchemeType] = useState('CHITTI');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [targetMaturity, setTargetMaturity] = useState('');
  const [monthlyCommitment, setMonthlyCommitment] = useState('');
  const [tenureInfo, setTenureInfo] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!schemeName.trim() || investedAmount === '' || currentValue === '') {
      setError('Please provide Scheme Name, Invested Amount, and Current Value');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.addCash({
        portfolio_id: Number(portfolioId),
        scheme_name: schemeName.trim(),
        scheme_type: schemeType,
        invested_amount: parseFloat(investedAmount),
        current_value: parseFloat(currentValue),
        target_maturity_value: targetMaturity !== '' ? parseFloat(targetMaturity) : null,
        monthly_commitment: monthlyCommitment !== '' ? parseFloat(monthlyCommitment) : 0,
        tenure_info: tenureInfo.trim() || null,
        notes: notes.trim() || null
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add cash/chitti scheme');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Landmark size={20} className="text-amber" />
            <h2 className="modal-title">Add Cash & Traditional Scheme</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="btn-close-add-cash">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} id="form-add-cash">
          <div className="modal-body">
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--red-loss-bg)', border: '1px solid var(--red-loss-border)', borderRadius: 'var(--radius-sm)', color: 'var(--red-loss)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Target Family Profile</label>
              <select
                className="form-select"
                value={portfolioId}
                onChange={e => setPortfolioId(e.target.value)}
                required
                id="select-cash-portfolio"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.profile_name} ({p.broker_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Scheme Type</label>
              <select
                className="form-select"
                value={schemeType}
                onChange={e => setSchemeType(e.target.value)}
                id="select-cash-type"
              >
                {SCHEME_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Scheme / Chitti Name</label>
              <input
                type="text"
                className="form-input"
                placeholder={schemeType === 'CHITTI' ? 'e.g. Family Chitti - 5L Pot' : 'e.g. HDFC Emergency FD'}
                value={schemeName}
                onChange={e => setSchemeName(e.target.value)}
                required
                autoFocus
                id="input-cash-name"
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Invested / Paid Amount (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 300000"
                  value={investedAmount}
                  onChange={e => {
                    setInvestedAmount(e.target.value);
                    if (!currentValue) setCurrentValue(e.target.value);
                  }}
                  required
                  min="0"
                  id="input-cash-invested"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Accrued Value (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 315000"
                  value={currentValue}
                  onChange={e => setCurrentValue(e.target.value)}
                  required
                  min="0"
                  id="input-cash-current"
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Target Maturity Pool (₹) (Optional)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 500000 (Full Pot Value)"
                  value={targetMaturity}
                  onChange={e => setTargetMaturity(e.target.value)}
                  id="input-cash-maturity"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Monthly Outflow / SIP (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 25000"
                  value={monthlyCommitment}
                  onChange={e => setMonthlyCommitment(e.target.value)}
                  id="input-cash-monthly"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Tenure / Progress / Interest Rate</label>
              <input
                type="text"
                className="form-input"
                placeholder={schemeType === 'CHITTI' ? 'e.g. Month 12 of 20' : 'e.g. 7.25% p.a. (Maturity Nov 2025)'}
                value={tenureInfo}
                onChange={e => setTenureInfo(e.target.value)}
                id="input-cash-tenure"
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Tip: Use "Month X of Y" (e.g. Month 12 of 20) to automatically render a visual progress bar!
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Notes & Auction Details (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Planned auction bid at Month 16; Managed by Uncle"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                id="input-cash-notes"
              />
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
              id="btn-submit-add-cash"
            >
              <PlusCircle size={16} />
              <span>{loading ? 'Adding...' : 'Add to Schemes Vault'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
