import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, PlusCircle } from 'lucide-react';

const COMMON_SECTORS = [
  'Banking',
  'Information Technology',
  'Energy',
  'FMCG',
  'Automobile',
  'Pharmaceuticals',
  'Metals & Mining',
  'Infrastructure',
  'Telecommunication',
  'Financial Services',
  'Other'
];

export default function AddStockModal({ onClose, onSuccess }) {
  const { portfolios, activePortfolioId } = useAuth();

  const defaultPortfolioId = activePortfolioId !== 'ALL' 
    ? activePortfolioId 
    : (portfolios[0]?.id || '');

  const [portfolioId, setPortfolioId] = useState(defaultPortfolioId);
  const [symbol, setSymbol] = useState('');
  const [exchange, setExchange] = useState('NSE');
  const [sector, setSector] = useState('Information Technology');
  const [quantity, setQuantity] = useState('');
  const [avgBuyPrice, setAvgBuyPrice] = useState('');
  const [cmp, setCmp] = useState('');
  const [corporateNote, setCorporateNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!symbol || !quantity || !avgBuyPrice) {
      setError('Please provide Symbol, Quantity, and Average Buy Price');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.addEquity({
        portfolio_id: Number(portfolioId),
        symbol: symbol.toUpperCase().trim(),
        exchange,
        sector,
        quantity: parseFloat(quantity),
        avg_buy_price: parseFloat(avgBuyPrice),
        current_market_price: cmp !== '' && !isNaN(parseFloat(cmp)) ? parseFloat(cmp) : undefined,
        corporate_action_note: corporateNote.trim() || null
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add holding');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <PlusCircle size={20} className="text-gain" />
            <h2 className="modal-title">Add Equity Holding</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} id="form-add-stock">
          <div className="modal-body">
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--red-loss-bg)', border: '1px solid var(--red-loss-border)', borderRadius: 'var(--radius-sm)', color: 'var(--red-loss)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Target Demat Portfolio</label>
              <select 
                className="form-select"
                value={portfolioId}
                onChange={e => setPortfolioId(e.target.value)}
                required
                id="select-holding-portfolio"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.profile_name} ({p.broker_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Stock Symbol</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="e.g. RELIANCE, TCS"
                  value={symbol}
                  onChange={e => setSymbol(e.target.value)}
                  required
                  autoFocus
                  id="input-stock-symbol"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Exchange</label>
                <select 
                  className="form-select"
                  value={exchange}
                  onChange={e => setExchange(e.target.value)}
                  id="select-stock-exchange"
                >
                  <option value="NSE">NSE</option>
                  <option value="BSE">BSE</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Industry Sector</label>
              <select 
                className="form-select"
                value={sector}
                onChange={e => setSector(e.target.value)}
                id="select-stock-sector"
              >
                {COMMON_SECTORS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Quantity (Shares)</label>
                <input 
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 50"
                  value={quantity}
                  onChange={e => setQuantity(e.target.value)}
                  required
                  min="0.001"
                  id="input-stock-quantity"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Avg Buy Price (₹)</label>
                <input 
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 1450.50"
                  value={avgBuyPrice}
                  onChange={e => setAvgBuyPrice(e.target.value)}
                  required
                  min="0.01"
                  id="input-stock-avg-price"
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Current Market Price (CMP ₹) (Optional)</label>
              <input 
                type="number"
                step="any"
                className="form-input"
                placeholder="Auto-fetched from NSE/BSE if left blank"
                value={cmp}
                onChange={e => setCmp(e.target.value)}
                id="input-stock-cmp"
              />
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Auto-fetched live from NSE/BSE if left blank.
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Corporate Action / Notes (Optional)</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Bought during dip, demerger candidate"
                value={corporateNote}
                onChange={e => setCorporateNote(e.target.value)}
                id="input-stock-note"
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
              id="btn-submit-add-stock"
            >
              <PlusCircle size={16} />
              <span>{loading ? 'Adding...' : 'Add to Holdings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
