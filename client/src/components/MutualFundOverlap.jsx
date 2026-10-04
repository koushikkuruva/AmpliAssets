import React, { useState } from 'react';
import { 
  Layers, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  ShieldAlert, 
  ExternalLink,
  PlusCircle,
  X 
} from 'lucide-react';
import { formatINR, formatPct, formatCompactINR } from '../utils/formatters';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

export default function MutualFundOverlap({ overlapData, mfList, loading, onRefresh }) {
  const { portfolios, activePortfolioId } = useAuth();
  const [showAddMfModal, setShowAddMfModal] = useState(false);

  // New MF form states
  const defaultPortfolioId = activePortfolioId !== 'ALL' 
    ? activePortfolioId 
    : (portfolios[0]?.id || '');
  const [targetPortfolioId, setTargetPortfolioId] = useState(defaultPortfolioId);
  const [fundName, setFundName] = useState('');
  const [category, setCategory] = useState('Flexi Cap');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [topStocksInput, setTopStocksInput] = useState('');
  const [mfSubmitting, setMfSubmitting] = useState(false);
  const [mfError, setMfError] = useState('');

  const handleAddMf = async (e) => {
    e.preventDefault();
    if (!fundName.trim() || !investedAmount || !currentValue) {
      setMfError('Please provide Fund Name, Invested Amount, and Current Value');
      return;
    }

    setMfSubmitting(true);
    setMfError('');

    try {
      const topStocks = topStocksInput
        .split(',')
        .map(s => s.trim().toUpperCase())
        .filter(Boolean);

      await api.addMutualFund({
        portfolio_id: Number(targetPortfolioId),
        fund_name: fundName.trim(),
        category,
        invested_amount: parseFloat(investedAmount),
        current_value: parseFloat(currentValue),
        top_overlapping_stocks: topStocks
      });

      setShowAddMfModal(false);
      setFundName('');
      setInvestedAmount('');
      setCurrentValue('');
      setTopStocksInput('');
      onRefresh();
    } catch (err) {
      setMfError(err.message || 'Failed to add mutual fund');
    } finally {
      setMfSubmitting(false);
    }
  };

  const riskLevel = overlapData?.concentration_risk_level || 'LOW';

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Risk Banner & Overview */}
        <div className="content-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="brand-icon-box" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)' }}>
                <Layers size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>Direct Equity & Mutual Fund Overlap Analysis</h3>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Identifies concentrated stock exposures where you own shares both directly and via mutual funds.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Concentration Risk</div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {riskLevel === 'HIGH' && <span className="badge-loss"><AlertTriangle size={13} /> High Overlap Risk</span>}
                  {riskLevel === 'MODERATE' && <span className="badge-amber"><Info size={13} /> Moderate Overlap</span>}
                  {riskLevel === 'LOW' && <span className="badge-gain"><CheckCircle size={13} /> Well Diversified</span>}
                </div>
              </div>

              <button
                className="btn-secondary"
                onClick={() => setShowAddMfModal(true)}
                id="btn-add-mf-modal"
              >
                <PlusCircle size={15} className="text-cyan" />
                <span>+ Add Mutual Fund</span>
              </button>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', background: '#0a0e17', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct Stocks Owned</div>
              <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                {overlapData?.total_direct_stocks || 0}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overlapping Direct Stocks</div>
              <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--amber-mandate)' }}>
                {overlapData?.overlapping_stocks_count || 0}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Direct Value in Overlap</div>
              <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 700 }}>
                {formatINR(overlapData?.overlap_direct_value || 0)}
              </div>
            </div>

            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Overlap Ratio of Direct Equity</div>
              <div className="font-mono" style={{ fontSize: '1.35rem', fontWeight: 700, color: riskLevel === 'HIGH' ? 'var(--red-loss)' : riskLevel === 'MODERATE' ? 'var(--amber-mandate)' : 'var(--green-gain)' }}>
                {formatPct(overlapData?.overlap_direct_percentage || 0)}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Overlap Table */}
        <div className="content-card">
          <div className="card-toolbar">
            <h3 className="toolbar-title">Duplicated Stock Exposures (Direct + Mutual Funds)</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Stocks appearing in both your individual Demat and Fund Portfolios
            </div>
          </div>

          <div className="mobile-scroll-hint">
            <span style={{ fontWeight: 600 }}>Overlap Matrix</span>
            <span>Swipe horizontally to see mutual funds & weights &rarr;</span>
          </div>

          <div className="table-responsive">
            <table className="data-table" id="overlap-table">
              <thead>
                <tr>
                  <th>Stock Symbol</th>
                  <th>Sector</th>
                  <th style={{ textAlign: 'right' }}>Direct Shares</th>
                  <th style={{ textAlign: 'right' }}>Direct Holding Value</th>
                  <th style={{ textAlign: 'right' }}>Direct Weight</th>
                  <th>Held in Mutual Funds</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      Calculating portfolio overlap...
                    </td>
                  </tr>
                ) : !overlapData?.overlapping_stocks || overlapData.overlapping_stocks.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                      <div>No direct stock overlap detected with your mutual fund holdings!</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--green-gain)', marginTop: '0.4rem' }}>
                        Your direct equities and mutual fund choices are completely non-overlapping.
                      </div>
                    </td>
                  </tr>
                ) : (
                  overlapData.overlapping_stocks.map(item => (
                    <tr key={item.symbol} id={`row-overlap-${item.symbol}`}>
                      <td>
                        <span className="stock-symbol text-cyan">{item.symbol}</span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {item.sector}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }} className="font-mono">
                        {item.quantity}
                      </td>

                      <td style={{ textAlign: 'right' }} className="font-mono" style={{ fontWeight: 600 }}>
                        {formatINR(item.direct_value)}
                      </td>

                      <td style={{ textAlign: 'right' }} className="font-mono">
                        <span className="badge-amber">
                          {formatPct(item.direct_weight_pct)}
                        </span>
                      </td>

                      <td>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                          {item.funds_holding.map(f => (
                            <span 
                              key={f.fund_id}
                              style={{ 
                                fontSize: '0.75rem', 
                                padding: '0.2rem 0.5rem', 
                                borderRadius: 'var(--radius-sm)', 
                                background: 'rgba(6, 182, 212, 0.1)', 
                                color: '#a5f3fc',
                                border: '1px solid rgba(6, 182, 212, 0.25)'
                              }}
                              title={`${f.fund_name} (${f.category}) - Value: ${formatINR(f.current_value)}`}
                            >
                              {f.fund_name}
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Existing Mutual Funds Cards */}
        {mfList && mfList.length > 0 && (
          <div className="content-card" style={{ padding: '1.25rem 1.5rem' }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              Active Mutual Funds in Scope ({mfList.length})
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
              {mfList.map(fund => (
                <div 
                  key={fund.id}
                  style={{ background: '#0a0e17', borderRadius: 'var(--radius-md)', padding: '1rem', border: '1px solid var(--border-subtle)' }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                    {fund.fund_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                    <span>{fund.category}</span>
                    <span className="profile-tag">{fund.profile_name}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.5rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Current Value</div>
                    <div className="font-mono" style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--cyan-mf)' }}>
                      {formatINR(fund.current_value)}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                      Tracked Underlying Stocks:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                      {fund.top_overlapping_stocks_list?.map(s => (
                        <span 
                          key={s} 
                          className="font-mono"
                          style={{ fontSize: '0.72rem', padding: '0.1rem 0.35rem', background: '#1e293b', borderRadius: '3px', color: '#cbd5e1' }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Add MF Modal */}
      {showAddMfModal && (
        <div className="modal-overlay" onClick={() => setShowAddMfModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Layers size={20} className="text-cyan" />
                <h2 className="modal-title">Add Mutual Fund Holding</h2>
              </div>
              <button className="modal-close-btn" onClick={() => setShowAddMfModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMf} id="form-add-mf">
              <div className="modal-body">
                {mfError && (
                  <div style={{ padding: '0.75rem', background: 'var(--red-loss-bg)', border: '1px solid var(--red-loss-border)', borderRadius: 'var(--radius-sm)', color: 'var(--red-loss)', fontSize: '0.85rem' }}>
                    {mfError}
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Target Demat / Family Profile</label>
                  <select
                    className="form-select"
                    value={targetPortfolioId}
                    onChange={e => setTargetPortfolioId(e.target.value)}
                    id="select-mf-portfolio"
                  >
                    {portfolios.map(p => (
                      <option key={p.id} value={p.id}>{p.profile_name} ({p.broker_name})</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Fund Name</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Parag Parikh Flexi Cap Fund"
                    value={fundName}
                    onChange={e => setFundName(e.target.value)}
                    required
                    id="input-mf-name"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select
                    className="form-select"
                    value={category}
                    onChange={e => setCategory(e.target.value)}
                  >
                    <option value="Flexi Cap">Flexi Cap</option>
                    <option value="Large Cap">Large Cap</option>
                    <option value="Mid Cap">Mid Cap</option>
                    <option value="Small Cap">Small Cap</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Index / ETF">Index / ETF</option>
                  </select>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Invested Amount (₹)</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      placeholder="e.g. 100000"
                      value={investedAmount}
                      onChange={e => setInvestedAmount(e.target.value)}
                      required
                      id="input-mf-invested"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Current Value (₹)</label>
                    <input
                      type="number"
                      step="any"
                      className="form-input"
                      placeholder="e.g. 125000"
                      value={currentValue}
                      onChange={e => setCurrentValue(e.target.value)}
                      required
                      id="input-mf-current"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Top Overlapping Stock Symbols (Comma separated)</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. HDFCBANK, RELIANCE, TCS, ITC, INFY"
                    value={topStocksInput}
                    onChange={e => setTopStocksInput(e.target.value)}
                    id="input-mf-stocks"
                  />
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Enter NSE stock symbols to automatically check overlap with your direct equity portfolio.
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddMfModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={mfSubmitting} id="btn-submit-add-mf">
                  <span>{mfSubmitting ? 'Adding...' : 'Add Mutual Fund'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
