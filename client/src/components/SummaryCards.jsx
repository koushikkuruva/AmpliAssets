import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Briefcase, 
  Layers, 
  Lock, 
  PieChart,
  Coins,
  ArrowRight
} from 'lucide-react';
import { formatINR, formatCompactINR, formatPct } from '../utils/formatters';

const SECTOR_COLORS = [
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#06b6d4', // Cyan
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
  '#14b8a6', // Teal
  '#f97316'  // Orange
];

export default function SummaryCards({ summary, loading, activeTab, onNavigate }) {
  if (loading || !summary) {
    return (
      <div className="dashboard-kpi-grid">
        {[1, 2, 3, 4, 5].map(n => (
          <div key={n} className="kpi-card" style={{ opacity: 0.5 }}>
            <div style={{ height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Loading metrics...</div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const overallPnlIsGain = summary.overall_pnl >= 0;
  const equityPnlIsGain = summary.equity?.pnl >= 0;
  const mfPnlIsGain = summary.mf?.pnl >= 0;

  const handleKeyDown = (e, tabKey) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (onNavigate) onNavigate(tabKey);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* KPI Cards Grid */}
      <div className="dashboard-kpi-grid">
        {/* Total Net Worth -> POWER_UP (Portfolio Power-Up & Alpha Audit) */}
        <div 
          className={`kpi-card hero-kpi-card ${activeTab === 'POWER_UP' ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate && onNavigate('POWER_UP')}
          onKeyDown={(e) => handleKeyDown(e, 'POWER_UP')}
          title="Click to view Portfolio Power-Up & Benchmark Audit"
          id="card-kpi-networth"
        >
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Total Portfolio Net Worth</span>
              <div className="kpi-icon-badge" style={{ color: '#818cf8' }}>
                <Wallet size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono">
              {formatINR(summary.total_net_worth)}
            </div>
            <div className="kpi-meta">
              <span className={overallPnlIsGain ? 'badge-gain font-mono' : 'badge-loss font-mono'}>
                {overallPnlIsGain ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {formatPct(summary.overall_pnl_pct || 0)}
              </span>
              <span className="font-mono" style={{ fontSize: '0.8rem', color: overallPnlIsGain ? 'var(--green-gain)' : 'var(--red-loss)' }}>
                ({formatINR(summary.overall_pnl || 0)})
              </span>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                All Assets
              </span>
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Consolidated:</span>
              <span style={{ color: '#a5b4fc', fontWeight: 600 }}>Family Portfolios</span>
            </div>
          </div>
          <div className="kpi-card-action">
            <span>⚡ View Power-Up Audit</span>
            <ArrowRight size={12} />
          </div>
        </div>

        {/* Direct Equities -> EQUITY */}
        <div 
          className={`kpi-card ${activeTab === 'EQUITY' ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate && onNavigate('EQUITY')}
          onKeyDown={(e) => handleKeyDown(e, 'EQUITY')}
          title="Click to view Direct Equity Holdings"
          id="card-kpi-equity"
        >
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Direct Equity Holdings</span>
              <div className="kpi-icon-badge" style={{ color: 'var(--green-gain)' }}>
                <Briefcase size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono">
              {formatINR(summary.equity?.current_value || 0)}
            </div>
            <div className="kpi-meta">
              <span className={equityPnlIsGain ? 'badge-gain font-mono' : 'badge-loss font-mono'}>
                {equityPnlIsGain ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {formatPct(summary.equity?.pnl_pct || 0)}
              </span>
              <span className="font-mono" style={{ fontSize: '0.8rem', color: equityPnlIsGain ? 'var(--green-gain)' : 'var(--red-loss)' }}>
                ({formatINR(summary.equity?.pnl || 0)})
              </span>
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Today's P&L:</span>
              <span className={summary.today_pnl >= 0 ? 'text-gain font-mono' : 'text-loss font-mono'} style={{ fontWeight: 600 }}>
                {summary.today_pnl !== undefined ? (
                  `${summary.today_pnl >= 0 ? '+' : ''}${formatINR(summary.today_pnl)} (${formatPct(summary.today_pnl_pct)})`
                ) : (
                  'Live Sync Ready'
                )}
              </span>
            </div>
          </div>
          <div className="kpi-card-action">
            <span>View Equity Holdings</span>
            <ArrowRight size={12} />
          </div>
        </div>

        {/* Mutual Funds -> OVERLAP */}
        <div 
          className={`kpi-card ${activeTab === 'OVERLAP' ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate && onNavigate('OVERLAP')}
          onKeyDown={(e) => handleKeyDown(e, 'OVERLAP')}
          title="Click to view Mutual Fund Overlap & Holdings"
          id="card-kpi-mf"
        >
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Mutual Fund Assets</span>
              <div className="kpi-icon-badge" style={{ color: 'var(--cyan-mf)' }}>
                <Layers size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono">
              {formatINR(summary.mf?.current_value || 0)}
            </div>
            <div className="kpi-meta">
              <span className={mfPnlIsGain ? 'badge-gain font-mono' : 'badge-loss font-mono'}>
                {mfPnlIsGain ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {formatPct(summary.mf?.pnl_pct || 0)}
              </span>
              <span className="font-mono" style={{ fontSize: '0.8rem', color: mfPnlIsGain ? 'var(--green-gain)' : 'var(--red-loss)' }}>
                ({formatINR(summary.mf?.pnl || 0)})
              </span>
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Compact:</span>
              <span className="font-mono text-cyan" style={{ fontWeight: 600 }}>
                {formatCompactINR(summary.mf?.current_value || 0)}
              </span>
            </div>
          </div>
          <div className="kpi-card-action">
            <span>View Mutual Funds & Overlap</span>
            <ArrowRight size={12} />
          </div>
        </div>

        {/* Cash & Traditional Schemes Vault -> CASH */}
        <div 
          className={`kpi-card ${activeTab === 'CASH' ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate && onNavigate('CASH')}
          onKeyDown={(e) => handleKeyDown(e, 'CASH')}
          title="Click to view Cash, Chitti & Traditional Schemes Vault"
          id="card-kpi-cash"
        >
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Cash, Chitti & Schemes</span>
              <div className="kpi-icon-badge" style={{ color: '#a78bfa' }}>
                <Coins size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono" style={{ color: '#c4b5fd' }}>
              {formatINR(summary.cash?.current_value || 0)}
            </div>
            <div className="kpi-meta">
              <span className="badge-pill font-mono" style={{ background: 'rgba(167, 139, 250, 0.15)', color: '#c4b5fd', border: '1px solid rgba(167, 139, 250, 0.3)' }}>
                {formatCompactINR(summary.cash?.current_value || 0)}
              </span>
              {summary.cash?.monthly_commitment > 0 ? (
                <span className="font-mono" style={{ fontSize: '0.78rem', color: '#fbbf24', marginLeft: 'auto' }}>
                  ₹{formatCompactINR(summary.cash.monthly_commitment)}/mo
                </span>
              ) : (
                <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  Liquid & FDs
                </span>
              )}
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Maturity Pool:</span>
              <span className="font-mono text-cyan" style={{ fontWeight: 600 }}>
                ₹{formatCompactINR(summary.cash?.target_maturity_value || summary.cash?.total_target_maturity || summary.cash?.current_value || 0)}
              </span>
            </div>
          </div>
          <div className="kpi-card-action">
            <span>View Schemes & Chitti Vault</span>
            <ArrowRight size={12} />
          </div>
        </div>

        {/* Blocked IPO Mandate Cash -> IPO */}
        <div 
          className={`kpi-card ${activeTab === 'IPO' ? 'active' : ''}`}
          role="button"
          tabIndex={0}
          onClick={() => onNavigate && onNavigate('IPO')}
          onKeyDown={(e) => handleKeyDown(e, 'IPO')}
          title="Click to view IPO Mandates & Allotment Tracker"
          id="card-kpi-ipo"
        >
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Blocked IPO Mandate Cash</span>
              <div className="kpi-icon-badge" style={{ color: 'var(--amber-mandate)' }}>
                <Lock size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono" style={{ color: 'var(--amber-mandate)' }}>
              {formatINR(summary.blocked_mandate_cash || 0)}
            </div>
            <div className="kpi-meta">
              <span className="badge-amber font-mono">
                {summary.active_mandates_count || 0} Active Mandate{summary.active_mandates_count === 1 ? '' : 's'}
              </span>
              {summary.allotted_ipos_count > 0 ? (
                <span className="badge-gain font-mono" style={{ marginLeft: 'auto' }}>
                  {summary.allotted_ipos_count} Allotted
                </span>
              ) : (
                <span className="badge-pill" style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)' }}>
                  ASBA Lien
                </span>
              )}
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Mandate Status:</span>
              <span style={{ color: summary.active_mandates_count > 0 ? 'var(--amber-mandate)' : 'var(--text-muted)', fontWeight: 600 }}>
                {summary.active_mandates_count > 0 ? 'Funds Earmarked' : 'No Pending Mandates'}
              </span>
            </div>
          </div>
          <div className="kpi-card-action">
            <span>View IPO Tracker & ASBA</span>
            <ArrowRight size={12} />
          </div>
        </div>
      </div>

      {/* Asset Allocation Breakdown */}
      {summary.asset_allocation && (
        <div className="sector-bar-card" style={{ padding: '1.25rem 1.5rem' }}>
          <div className="sector-bar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChart size={16} className="text-cyan" />
              <div className="sector-bar-title">Consolidated Asset Allocation</div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Total Net Worth: {formatCompactINR(summary.total_net_worth || 0)} • Click any segment to view details
            </div>
          </div>

          <div className="sector-progress-track">
            {/* Equities Segment */}
            <div 
              className={`sector-segment clickable ${activeTab === 'EQUITY' ? 'active' : ''}`} 
              style={{ width: `${summary.asset_allocation.equities_pct}%`, backgroundColor: '#10b981' }} 
              title={`Direct Equities: ${summary.asset_allocation.equities_pct}% (Click to view holdings)`}
              onClick={() => onNavigate && onNavigate('EQUITY')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, 'EQUITY')}
              id="segment-asset-equity"
            />
            {/* Mutual Funds Segment */}
            <div 
              className={`sector-segment clickable ${activeTab === 'OVERLAP' ? 'active' : ''}`} 
              style={{ width: `${summary.asset_allocation.mutual_funds_pct}%`, backgroundColor: '#06b6d4' }} 
              title={`Mutual Funds: ${summary.asset_allocation.mutual_funds_pct}% (Click to view overlap)`}
              onClick={() => onNavigate && onNavigate('OVERLAP')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, 'OVERLAP')}
              id="segment-asset-mf"
            />
            {/* Cash & Chittis Segment */}
            <div 
              className={`sector-segment clickable ${activeTab === 'CASH' ? 'active' : ''}`} 
              style={{ width: `${summary.asset_allocation.cash_chittis_pct}%`, backgroundColor: '#8b5cf6' }} 
              title={`Cash & Chittis: ${summary.asset_allocation.cash_chittis_pct}% (Click to view vault)`}
              onClick={() => onNavigate && onNavigate('CASH')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, 'CASH')}
              id="segment-asset-cash"
            />
            {/* Blocked IPO Segment */}
            <div 
              className={`sector-segment clickable ${activeTab === 'IPO' ? 'active' : ''}`} 
              style={{ width: `${summary.asset_allocation.blocked_ipo_pct}%`, backgroundColor: '#f59e0b' }} 
              title={`Blocked IPO Mandates: ${summary.asset_allocation.blocked_ipo_pct}% (Click to view tracker)`}
              onClick={() => onNavigate && onNavigate('IPO')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, 'IPO')}
              id="segment-asset-ipo"
            />
          </div>

          <div className="sector-legend">
            <div 
              className={`legend-item clickable ${activeTab === 'EQUITY' ? 'active' : ''}`}
              onClick={() => onNavigate && onNavigate('EQUITY')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, 'EQUITY')}
              title="Click to switch to Direct Equities"
              id="legend-asset-equity"
            >
              <span className="legend-color-dot" style={{ backgroundColor: '#10b981' }} />
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Direct Equities</span>
              <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {summary.asset_allocation.equities_pct}%
              </span>
            </div>

            <div 
              className={`legend-item clickable ${activeTab === 'OVERLAP' ? 'active' : ''}`}
              onClick={() => onNavigate && onNavigate('OVERLAP')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, 'OVERLAP')}
              title="Click to switch to Mutual Funds & Overlap"
              id="legend-asset-mf"
            >
              <span className="legend-color-dot" style={{ backgroundColor: '#06b6d4' }} />
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Mutual Funds</span>
              <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {summary.asset_allocation.mutual_funds_pct}%
              </span>
            </div>

            <div 
              className={`legend-item clickable ${activeTab === 'CASH' ? 'active' : ''}`}
              onClick={() => onNavigate && onNavigate('CASH')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, 'CASH')}
              title="Click to switch to Cash, Chittis & Schemes Vault"
              id="legend-asset-cash"
            >
              <span className="legend-color-dot" style={{ backgroundColor: '#8b5cf6' }} />
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Cash, Chittis & FDs</span>
              <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {summary.asset_allocation.cash_chittis_pct}%
              </span>
            </div>

            <div 
              className={`legend-item clickable ${activeTab === 'IPO' ? 'active' : ''}`}
              onClick={() => onNavigate && onNavigate('IPO')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => handleKeyDown(e, 'IPO')}
              title="Click to switch to IPO Mandates & Allotments"
              id="legend-asset-ipo"
            >
              <span className="legend-color-dot" style={{ backgroundColor: '#f59e0b' }} />
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>Blocked IPO Cash</span>
              <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                {summary.asset_allocation.blocked_ipo_pct}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Sector Allocation Breakdown */}
      {summary.sectors && summary.sectors.length > 0 && (
        <div className="sector-bar-card">
          <div className="sector-bar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <PieChart size={16} className="text-cyan" />
              <div className="sector-bar-title">Direct Equity Sector Diversification</div>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Total direct value: {formatCompactINR(summary.equity?.current_value || 0)}
            </div>
          </div>

          <div className="sector-progress-track">
            {summary.sectors.map((s, idx) => (
              <div 
                key={s.sector} 
                className="sector-segment"
                style={{ 
                  width: `${s.percentage}%`, 
                  backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] 
                }}
                title={`${s.sector}: ${s.percentage}% (${formatINR(s.value)})`}
              />
            ))}
          </div>

          <div className="sector-legend">
            {summary.sectors.map((s, idx) => (
              <div 
                key={s.sector} 
                className="legend-item clickable"
                onClick={() => onNavigate && onNavigate('EQUITY')}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => handleKeyDown(e, 'EQUITY')}
                title={`Filter holdings by ${s.sector}`}
              >
                <span 
                  className="legend-color-dot" 
                  style={{ backgroundColor: SECTOR_COLORS[idx % SECTOR_COLORS.length] }} 
                />
                <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{s.sector}</span>
                <span className="font-mono" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  {s.percentage}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
