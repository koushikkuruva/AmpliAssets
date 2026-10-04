import React, { useState } from 'react';
import { api } from '../api/client';
import { X, GitCommit, ArrowRight, CheckCircle2 } from 'lucide-react';
import { formatINR } from '../utils/formatters';

export default function CorporateActionModal({ holding: initialHolding, holdings = [], onClose, onSuccess }) {
  const [selectedStockId, setSelectedStockId] = useState(initialHolding?.id || holdings[0]?.id || '');
  const holding = (holdings.length > 0 ? (holdings.find(h => h.id === Number(selectedStockId)) || initialHolding || holdings[0]) : initialHolding) || {};

  const [actionType, setActionType] = useState('SPLIT'); // 'SPLIT', 'BONUS', 'DEMERGER', 'CUSTOM'
  
  // Split params
  const [splitMultiplier, setSplitMultiplier] = useState(10); // 1:10
  
  // Bonus params
  const [bonusRatio, setBonusRatio] = useState(1); // 1:1 bonus
  
  // Demerger params
  const [demergerRetention, setDemergerRetention] = useState(60); // 60% retained in parent

  // Custom params
  const [customQty, setCustomQty] = useState(holding.quantity || 0);
  const [customAvgPrice, setCustomAvgPrice] = useState(holding.avg_buy_price || 0);

  React.useEffect(() => {
    if (holding?.quantity !== undefined) {
      setCustomQty(holding.quantity);
      setCustomAvgPrice(holding.avg_buy_price);
    }
  }, [holding?.id]);

  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Calculate projected new values
  let newQty = holding.quantity;
  let newPrice = holding.avg_buy_price;

  if (actionType === 'SPLIT') {
    const mult = parseFloat(splitMultiplier) || 1;
    newQty = holding.quantity * mult;
    newPrice = mult > 0 ? holding.avg_buy_price / mult : holding.avg_buy_price;
  } else if (actionType === 'BONUS') {
    const b = parseFloat(bonusRatio) || 1;
    newQty = holding.quantity * (1 + b);
    newPrice = newQty > 0 ? (holding.quantity * holding.avg_buy_price) / newQty : holding.avg_buy_price;
  } else if (actionType === 'DEMERGER') {
    const pct = parseFloat(demergerRetention) / 100 || 1;
    newQty = holding.quantity;
    newPrice = holding.avg_buy_price * pct;
  } else if (actionType === 'CUSTOM') {
    newQty = parseFloat(customQty) || holding.quantity;
    newPrice = parseFloat(customAvgPrice) || holding.avg_buy_price;
  }

  const oldTotalCost = holding.quantity * holding.avg_buy_price;
  const newTotalCost = newQty * newPrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let payload = {
        action_type: actionType,
        action_note: note.trim() || undefined
      };

      if (actionType === 'SPLIT') {
        payload.multiplier = splitMultiplier;
        payload.ratio = `1:${splitMultiplier}`;
      } else if (actionType === 'BONUS') {
        payload.multiplier = bonusRatio;
        payload.ratio = `${bonusRatio}:1`;
      } else if (actionType === 'DEMERGER') {
        payload.cost_ratio = demergerRetention / 100;
        payload.action_note = note.trim() || `Demerger: Cost basis reduced to ${demergerRetention}% of original`;
      } else if (actionType === 'CUSTOM') {
        payload.new_quantity = newQty;
        payload.new_avg_buy_price = newPrice;
      }

      await api.updateCorporateAction(holding.id, payload);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to apply corporate action');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" style={{ maxWidth: '580px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <GitCommit size={20} className="text-cyan" />
            <div>
              <h2 className="modal-title">Corporate Action Adjuster</h2>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {holding.symbol} • {holding.profile_name} ({holding.broker_name})
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} id="form-corporate-action">
          <div className="modal-body">
            {error && (
              <div style={{ padding: '0.75rem', background: 'var(--red-loss-bg)', border: '1px solid var(--red-loss-border)', borderRadius: 'var(--radius-sm)', color: 'var(--red-loss)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            {holdings.length > 1 && (
              <div className="form-group">
                <label className="form-label">Select Stock Holding</label>
                <select
                  className="form-select"
                  value={holding?.id || ''}
                  onChange={e => setSelectedStockId(e.target.value)}
                  id="select-ca-stock"
                >
                  {holdings.map(h => (
                    <option key={h.id} value={h.id}>
                      {h.symbol} ({h.profile_name} - {h.broker_name}) • Qty: {h.quantity} • Buy: ₹{h.avg_buy_price}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Corporate Action Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '0.5rem' }}>
                {[
                  { id: 'SPLIT', label: 'Stock Split' },
                  { id: 'BONUS', label: 'Bonus Issue' },
                  { id: 'DEMERGER', label: 'Demerger Cost' },
                  { id: 'CUSTOM', label: 'Custom' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`btn-secondary ${actionType === item.id ? 'active' : ''}`}
                    style={{
                      justifyContent: 'center',
                      background: actionType === item.id ? 'rgba(99, 102, 241, 0.2)' : undefined,
                      borderColor: actionType === item.id ? '#6366f1' : undefined,
                      color: actionType === item.id ? '#c7d2fe' : undefined
                    }}
                    onClick={() => setActionType(item.id)}
                    id={`btn-ca-type-${item.id.toLowerCase()}`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Config depending on type */}
            {actionType === 'SPLIT' && (
              <div className="form-group">
                <label className="form-label">Split Ratio (New shares per 1 old share)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[2, 5, 10].map(m => (
                    <button
                      key={m}
                      type="button"
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        background: splitMultiplier === m ? 'rgba(16, 185, 129, 0.2)' : undefined,
                        borderColor: splitMultiplier === m ? 'var(--green-gain)' : undefined,
                        color: splitMultiplier === m ? 'var(--green-gain)' : undefined
                      }}
                      onClick={() => setSplitMultiplier(m)}
                    >
                      1 : {m} Split
                    </button>
                  ))}
                </div>
              </div>
            )}

            {actionType === 'BONUS' && (
              <div className="form-group">
                <label className="form-label">Bonus Ratio (Bonus shares awarded per 1 share held)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {[1, 2].map(b => (
                    <button
                      key={b}
                      type="button"
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        background: bonusRatio === b ? 'rgba(16, 185, 129, 0.2)' : undefined,
                        borderColor: bonusRatio === b ? 'var(--green-gain)' : undefined,
                        color: bonusRatio === b ? 'var(--green-gain)' : undefined
                      }}
                      onClick={() => setBonusRatio(b)}
                    >
                      {b} : 1 Bonus
                    </button>
                  ))}
                </div>
              </div>
            )}

            {actionType === 'DEMERGER' && (
              <div className="form-group">
                <label className="form-label">
                  Parent Company Cost Basis Retention (% of original buy cost kept by {holding.symbol})
                </label>
                <input
                  type="number"
                  className="form-input"
                  min="1"
                  max="99"
                  value={demergerRetention}
                  onChange={e => setDemergerRetention(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 60 (Remaining 40% transfers to demerged entity)"
                  id="input-demerger-retention"
                />
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Example: ITC Hotels demerger where parent ITC retains ~80-90% cost basis and spun-off entity gets the rest.
                </div>
              </div>
            )}

            {actionType === 'CUSTOM' && (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">New Total Quantity</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={customQty}
                    onChange={e => setCustomQty(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">New Avg Buy Price (₹)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={customAvgPrice}
                    onChange={e => setCustomAvgPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
            )}

            {/* Impact Calculation Preview */}
            <div style={{ background: '#0a0e17', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Mathematical Impact Preview
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.75rem', alignItems: 'center', fontSize: '0.88rem' }}>
                <div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Current Position</div>
                  <div className="font-mono" style={{ fontWeight: 600 }}>{holding.quantity} shares</div>
                  <div className="font-mono" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>@ {formatINR(holding.avg_buy_price)}</div>
                  <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total: {formatINR(oldTotalCost)}</div>
                </div>

                <div style={{ color: '#818cf8', display: 'flex', justifyContent: 'center' }}>
                  <ArrowRight size={20} />
                </div>

                <div>
                  <div style={{ color: 'var(--green-gain)', fontSize: '0.75rem', fontWeight: 600 }}>After Action</div>
                  <div className="font-mono" style={{ fontWeight: 700, color: 'var(--green-gain)' }}>{newQty} shares</div>
                  <div className="font-mono" style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>@ {formatINR(newPrice)}</div>
                  <div className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total: {formatINR(newTotalCost)}</div>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Audit / Action Note (Optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Approved in AGM on 15 Oct, Record date 28 Oct"
                value={note}
                onChange={e => setNote(e.target.value)}
                id="input-ca-note"
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
              id="btn-apply-corporate-action"
            >
              <CheckCircle2 size={16} />
              <span>{loading ? 'Adjusting...' : 'Apply Corporate Action'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
