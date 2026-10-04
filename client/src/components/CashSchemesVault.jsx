import React, { useState } from 'react';
import { 
  Landmark, 
  Coins, 
  Wallet, 
  Sparkles, 
  PlusCircle, 
  Trash2, 
  Calendar, 
  ArrowUpRight, 
  TrendingUp, 
  Layers,
  FileText
} from 'lucide-react';
import { formatINR, formatCompactINR, formatPct } from '../utils/formatters';
import { api } from '../api/client';
import AddCashSchemeModal from './AddCashSchemeModal';

const SCHEME_CONFIG = {
  CHITTI: {
    label: 'Chitti / Chit Fund',
    icon: Coins,
    color: '#8b5cf6',
    bgColor: 'rgba(139, 92, 246, 0.12)',
    borderColor: 'rgba(139, 92, 246, 0.3)'
  },
  FD_RD: {
    label: 'Fixed / Recurring Deposit',
    icon: Landmark,
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.12)',
    borderColor: 'rgba(59, 130, 246, 0.3)'
  },
  SAVINGS_CASH: {
    label: 'Liquid Cash / Savings',
    icon: Wallet,
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: 'rgba(16, 185, 129, 0.3)'
  },
  GOLD_SCHEME: {
    label: 'Jeweller Gold Scheme',
    icon: Sparkles,
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.12)',
    borderColor: 'rgba(245, 158, 11, 0.3)'
  },
  OTHER: {
    label: 'Other Scheme',
    icon: Layers,
    color: '#94a3b8',
    bgColor: 'rgba(148, 163, 184, 0.12)',
    borderColor: 'rgba(148, 163, 184, 0.3)'
  }
};

export default function CashSchemesVault({ schemes = [], loading, onRefresh }) {
  const [filterType, setFilterType] = useState('ALL');
  const [showAddModal, setShowAddModal] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove "${name}" from your vault?`)) {
      return;
    }

    setDeletingId(id);
    try {
      await api.deleteCash(id);
      onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to delete scheme');
    } finally {
      setDeletingId(null);
    }
  };

  // Aggregates
  const totalValue = schemes.reduce((sum, s) => sum + (s.current_value || 0), 0);
  const totalPaid = schemes.reduce((sum, s) => sum + (s.invested_amount || 0), 0);
  const totalMonthly = schemes.reduce((sum, s) => sum + (s.monthly_commitment || 0), 0);
  const totalMaturityPool = schemes.reduce((sum, s) => sum + (s.target_maturity_value || s.current_value || 0), 0);
  const overallReturn = totalValue - totalPaid;
  const overallReturnPct = totalPaid > 0 ? (overallReturn / totalPaid) * 100 : 0;

  const filteredSchemes = filterType === 'ALL'
    ? schemes
    : schemes.filter(s => s.scheme_type === filterType);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Vault KPI Summary Header */}
      <div className="summary-grid">
        <div className="kpi-card" style={{ cursor: 'default' }}>
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Total Cash & Schemes Value</span>
              <div className="kpi-icon-badge" style={{ color: '#10b981' }}>
                <Wallet size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono">
              {formatINR(totalValue)}
            </div>
            <div className="kpi-meta">
              <span className={overallReturn >= 0 ? 'badge-gain font-mono' : 'badge-loss font-mono'}>
                {overallReturn >= 0 ? '+' : ''}{formatPct(overallReturnPct)} Gain
              </span>
              <span className="font-mono" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {formatCompactINR(totalValue)}
              </span>
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Net Return:</span>
              <span className={overallReturn >= 0 ? 'text-gain font-mono' : 'text-loss font-mono'} style={{ fontWeight: 600 }}>
                {overallReturn >= 0 ? '+' : ''}{formatINR(overallReturn)}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'default' }}>
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Total Paid So Far</span>
              <div className="kpi-icon-badge" style={{ color: '#8b5cf6' }}>
                <Coins size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono">
              {formatINR(totalPaid)}
            </div>
            <div className="kpi-meta">
              <span className="badge-pill font-mono" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c4b5fd', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                {schemes.length} Account{schemes.length === 1 ? '' : 's'}
              </span>
              <span className="font-mono" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {formatCompactINR(totalPaid)}
              </span>
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Capital Basis:</span>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600 }}>Cumulative Outflow</span>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'default' }}>
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Monthly Chitti / RD Outflow</span>
              <div className="kpi-icon-badge" style={{ color: '#f59e0b' }}>
                <Calendar size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono" style={{ color: '#fbbf24' }}>
              {formatINR(totalMonthly)}
            </div>
            <div className="kpi-meta">
              <span className="badge-amber font-mono">
                ₹{formatCompactINR(totalMonthly * 12)} / yr
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Recurring
              </span>
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Commitment:</span>
              <span style={{ color: '#fbbf24', fontWeight: 600 }}>Active Installments</span>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'default' }}>
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Target Maturity Pool</span>
              <div className="kpi-icon-badge" style={{ color: '#06b6d4' }}>
                <Landmark size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono" style={{ color: '#22d3ee' }}>
              {formatINR(totalMaturityPool)}
            </div>
            <div className="kpi-meta">
              <span className="badge-pill font-mono" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#67e8f9', border: '1px solid rgba(6, 182, 212, 0.3)' }}>
                {formatCompactINR(totalMaturityPool)}
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Target Sum
              </span>
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Liquidity:</span>
              <span style={{ color: '#22d3ee', fontWeight: 600 }}>Chitti Pots & FDs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Vault Table & Cards Container */}
      <div className="table-card">
        <div className="card-toolbar" style={{ flexWrap: 'wrap', gap: '1rem' }}>
          {/* Filter Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Schemes' },
              { id: 'CHITTI', label: 'Chittis / Chit Funds' },
              { id: 'FD_RD', label: 'Fixed Deposits & RD' },
              { id: 'SAVINGS_CASH', label: 'Liquid Savings' },
              { id: 'GOLD_SCHEME', label: 'Gold Schemes' }
            ].map(f => (
              <button
                key={f.id}
                className={`btn-secondary ${filterType === f.id ? 'active' : ''}`}
                style={{
                  minHeight: '36px',
                  padding: '0.4rem 0.85rem',
                  fontSize: '0.82rem',
                  background: filterType === f.id ? 'rgba(99, 102, 241, 0.2)' : undefined,
                  borderColor: filterType === f.id ? 'var(--border-focus)' : undefined,
                  color: filterType === f.id ? '#a5b4fc' : undefined
                }}
                onClick={() => setFilterType(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
              id="btn-add-cash-scheme"
            >
              <PlusCircle size={16} />
              <span>+ Add Cash / Chitti Scheme</span>
            </button>
          </div>
        </div>

        {/* Content Rows */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Loading cash & traditional schemes...
          </div>
        ) : filteredSchemes.length === 0 ? (
          <div style={{ padding: '3.5rem 1.5rem', textAlign: 'center' }}>
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem', color: 'var(--text-muted)' }}>
              <Coins size={26} />
            </div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.5rem' }}>No schemes found in this view</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.5rem auto' }}>
              Track your family chitti pots, emergency FDs, high-yield liquid buffers, and gold schemes in one consolidated net worth console.
            </p>
            <button
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
            >
              <PlusCircle size={16} />
              <span>Add First Cash Scheme</span>
            </button>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Scheme & Portfolio</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Invested / Paid</th>
                  <th style={{ textAlign: 'right' }}>Current Value</th>
                  <th style={{ textAlign: 'right' }}>Accrued Return</th>
                  <th style={{ textAlign: 'right' }}>Monthly Outflow</th>
                  <th>Tenure / Progress</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSchemes.map(scheme => {
                  const cfg = SCHEME_CONFIG[scheme.scheme_type] || SCHEME_CONFIG.OTHER;
                  const Icon = cfg.icon;
                  const isGain = scheme.unrealized_pnl >= 0;

                  return (
                    <tr key={scheme.id}>
                      {/* Name & Demat */}
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.92rem' }}>
                          {scheme.scheme_name}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                          {scheme.profile_name} ({scheme.broker_name})
                        </div>
                        {scheme.notes && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <FileText size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>{scheme.notes}</span>
                          </div>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td>
                        <span 
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.4rem',
                            padding: '0.3rem 0.65rem',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            background: cfg.bgColor,
                            color: cfg.color,
                            border: `1px solid ${cfg.borderColor}`
                          }}
                        >
                          <Icon size={13} />
                          <span>{cfg.label}</span>
                        </span>
                      </td>

                      {/* Invested */}
                      <td style={{ textAlign: 'right' }} className="font-mono">
                        {formatINR(scheme.invested_amount)}
                      </td>

                      {/* Current Value */}
                      <td style={{ textAlign: 'right' }} className="font-mono" style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {formatINR(scheme.current_value)}
                      </td>

                      {/* Return */}
                      <td style={{ textAlign: 'right' }}>
                        <div className={isGain ? 'text-gain font-mono' : 'text-loss font-mono'} style={{ fontWeight: 600, fontSize: '0.88rem' }}>
                          {isGain ? '+' : ''}{formatINR(scheme.unrealized_pnl)}
                        </div>
                        <div className="font-mono" style={{ fontSize: '0.76rem', color: isGain ? 'var(--green-gain)' : 'var(--red-loss)' }}>
                          {isGain ? '+' : ''}{formatPct(scheme.pnl_percentage)}
                        </div>
                      </td>

                      {/* Monthly Outflow */}
                      <td style={{ textAlign: 'right' }} className="font-mono">
                        {scheme.monthly_commitment > 0 ? (
                          <span style={{ color: '#fbbf24', fontWeight: 500 }}>
                            {formatINR(scheme.monthly_commitment)} / mo
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>—</span>
                        )}
                      </td>

                      {/* Tenure / Progress */}
                      <td>
                        {scheme.tenure_info ? (
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                              {scheme.tenure_info}
                            </div>
                            {scheme.tenure_progress_pct !== null && (
                              <div style={{ marginTop: '0.35rem', width: '130px', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '999px', overflow: 'hidden' }}>
                                <div 
                                  style={{ 
                                    height: '100%', 
                                    width: `${scheme.tenure_progress_pct}%`, 
                                    background: 'linear-gradient(90deg, #6366f1, #10b981)',
                                    borderRadius: '999px'
                                  }} 
                                />
                              </div>
                            )}
                            {scheme.target_maturity_value && (
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                                Target: {formatINR(scheme.target_maturity_value)}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: 'right' }}>
                        <button
                          className="btn-action-delete"
                          onClick={() => handleDelete(scheme.id, scheme.scheme_name)}
                          disabled={deletingId === scheme.id}
                          title="Remove Scheme"
                          id={`btn-delete-cash-${scheme.id}`}
                        >
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Scheme Modal */}
      {showAddModal && (
        <AddCashSchemeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={onRefresh}
        />
      )}
    </div>
  );
}
