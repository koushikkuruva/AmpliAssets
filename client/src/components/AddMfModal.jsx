import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { X, Layers, PlusCircle, Target } from 'lucide-react';

const COMMON_BENCHMARKS = [
  { name: 'Nifty 500 TRI', defaultCagr: 17.8 },
  { name: 'Nifty 50 TRI', defaultCagr: 15.2 },
  { name: 'Nifty 100 TRI', defaultCagr: 16.5 },
  { name: 'Nifty Midcap 150 TRI', defaultCagr: 23.5 },
  { name: 'Nifty Smallcap 250 TRI', defaultCagr: 22.0 },
  { name: 'BSE SENSEX TRI', defaultCagr: 14.8 }
];

export default function AddMfModal({ onClose, onSuccess }) {
  const { portfolios, activePortfolioId } = useAuth();

  const defaultPortfolioId = activePortfolioId !== 'ALL'
    ? activePortfolioId
    : (portfolios[0]?.id || '');

  const [portfolioId, setPortfolioId] = useState(defaultPortfolioId);
  const [fundName, setFundName] = useState('');
  const [category, setCategory] = useState('Flexi Cap');
  const [investedAmount, setInvestedAmount] = useState('');
  const [currentValue, setCurrentValue] = useState('');
  const [cagrPct, setCagrPct] = useState('');
  const [benchmarkName, setBenchmarkName] = useState('Nifty 500 TRI');
  const [benchmarkCagrPct, setBenchmarkCagrPct] = useState('17.8');
  const [expenseRatio, setExpenseRatio] = useState('0.65');
  const [topStocks, setTopStocks] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleBenchmarkSelect = (name) => {
    setBenchmarkName(name);
    const match = COMMON_BENCHMARKS.find(b => b.name === name);
    if (match) {
      setBenchmarkCagrPct(match.defaultCagr.toString());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fundName.trim() || investedAmount === '' || currentValue === '') {
      setError('Please provide Fund Name, Invested Amount, and Current Value');
      return;
    }

    setLoading(true);
    setError('');

    const stocksList = topStocks
      .split(',')
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);

    try {
      await api.addMutualFund({
        portfolio_id: Number(portfolioId),
        fund_name: fundName.trim(),
        category,
        invested_amount: parseFloat(investedAmount),
        current_value: parseFloat(currentValue),
        cagr_pct: cagrPct !== '' ? parseFloat(cagrPct) : undefined,
        benchmark_name: benchmarkName.trim(),
        benchmark_cagr_pct: benchmarkCagrPct !== '' ? parseFloat(benchmarkCagrPct) : 16.0,
        expense_ratio: expenseRatio !== '' ? parseFloat(expenseRatio) : 0.65,
        top_overlapping_stocks: stocksList
      });

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to add mutual fund');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Layers size={20} className="text-cyan" />
            <h2 className="modal-title">Add Mutual Fund & Benchmark</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} id="btn-close-add-mf">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} id="form-add-mf-modal">
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
                id="select-add-mf-portfolio"
              >
                {portfolios.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.profile_name} ({p.broker_name})
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Mutual Fund Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Parag Parikh Flexi Cap Fund - Direct Growth"
                value={fundName}
                onChange={e => setFundName(e.target.value)}
                required
                autoFocus
                id="input-add-mf-name"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Fund Category</label>
              <select
                className="form-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
                id="select-add-mf-category"
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
                  placeholder="e.g. 250000"
                  value={investedAmount}
                  onChange={e => setInvestedAmount(e.target.value)}
                  required
                  min="0"
                  id="input-add-mf-invested"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Current Value (₹)</label>
                <input
                  type="number"
                  step="any"
                  className="form-input"
                  placeholder="e.g. 325000"
                  value={currentValue}
                  onChange={e => setCurrentValue(e.target.value)}
                  required
                  min="0"
                  id="input-add-mf-current"
                />
              </div>
            </div>

            {/* Benchmark Alpha Parameters */}
            <div style={{ padding: '1rem', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: 'var(--radius-md)', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#a5b4fc', fontSize: '0.82rem', fontWeight: 600 }}>
                <Target size={15} />
                <span>Benchmark Alpha Audit Parameters</span>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Benchmark Index</label>
                  <select
                    className="form-select"
                    value={benchmarkName}
                    onChange={e => handleBenchmarkSelect(e.target.value)}
                    id="select-add-mf-benchmark"
                  >
                    {COMMON_BENCHMARKS.map(b => (
                      <option key={b.name} value={b.name}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Benchmark CAGR (%)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="e.g. 17.8"
                    value={benchmarkCagrPct}
                    onChange={e => setBenchmarkCagrPct(e.target.value)}
                    id="input-add-mf-bench-cagr"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fund CAGR (%)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="e.g. 21.4 (Auto-calc if blank)"
                    value={cagrPct}
                    onChange={e => setCagrPct(e.target.value)}
                    id="input-add-mf-cagr"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Expense Ratio (%)</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    placeholder="e.g. 0.63"
                    value={expenseRatio}
                    onChange={e => setExpenseRatio(e.target.value)}
                    id="input-add-mf-expense"
                  />
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Top Overlapping Stock Symbols (Comma separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. HDFCBANK, RELIANCE, TCS, ITC"
                value={topStocks}
                onChange={e => setTopStocks(e.target.value)}
                id="input-add-mf-stocks"
              />
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Used by the overlap engine to cross-check with your direct equity portfolio.
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
              id="btn-submit-add-mf-modal"
            >
              <PlusCircle size={16} />
              <span>{loading ? 'Adding...' : 'Add Mutual Fund'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
