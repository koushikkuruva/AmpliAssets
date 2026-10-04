import React, { useState } from 'react';
import { 
  PlusCircle, 
  GitCommit, 
  Trash2, 
  TrendingUp, 
  TrendingDown, 
  Search, 
  Filter,
  FileText 
} from 'lucide-react';
import { formatINR, formatPct } from '../utils/formatters';
import AddStockModal from './AddStockModal';
import CorporateActionModal from './CorporateActionModal';
import { api } from '../api/client';

export default function EquityHoldingsTable({ holdings, loading, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedHoldingForCA, setSelectedHoldingForCA] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sectorFilter, setSectorFilter] = useState('ALL');

  const filteredHoldings = (holdings || []).filter(h => {
    const matchesSearch = h.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.profile_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          h.sector.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSector = sectorFilter === 'ALL' || h.sector === sectorFilter;
    return matchesSearch && matchesSector;
  });

  const sectors = Array.from(new Set((holdings || []).map(h => h.sector))).filter(Boolean);

  const handleDelete = async (id, symbol) => {
    if (window.confirm(`Are you sure you want to remove ${symbol} from holdings?`)) {
      try {
        await api.deleteEquity(id);
        onRefresh();
      } catch (err) {
        alert(err.message || 'Failed to delete holding');
      }
    }
  };

  return (
    <>
      <div className="content-card">
        <div className="card-toolbar">
          <div>
            <h3 className="toolbar-title">Direct Equity Holdings</h3>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
              Showing {filteredHoldings.length} of {holdings?.length || 0} stocks
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                className="form-input"
                placeholder="Search symbol, sector..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '32px', fontSize: '0.85rem', width: '180px' }}
                id="search-holdings"
              />
            </div>

            {/* Sector Filter */}
            {sectors.length > 0 && (
              <select
                className="form-select"
                value={sectorFilter}
                onChange={e => setSectorFilter(e.target.value)}
                style={{ fontSize: '0.85rem' }}
                id="filter-sector"
              >
                <option value="ALL">All Sectors</option>
                {sectors.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            )}

            <button
              className="btn-primary"
              onClick={() => setShowAddModal(true)}
              id="btn-add-stock-modal"
            >
              <PlusCircle size={16} />
              <span>+ Add Stock</span>
            </button>
          </div>
        </div>

        <div className="mobile-scroll-hint">
          <span style={{ fontWeight: 600 }}>Equity Table</span>
          <span>Swipe horizontally for Qty, CMP & Actions &rarr;</span>
        </div>

        <div className="table-responsive">
          <table className="data-table" id="holdings-table">
            <thead>
              <tr>
                <th>Stock / Demat</th>
                <th>Sector</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th style={{ textAlign: 'right' }}>Avg Buy</th>
                <th style={{ textAlign: 'right' }}>CMP</th>
                <th style={{ textAlign: 'right' }}>Current Value</th>
                <th style={{ textAlign: 'right' }}>P&L (₹ / %)</th>
                <th>Corporate Actions & Notes</th>
                <th style={{ textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                    Loading holdings...
                  </td>
                </tr>
              ) : filteredHoldings.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
                    <div>No direct equity holdings found in this portfolio scope.</div>
                    <button
                      className="btn-primary"
                      style={{ marginTop: '1rem' }}
                      onClick={() => setShowAddModal(true)}
                    >
                      <PlusCircle size={15} />
                      <span>Add your first holding</span>
                    </button>
                  </td>
                </tr>
              ) : (
                filteredHoldings.map(h => {
                  const isGain = h.unrealized_pnl >= 0;
                  return (
                    <tr key={h.id} id={`row-holding-${h.id}`}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center' }}>
                          <span className="stock-symbol">{h.symbol}</span>
                          <span className="stock-exchange">{h.exchange}</span>
                        </div>
                        <div style={{ marginTop: '0.25rem' }}>
                          <span className="profile-tag">
                            {h.profile_name} ({h.broker_name})
                          </span>
                        </div>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                          {h.sector}
                        </span>
                      </td>

                      <td style={{ textAlign: 'right' }} className="font-mono">
                        {h.quantity}
                      </td>

                      <td style={{ textAlign: 'right' }} className="font-mono">
                        {formatINR(h.avg_buy_price)}
                      </td>

                      <td style={{ textAlign: 'right' }} className="font-mono">
                        <div style={{ fontWeight: 600 }}>{formatINR(h.current_market_price)}</div>
                        {h.day_change_pct !== undefined && h.day_change_pct !== null && (
                          <div style={{ fontSize: '0.72rem', marginTop: '0.15rem' }}>
                            <span 
                              className={h.day_change_pct >= 0 ? 'text-gain' : 'text-loss'} 
                              style={{ fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.15rem' }}
                              title={`Day Change vs Prev Close (₹${h.previous_close || h.current_market_price})`}
                            >
                              {h.day_change_pct >= 0 ? '+' : ''}{h.day_change_pct}%
                            </span>
                          </div>
                        )}
                      </td>

                      <td style={{ textAlign: 'right' }} className="font-mono" style={{ fontWeight: 600 }}>
                        {formatINR(h.current_value)}
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div className="font-mono" style={{ fontWeight: 600, color: isGain ? 'var(--green-gain)' : 'var(--red-loss)' }}>
                          {formatINR(h.unrealized_pnl)}
                        </div>
                        <div style={{ fontSize: '0.75rem', marginTop: '0.1rem' }}>
                          <span className={isGain ? 'badge-gain' : 'badge-loss'} style={{ padding: '0.1rem 0.35rem', fontSize: '0.72rem' }}>
                            {formatPct(h.pnl_percentage)}
                          </span>
                        </div>
                      </td>

                      <td>
                        {h.corporate_action_note ? (
                          <span className="action-note-pill" title={h.corporate_action_note}>
                            {h.corporate_action_note}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>None</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                          <button
                            className="btn-secondary"
                            style={{ minHeight: '40px', minWidth: '44px', padding: '0.45rem 0.75rem', fontSize: '0.82rem' }}
                            title="Adjust for Split, Bonus, or Demerger"
                            onClick={() => setSelectedHoldingForCA(h)}
                            id={`btn-ca-${h.id}`}
                          >
                            <GitCommit size={15} className="text-cyan" />
                            <span>Action</span>
                          </button>

                          <button
                            className="btn-secondary"
                            style={{ minHeight: '40px', minWidth: '44px', padding: '0.45rem', color: 'var(--red-loss)', borderColor: 'rgba(244, 63, 94, 0.2)' }}
                            title="Delete Holding"
                            onClick={() => handleDelete(h.id, h.symbol)}
                            id={`btn-delete-${h.id}`}
                          >
                            <Trash2 size={15} />
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

      {showAddModal && (
        <AddStockModal
          onClose={() => setShowAddModal(false)}
          onSuccess={onRefresh}
        />
      )}

      {selectedHoldingForCA && (
        <CorporateActionModal
          holding={selectedHoldingForCA}
          onClose={() => setSelectedHoldingForCA(null)}
          onSuccess={onRefresh}
        />
      )}
    </>
  );
}
