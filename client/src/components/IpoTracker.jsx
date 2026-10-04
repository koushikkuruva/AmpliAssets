import React, { useState } from 'react';
import { 
  Lock, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  PlusCircle, 
  Edit3, 
  Trash2, 
  ExternalLink,
  TrendingUp,
  Layers
} from 'lucide-react';
import { formatINR, formatCompactINR, formatPct, formatDate } from '../utils/formatters';
import ApplyIpoModal from './ApplyIpoModal';
import UpdateAllotmentModal from './UpdateAllotmentModal';
import { api } from '../api/client';

export default function IpoTracker({ ipos, loading, onRefresh }) {
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedIpoForUpdate, setSelectedIpoForUpdate] = useState(null);

  const ipoList = ipos || [];

  // 1. Total Blocked Mandate Capital (APPLIED status)
  const appliedIpos = ipoList.filter(i => i.status === 'APPLIED');
  const totalBlocked = appliedIpos.reduce((sum, i) => sum + (i.blocked_amount || 0), 0);

  // 2. Total Allotted Capital (ALLOTTED status)
  const allottedIpos = ipoList.filter(i => i.status === 'ALLOTTED');
  const totalAllotted = allottedIpos.reduce((sum, i) => sum + (i.blocked_amount || 0), 0);

  // 3. Total Listing Gains & Gain Pct
  let totalListingGain = 0;
  let totalAllottedCost = 0;
  allottedIpos.forEach(i => {
    if (i.listing_price && i.issue_price) {
      const shares = i.lot_size * i.lots_applied;
      const cost = i.issue_price * shares;
      const gain = (i.listing_price - i.issue_price) * shares;
      totalListingGain += gain;
      totalAllottedCost += cost;
    }
  });
  const listingGainPct = totalAllottedCost > 0 ? (totalListingGain / totalAllottedCost) * 100 : 0;

  // 4. Mandate Success / Allotment Rate
  const completedIpos = ipoList.filter(i => i.status === 'ALLOTTED' || i.status === 'NOT_ALLOTTED');
  const allotmentRate = completedIpos.length > 0 ? (allottedIpos.length / completedIpos.length) * 100 : 0;

  const handleDelete = async (id, company) => {
    if (window.confirm(`Delete application for ${company}?`)) {
      try {
        await api.deleteIpo(id);
        onRefresh();
      } catch (err) {
        alert(err.message || 'Failed to delete IPO record');
      }
    }
  };

  return (
    <>
      {/* IPO Mandates KPI Summary Strip */}
      <div className="summary-grid" style={{ marginBottom: '1.5rem' }}>
        <div className="kpi-card" style={{ cursor: 'default' }}>
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Blocked Mandate Capital</span>
              <div className="kpi-icon-badge" style={{ color: 'var(--amber-mandate)' }}>
                <Lock size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono" style={{ color: 'var(--amber-mandate)' }}>
              {formatINR(totalBlocked)}
            </div>
            <div className="kpi-meta">
              <span className="badge-amber font-mono">
                {appliedIpos.length} Active Mandate{appliedIpos.length === 1 ? '' : 's'}
              </span>
              <span className="font-mono" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {formatCompactINR(totalBlocked)}
              </span>
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>UPI Mandate:</span>
              <span style={{ color: totalBlocked > 0 ? 'var(--amber-mandate)' : 'var(--text-muted)', fontWeight: 600 }}>
                {totalBlocked > 0 ? 'ASBA Lien Blocked' : 'Zero Active Liens'}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'default' }}>
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Allotted Primary Capital</span>
              <div className="kpi-icon-badge" style={{ color: 'var(--green-gain)' }}>
                <CheckCircle2 size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono">
              {formatINR(totalAllotted)}
            </div>
            <div className="kpi-meta">
              <span className="badge-gain font-mono">
                {allottedIpos.length} Allotted
              </span>
              <span className="font-mono" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                {formatCompactINR(totalAllotted)}
              </span>
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Hit Rate:</span>
              <span style={{ color: 'var(--green-gain)', fontWeight: 600 }}>
                {allotmentRate > 0 ? `${allotmentRate.toFixed(0)}% Allotted` : 'No Closed Bids'}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'default' }}>
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Listing Day Gains / P&L</span>
              <div className="kpi-icon-badge" style={{ color: totalListingGain >= 0 ? '#10b981' : '#ef4444' }}>
                <TrendingUp size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono" style={{ color: totalListingGain >= 0 ? 'var(--green-gain)' : 'var(--red-loss)' }}>
              {totalListingGain >= 0 ? '+' : ''}{formatINR(totalListingGain)}
            </div>
            <div className="kpi-meta">
              <span className={totalListingGain >= 0 ? 'badge-gain font-mono' : 'badge-loss font-mono'}>
                {totalListingGain >= 0 ? '+' : ''}{formatPct(listingGainPct)}
              </span>
              <span className="font-mono" style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Debut Gain
              </span>
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Debut Return:</span>
              <span className={totalListingGain >= 0 ? 'text-gain font-mono' : 'text-loss font-mono'} style={{ fontWeight: 600 }}>
                {totalListingGain >= 0 ? 'Listing Profit' : 'Listing Loss'}
              </span>
            </div>
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'default' }}>
          <div className="kpi-card-body">
            <div className="kpi-card-header">
              <span className="kpi-label">Total Applications Filed</span>
              <div className="kpi-icon-badge" style={{ color: '#818cf8' }}>
                <Layers size={18} />
              </div>
            </div>
            <div className="kpi-value font-mono" style={{ color: '#c7d2fe' }}>
              {ipoList.length} <span style={{ fontSize: '0.95rem', fontWeight: 500, color: 'var(--text-muted)' }}>Bids</span>
            </div>
            <div className="kpi-meta">
              <span className="badge-pill font-mono" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                {ipoList.length} Total
              </span>
              <span style={{ marginLeft: 'auto', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Family Demats
              </span>
            </div>
            <div className="kpi-subrow">
              <span style={{ color: 'var(--text-muted)' }}>Primary Market:</span>
              <span style={{ color: '#a5b4fc', fontWeight: 600 }}>IPO Mandates</span>
            </div>
          </div>
        </div>
      </div>
      <div className="content-card">
        <div className="card-toolbar">
          <div>
            <h3 className="toolbar-title">IPO Mandate & Allotment Tracker</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Family Demat UPI ASBA mandates & listing day returns
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={() => setShowApplyModal(true)}
            id="btn-apply-ipo-modal"
          >
            <PlusCircle size={16} />
            <span>+ Apply for IPO</span>
          </button>
        </div>

        <div className="mobile-scroll-hint">
          <span style={{ fontWeight: 600 }}>IPO Tracker</span>
          <span>Swipe horizontally for Mandates & Returns &rarr;</span>
        </div>

        <div className="table-responsive">
          <table className="data-table" id="ipo-table">
            <thead>
              <tr>
                <th>Company / IPO</th>
                <th>Family Demat Account</th>
                <th style={{ textAlign: 'right' }}>Issue Price</th>
                <th style={{ textAlign: 'right' }}>Lots & Shares</th>
                <th style={{ textAlign: 'right' }}>Blocked Mandate</th>
                <th style={{ textAlign: 'center' }}>Allotment Status</th>
                <th style={{ textAlign: 'right' }}>Listing Gain / Price</th>
                <th>Date</th>
                <th style={{ textAlign: 'center' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading IPO mandates...
                  </td>
                </tr>
              ) : (ipos || []).length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <div>No IPO applications found in this portfolio scope.</div>
                    <button
                      className="btn-primary"
                      style={{ marginTop: '1rem' }}
                      onClick={() => setShowApplyModal(true)}
                    >
                      <PlusCircle size={15} />
                      <span>Record new IPO application</span>
                    </button>
                  </td>
                </tr>
              ) : (
                (ipos || []).map(ipo => {
                  let statusBadge = null;
                  if (ipo.status === 'APPLIED') {
                    statusBadge = (
                      <span className="badge-amber" style={{ display: 'inline-flex' }}>
                        <Clock size={12} />
                        <span>APPLIED (BLOCKED)</span>
                      </span>
                    );
                  } else if (ipo.status === 'ALLOTTED') {
                    statusBadge = (
                      <span className="badge-gain" style={{ display: 'inline-flex' }}>
                        <CheckCircle2 size={12} />
                        <span>ALLOTTED</span>
                      </span>
                    );
                  } else {
                    statusBadge = (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.15rem 0.5rem', borderRadius: 'var(--radius-sm)', background: 'rgba(255,255,255,0.06)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                        <XCircle size={12} />
                        <span>NOT ALLOTTED</span>
                      </span>
                    );
                  }

                  return (
                    <tr key={ipo.id} id={`row-ipo-${ipo.id}`}>
                      <td>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{ipo.company_name}</div>
                      </td>

                      <td>
                        <span className="profile-tag">
                          {ipo.profile_name} ({ipo.broker_name})
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }} className="font-mono">
                        {formatINR(ipo.issue_price)}
                      </td>

                      <td style={{ textAlign: 'right' }} className="font-mono">
                        <div>{ipo.lots_applied} lot{ipo.lots_applied > 1 ? 's' : ''}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          ({ipo.total_shares} shares)
                        </div>
                      </td>

                      <td style={{ textAlign: 'right' }} className="font-mono" style={{ fontWeight: 600, color: ipo.status === 'APPLIED' ? 'var(--amber-mandate)' : 'var(--text-primary)' }}>
                        {formatINR(ipo.blocked_amount)}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        {statusBadge}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        {ipo.status === 'ALLOTTED' && ipo.listing_price ? (
                          <div>
                            <div className="font-mono" style={{ fontWeight: 600, color: ipo.listing_gain >= 0 ? 'var(--green-gain)' : 'var(--red-loss)' }}>
                              {formatINR(ipo.listing_gain)}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Listed @ {formatINR(ipo.listing_price)} ({formatPct(ipo.listing_gain_pct)})
                            </div>
                          </div>
                        ) : ipo.status === 'ALLOTTED' ? (
                          <span style={{ fontSize: '0.78rem', color: 'var(--green-gain)' }}>Allotted (Awaiting Listing)</span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                          {formatDate(ipo.allotment_date || ipo.created_at)}
                        </span>
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            className="btn-secondary"
                            style={{ minHeight: '40px', minWidth: '44px', padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
                            title="Update Allotment Outcome"
                            onClick={() => setSelectedIpoForUpdate(ipo)}
                            id={`btn-update-ipo-${ipo.id}`}
                          >
                            <Edit3 size={14} className="text-amber" />
                            <span>Update</span>
                          </button>

                          <button
                            className="btn-secondary"
                            style={{ minHeight: '40px', minWidth: '44px', padding: '0.45rem', color: 'var(--red-loss)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
                            title="Delete Application"
                            onClick={() => handleDelete(ipo.id, ipo.company_name)}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showApplyModal && (
        <ApplyIpoModal
          onClose={() => setShowApplyModal(false)}
          onSuccess={onRefresh}
        />
      )}

      {selectedIpoForUpdate && (
        <UpdateAllotmentModal
          ipo={selectedIpoForUpdate}
          onClose={() => setSelectedIpoForUpdate(null)}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
