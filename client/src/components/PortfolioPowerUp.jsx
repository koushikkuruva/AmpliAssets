import React, { useState } from 'react';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle2, 
  Target, 
  ShieldAlert, 
  ArrowRight, 
  Layers, 
  Briefcase, 
  PlusCircle, 
  Info, 
  Trash2,
  Percent
} from 'lucide-react';
import { formatINR, formatCompactINR, formatPct } from '../utils/formatters';
import { api } from '../api/client';
import AddMfModal from './AddMfModal';

export default function PortfolioPowerUp({ powerUpData, loading, onRefresh }) {
  const [stockFilter, setStockFilter] = useState('ALL');
  const [showAddMfModal, setShowAddMfModal] = useState(false);
  const [deletingMfId, setDeletingMfId] = useState(null);

  if (loading || !powerUpData) {
    return (
      <div style={{ padding: '3.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
        <Zap size={28} className="animate-spin text-cyan" style={{ margin: '0 auto 1rem auto' }} />
        <div>Computing Portfolio Power-Up & Benchmark Alpha Audit...</div>
      </div>
    );
  }

  const {
    health_score = 75,
    health_grade = 'STRONG',
    summary = {},
    mf_audit = [],
    equity_diagnostics = []
  } = powerUpData;

  const handleDeleteMf = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from your portfolio?`)) {
      return;
    }

    setDeletingMfId(id);
    try {
      await api.deleteMutualFund(id);
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to remove mutual fund');
    } finally {
      setDeletingMfId(null);
    }
  };

  const filteredStocks = stockFilter === 'ALL'
    ? equity_diagnostics
    : equity_diagnostics.filter(s => s.diagnosis_code === stockFilter);

  // Health Score Color
  const getScoreColor = (s) => {
    if (s >= 75) return '#10b981'; // Emerald
    if (s >= 50) return '#f59e0b'; // Amber
    return '#ef4444'; // Red
  };

  const scoreColor = getScoreColor(health_score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* 1. Portfolio Health Banner */}
      <div 
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.75rem',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.6)',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.5rem'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div 
              style={{ 
                width: '46px', 
                height: '46px', 
                borderRadius: '12px', 
                background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                color: 'white',
                boxShadow: '0 6px 18px rgba(6, 182, 212, 0.35)'
              }}
            >
              <Zap size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.02em', margin: 0 }}>
                  Portfolio Power-Up & Alpha Audit
                </h2>
                <span 
                  style={{
                    padding: '0.2rem 0.6rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    background: health_score >= 75 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                    color: scoreColor,
                    border: `1px solid ${scoreColor}40`
                  }}
                >
                  {health_grade.replace('_', ' ')}
                </span>
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.86rem', marginTop: '0.2rem' }}>
                Institutional-grade benchmark audit against Nifty indices to identify alpha leaders and eliminate capital drag.
              </p>
            </div>
          </div>

          {/* Health Score Gauge / Badge */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '1rem', 
              background: 'rgba(255,255,255,0.04)', 
              padding: '0.75rem 1.25rem', 
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(255,255,255,0.08)'
            }}
          >
            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Power-Up Health Score
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem' }}>
                <span className="font-mono" style={{ fontSize: '2rem', fontWeight: 800, color: scoreColor }}>
                  {health_score}
                </span>
                <span style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>/ 100</span>
              </div>
            </div>

            {/* Score Ring / Bar */}
            <div style={{ width: '80px', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
              <div 
                style={{ 
                  height: '100%', 
                  width: `${health_score}%`, 
                  background: `linear-gradient(90deg, #6366f1, ${scoreColor})`,
                  borderRadius: '999px'
                }} 
              />
            </div>
          </div>
        </div>

        {/* 3 Metric Pills */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          {/* Beating Benchmark */}
          <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--green-gain)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Capital Beating Benchmark
              </span>
              <TrendingUp size={16} className="text-gain" />
            </div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--green-gain)', marginTop: '0.25rem' }}>
              {formatINR(summary.capital_beating_benchmark || 0)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{summary.capital_beating_pct}%</strong> of total analyzed capital
            </div>
          </div>

          {/* Lagging Benchmark */}
          <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--red-loss)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Capital Lagging Benchmark
              </span>
              <TrendingDown size={16} className="text-loss" />
            </div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--red-loss)', marginTop: '0.25rem' }}>
              {formatINR(summary.capital_lagging_benchmark || 0)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              <strong style={{ color: 'var(--text-primary)' }}>{summary.capital_lagging_pct}%</strong> review for replacement
            </div>
          </div>

          {/* Missed Alpha */}
          <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--amber-mandate)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                Missed Opportunity Cost
              </span>
              <AlertTriangle size={16} className="text-amber" />
            </div>
            <div className="font-mono" style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--amber-mandate)', marginTop: '0.25rem' }}>
              {formatINR(summary.total_missed_alpha_inr || 0)}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              Extra ₹ earned if lagging assets matched index
            </div>
          </div>
        </div>
      </div>

      {/* 2. Mutual Fund Alpha & Benchmark Audit Cards */}
      <div className="table-card">
        <div className="card-toolbar" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Target size={18} className="text-cyan" />
              <span>Mutual Fund Alpha & Benchmark Audit</span>
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Comparing fund CAGR % against category benchmark index to detect hidden underperformance.
            </div>
          </div>

          <div style={{ marginLeft: 'auto' }}>
            <button
              className="btn-primary"
              onClick={() => setShowAddMfModal(true)}
              id="btn-add-mf-powerup"
            >
              <PlusCircle size={16} />
              <span>+ Add Mutual Fund</span>
            </button>
          </div>
        </div>

        {mf_audit.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No mutual funds found in this portfolio scope.
          </div>
        ) : (
          <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {mf_audit.map(fund => {
              const isOutperforming = fund.alpha_pct >= 1.0;
              const isLagging = fund.alpha_pct <= -1.0;
              const alphaColor = isOutperforming ? 'var(--green-gain)' : isLagging ? 'var(--red-loss)' : '#60a5fa';

              return (
                <div 
                  key={fund.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${isLagging ? 'rgba(239, 68, 68, 0.35)' : 'rgba(255, 255, 255, 0.08)'}`,
                    borderRadius: 'var(--radius-md)',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    position: 'relative'
                  }}
                >
                  {/* Fund Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                          {fund.fund_name}
                        </span>
                        <span className="badge-cyan" style={{ fontSize: '0.72rem' }}>
                          {fund.category}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          • {fund.profile_name} ({fund.broker_name})
                        </span>
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Invested: <span className="font-mono">{formatINR(fund.invested_amount)}</span> • Current Value: <span className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{formatINR(fund.current_value)}</span> • Exp. Ratio: <span className="font-mono">{fund.expense_ratio}%</span>
                      </div>
                    </div>

                    {/* Alpha Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span 
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          padding: '0.35rem 0.75rem',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.85rem',
                          fontWeight: 700,
                          background: isOutperforming ? 'rgba(16, 185, 129, 0.15)' : isLagging ? 'rgba(239, 68, 68, 0.15)' : 'rgba(96, 165, 250, 0.15)',
                          color: alphaColor,
                          border: `1px solid ${alphaColor}40`
                        }}
                      >
                        {isOutperforming ? <TrendingUp size={14} /> : isLagging ? <TrendingDown size={14} /> : null}
                        <span>{fund.alpha_pct >= 0 ? `+${fund.alpha_pct}% Alpha` : `${fund.alpha_pct}% Lag`}</span>
                      </span>

                      <button
                        className="btn-action-delete"
                        onClick={() => handleDeleteMf(fund.id, fund.fund_name)}
                        disabled={deletingMfId === fund.id}
                        title="Delete Mutual Fund"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {/* Benchmark Comparison Bars */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', background: 'rgba(0,0,0,0.25)', padding: '0.9rem', borderRadius: 'var(--radius-sm)' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Fund Annualized CAGR</span>
                        <span className="font-mono" style={{ fontWeight: 700, color: alphaColor }}>{fund.cagr_pct}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, fund.cagr_pct * 3)}%`, background: alphaColor, borderRadius: '999px' }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', marginBottom: '0.3rem' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>Benchmark ({fund.benchmark_name})</span>
                        <span className="font-mono" style={{ fontWeight: 700, color: '#cbd5e1' }}>{fund.benchmark_cagr_pct}%</span>
                      </div>
                      <div style={{ height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(100, fund.benchmark_cagr_pct * 3)}%`, background: '#64748b', borderRadius: '999px' }} />
                      </div>
                    </div>
                  </div>

                  {/* Action Callout Box */}
                  <div 
                    style={{
                      background: isLagging ? 'rgba(239, 68, 68, 0.08)' : isOutperforming ? 'rgba(16, 185, 129, 0.06)' : 'rgba(99, 102, 241, 0.06)',
                      border: `1px solid ${isLagging ? 'rgba(239, 68, 68, 0.25)' : isOutperforming ? 'rgba(16, 185, 129, 0.2)' : 'rgba(99, 102, 241, 0.2)'}`,
                      borderRadius: 'var(--radius-sm)',
                      padding: '0.75rem 1rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      flexWrap: 'wrap',
                      gap: '0.5rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem' }}>
                      {isLagging ? (
                        <AlertTriangle size={16} className="text-loss" />
                      ) : (
                        <CheckCircle2 size={16} className="text-gain" />
                      )}
                      <span style={{ fontWeight: 600, color: isLagging ? '#fca5a5' : isOutperforming ? '#6ee7b7' : '#cbd5e1' }}>
                        {fund.recommendation}
                      </span>
                    </div>

                    {fund.missed_gains_inr > 0 && (
                      <div style={{ fontSize: '0.8rem', color: 'var(--red-loss)', fontWeight: 600 }}>
                        Opportunity Drag: -{formatINR(fund.missed_gains_inr)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Direct Stock Power-Up Diagnostic Matrix */}
      <div className="table-card">
        <div className="card-toolbar" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
              <Briefcase size={18} className="text-gain" />
              <span>Direct Stock Performance & Risk Diagnostics</span>
            </h3>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
              Hurdle benchmark: Nifty 50 TRI (14.0% p.a.). Alerts on single-stock concentration (&gt;20% portfolio weight).
            </div>
          </div>

          {/* Diagnostic Filter Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginLeft: 'auto' }}>
            {[
              { id: 'ALL', label: 'All Stocks' },
              { id: 'STAR_COMPOUNDER', label: 'Star Compounders' },
              { id: 'CONCENTRATION_RISK', label: 'Concentration Risks' },
              { id: 'UNDERPERFORMER_DRAG', label: 'Capital Drags' },
              { id: 'CORE_STEADY', label: 'Steady Core' }
            ].map(f => (
              <button
                key={f.id}
                className={`btn-secondary ${stockFilter === f.id ? 'active' : ''}`}
                style={{
                  minHeight: '34px',
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  background: stockFilter === f.id ? 'rgba(99, 102, 241, 0.2)' : undefined,
                  borderColor: stockFilter === f.id ? 'var(--border-focus)' : undefined,
                  color: stockFilter === f.id ? '#a5b4fc' : undefined
                }}
                onClick={() => setStockFilter(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {filteredStocks.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            No stocks found under "{stockFilter}" filter.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Stock Symbol & Sector</th>
                  <th style={{ textAlign: 'right' }}>Current Value</th>
                  <th style={{ textAlign: 'right' }}>P&L Return (%)</th>
                  <th style={{ textAlign: 'right' }}>Portfolio Weight</th>
                  <th>Diagnostic Classification</th>
                  <th>Recommended Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map(stock => {
                  const isGain = stock.unrealized_pnl >= 0;
                  const isConcentration = stock.portfolio_weight_pct > 20.0;

                  return (
                    <tr key={stock.id}>
                      {/* Symbol */}
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {stock.symbol}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {stock.sector} • {stock.profile_name}
                        </div>
                      </td>

                      {/* Value */}
                      <td style={{ textAlign: 'right' }} className="font-mono">
                        <div style={{ fontWeight: 600 }}>{formatINR(stock.current_value)}</div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {stock.quantity} shares @ ₹{stock.current_market_price}
                        </div>
                      </td>

                      {/* P&L % */}
                      <td style={{ textAlign: 'right' }}>
                        <div className={isGain ? 'text-gain font-mono' : 'text-loss font-mono'} style={{ fontWeight: 700 }}>
                          {isGain ? '+' : ''}{formatPct(stock.pnl_pct)}
                        </div>
                        <div className="font-mono" style={{ fontSize: '0.74rem', color: isGain ? 'var(--green-gain)' : 'var(--red-loss)' }}>
                          {isGain ? '+' : ''}{formatINR(stock.unrealized_pnl)}
                        </div>
                      </td>

                      {/* Weight */}
                      <td style={{ textAlign: 'right' }}>
                        <div className="font-mono" style={{ fontWeight: 700, color: isConcentration ? '#fbbf24' : 'var(--text-primary)' }}>
                          {stock.portfolio_weight_pct}%
                        </div>
                        {isConcentration && (
                          <div style={{ fontSize: '0.72rem', color: '#fbbf24', fontWeight: 600 }}>
                            &gt; 20% Alert
                          </div>
                        )}
                      </td>

                      {/* Diagnostic Classification Badge */}
                      <td>
                        <span 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.76rem',
                            fontWeight: 700,
                            background: stock.badge_variant === 'success' 
                              ? 'rgba(16, 185, 129, 0.12)' 
                              : stock.badge_variant === 'warning'
                              ? 'rgba(245, 158, 11, 0.12)'
                              : stock.badge_variant === 'danger'
                              ? 'rgba(239, 68, 68, 0.12)'
                              : 'rgba(96, 165, 250, 0.12)',
                            color: stock.badge_variant === 'success' 
                              ? 'var(--green-gain)' 
                              : stock.badge_variant === 'warning'
                              ? 'var(--amber-mandate)'
                              : stock.badge_variant === 'danger'
                              ? 'var(--red-loss)'
                              : '#60a5fa',
                            border: `1px solid ${
                              stock.badge_variant === 'success' ? 'rgba(16, 185, 129, 0.3)' :
                              stock.badge_variant === 'warning' ? 'rgba(245, 158, 11, 0.3)' :
                              stock.badge_variant === 'danger' ? 'rgba(239, 68, 68, 0.3)' :
                              'rgba(96, 165, 250, 0.3)'
                            }`
                          }}
                        >
                          {stock.badge_variant === 'success' && <TrendingUp size={12} />}
                          {stock.badge_variant === 'warning' && <ShieldAlert size={12} />}
                          {stock.badge_variant === 'danger' && <AlertTriangle size={12} />}
                          {stock.badge_variant === 'info' && <CheckCircle2 size={12} />}
                          <span>{stock.diagnosis_title}</span>
                        </span>
                      </td>

                      {/* Recommendation */}
                      <td style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                        {stock.recommendation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add MF Modal */}
      {showAddMfModal && (
        <AddMfModal
          onClose={() => setShowAddMfModal(false)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
