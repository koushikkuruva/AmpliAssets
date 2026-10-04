import React, { useState } from 'react';
import { api } from '../api/client';
import { X, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import { formatINR, formatPct } from '../utils/formatters';

export default function UpdateAllotmentModal({ ipo, onClose, onSuccess }) {
  const [status, setStatus] = useState(ipo.status);
  const [listingPrice, setListingPrice] = useState(ipo.listing_price || '');
  const [allotmentDate, setAllotmentDate] = useState(ipo.allotment_date || new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const totalShares = ipo.lots_applied * ipo.lot_size;
  const lp = parseFloat(listingPrice) || 0;
  const gain = status === 'ALLOTTED' && lp > 0 ? (lp - ipo.issue_price) * totalShares : 0;
  const gainPct = status === 'ALLOTTED' && lp > 0 && ipo.issue_price > 0 ? ((lp - ipo.issue_price) / ipo.issue_price) * 100 : 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await api.updateIpo(ipo.id, {
        status,
        listing_price: lp > 0 ? lp : null,
        allotment_date: allotmentDate || null
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update IPO status');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">Update Allotment Status</h2>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              {ipo.company_name} • {ipo.profile_name}
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} id="form-update-allotment">
          <div className="modal-body">
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--red-loss-bg)', border: '1px solid var(--red-loss-border)', borderRadius: 'var(--radius-sm)', color: 'var(--red-loss)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Allotment Status</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '0.5rem' }}>
                <button
                  type="button"
                  className={`btn-secondary ${status === 'APPLIED' ? 'active' : ''}`}
                  style={{
                    background: status === 'APPLIED' ? 'var(--amber-mandate-bg)' : undefined,
                    borderColor: status === 'APPLIED' ? 'var(--amber-mandate)' : undefined,
                    color: status === 'APPLIED' ? 'var(--amber-mandate)' : undefined,
                    justifyContent: 'center'
                  }}
                  onClick={() => setStatus('APPLIED')}
                  id="btn-status-applied"
                >
                  <Clock size={14} />
                  <span>Applied</span>
                </button>

                <button
                  type="button"
                  className={`btn-secondary ${status === 'ALLOTTED' ? 'active' : ''}`}
                  style={{
                    background: status === 'ALLOTTED' ? 'var(--green-gain-bg)' : undefined,
                    borderColor: status === 'ALLOTTED' ? 'var(--green-gain)' : undefined,
                    color: status === 'ALLOTTED' ? 'var(--green-gain)' : undefined,
                    justifyContent: 'center'
                  }}
                  onClick={() => setStatus('ALLOTTED')}
                  id="btn-status-allotted"
                >
                  <CheckCircle size={14} />
                  <span>Allotted</span>
                </button>

                <button
                  type="button"
                  className={`btn-secondary ${status === 'NOT_ALLOTTED' ? 'active' : ''}`}
                  style={{
                    background: status === 'NOT_ALLOTTED' ? 'rgba(255, 255, 255, 0.1)' : undefined,
                    borderColor: status === 'NOT_ALLOTTED' ? 'var(--text-muted)' : undefined,
                    color: status === 'NOT_ALLOTTED' ? '#cbd5e1' : undefined,
                    justifyContent: 'center'
                  }}
                  onClick={() => setStatus('NOT_ALLOTTED')}
                  id="btn-status-not-allotted"
                >
                  <XCircle size={14} />
                  <span>Not Allotted</span>
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Allotment / Decision Date</label>
              <input
                type="date"
                className="form-input"
                value={allotmentDate}
                onChange={e => setAllotmentDate(e.target.value)}
                id="input-allotment-date"
              />
            </div>

            {status === 'ALLOTTED' && (
              <>
                <div className="form-group">
                  <label className="form-label">Listing Day Price (₹) (Optional)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="e.g. 750 (Leave blank if not yet listed)"
                    value={listingPrice}
                    onChange={e => setListingPrice(e.target.value)}
                    id="input-listing-price"
                  />
                </div>

                {lp > 0 && (
                  <div style={{ background: gain >= 0 ? 'var(--green-gain-bg)' : 'var(--red-loss-bg)', border: `1px solid ${gain >= 0 ? 'var(--green-gain-border)' : 'var(--red-loss-border)'}`, borderRadius: 'var(--radius-md)', padding: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontSize: '0.78rem', color: gain >= 0 ? 'var(--green-gain)' : 'var(--red-loss)', fontWeight: 600 }}>
                        {gain >= 0 ? 'Listing Day Profit' : 'Listing Day Loss'} ({totalShares} shares)
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        Return: {formatPct(gainPct)}
                      </div>
                    </div>
                    <div className="font-mono" style={{ fontSize: '1.25rem', fontWeight: 700, color: gain >= 0 ? 'var(--green-gain)' : 'var(--red-loss)' }}>
                      {formatINR(gain)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              id="btn-save-allotment"
            >
              <span>{loading ? 'Saving...' : 'Save Allotment Status'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
