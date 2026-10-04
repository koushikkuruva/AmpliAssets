import React, { useState, useEffect } from 'react';
import { 
  QueryClient, 
  QueryClientProvider, 
  useQuery, 
  useMutation,
  useQueryClient 
} from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { api } from './api/client';
import { formatTimeAgo } from './utils/formatters';
import Navbar from './components/Navbar';
import AuthPage from './components/AuthPage';
import SummaryCards from './components/SummaryCards';
import EquityHoldingsTable from './components/EquityHoldingsTable';
import IpoTracker from './components/IpoTracker';
import MutualFundOverlap from './components/MutualFundOverlap';
import CashSchemesVault from './components/CashSchemesVault';
import PortfolioPowerUp from './components/PortfolioPowerUp';
import { 
  Briefcase, 
  Lock, 
  Layers, 
  RefreshCw, 
  CheckCircle2, 
  Users,
  Activity,
  Check,
  Zap,
  Coins
} from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30 // 30 seconds
    }
  }
});

function Dashboard() {
  const { user, portfolios, activePortfolioId } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('EQUITY'); // 'EQUITY', 'POWER_UP', 'CASH', 'IPO', 'OVERLAP'
  const [syncToast, setSyncToast] = useState('');

  // Fetch summary
  const { 
    data: summary, 
    isLoading: summaryLoading,
    refetch: refetchSummary 
  } = useQuery({
    queryKey: ['portfolio-summary', activePortfolioId],
    queryFn: () => api.getSummary(activePortfolioId)
  });

  // Fetch equities
  const { 
    data: holdings, 
    isLoading: holdingsLoading,
    refetch: refetchEquities 
  } = useQuery({
    queryKey: ['portfolio-equities', activePortfolioId],
    queryFn: () => api.getEquities(activePortfolioId)
  });

  // Fetch IPOs
  const { 
    data: ipos, 
    isLoading: iposLoading,
    refetch: refetchIpos 
  } = useQuery({
    queryKey: ['portfolio-ipos', activePortfolioId],
    queryFn: () => api.getIpos(activePortfolioId)
  });

  // Fetch MF
  const { 
    data: mfList, 
    isLoading: mfLoading,
    refetch: refetchMf 
  } = useQuery({
    queryKey: ['portfolio-mf', activePortfolioId],
    queryFn: () => api.getMutualFunds(activePortfolioId)
  });

  // Fetch Overlap
  const { 
    data: overlapData, 
    isLoading: overlapLoading,
    refetch: refetchOverlap 
  } = useQuery({
    queryKey: ['portfolio-overlap', activePortfolioId],
    queryFn: () => api.getOverlap(activePortfolioId)
  });

  // Fetch Cash & Traditional Schemes Vault
  const { 
    data: cashSchemes, 
    isLoading: cashLoading,
    refetch: refetchCash 
  } = useQuery({
    queryKey: ['portfolio-cash', activePortfolioId],
    queryFn: () => api.getCash(activePortfolioId)
  });

  // Fetch Portfolio Power-Up & Benchmark Alpha Audit
  const { 
    data: powerUpData, 
    isLoading: powerUpLoading,
    refetch: refetchPowerUp 
  } = useQuery({
    queryKey: ['portfolio-powerup', activePortfolioId],
    queryFn: () => api.getPowerUp(activePortfolioId)
  });

  // Live Price Sync Mutation
  const syncPricesMutation = useMutation({
    mutationFn: ({ force = false } = {}) => api.syncPrices({ force }, activePortfolioId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-summary'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-equities'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-overlap'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-powerup'] });
      if (data.message) {
        setSyncToast(data.message);
        setTimeout(() => setSyncToast(''), 4500);
      }
    },
    onError: (err) => {
      setSyncToast('Price sync failed: ' + (err.message || 'Network error'));
      setTimeout(() => setSyncToast(''), 4500);
    }
  });

  // Auto-sync on initial dashboard load if not fresh
  useEffect(() => {
    syncPricesMutation.mutate({ force: false });
  }, [activePortfolioId]);

  const handleRefreshAll = () => {
    refetchSummary();
    refetchEquities();
    refetchIpos();
    refetchMf();
    refetchOverlap();
    refetchCash();
    refetchPowerUp();
  };

  const handleNavigate = (tabKey) => {
    let target = tabKey;
    if (tabKey === 'equities') target = 'EQUITY';
    if (tabKey === 'powerup') target = 'POWER_UP';
    if (tabKey === 'cash') target = 'CASH';
    if (tabKey === 'ipos') target = 'IPO';
    if (tabKey === 'overlap') target = 'OVERLAP';
    setActiveTab(target);
    setTimeout(() => {
      const el = document.getElementById('portfolio-tabs-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const activePortfolio = portfolios.find(p => p.id === Number(activePortfolioId));
  const isCombined = activePortfolioId === 'ALL';
  const marketStatus = summary?.market_status || { isOpen: false, status: 'CLOSED', badge: 'Market Closed', istTime: '' };

  return (
    <div className="app-container">
      <Navbar 
        onSyncPrices={() => syncPricesMutation.mutate({ force: true })}
        isSyncing={syncPricesMutation.isPending}
        marketStatus={marketStatus}
      />

      <main className="main-content">
        {/* Dashboard Title & Scope Indicator */}
        <div className="dashboard-header">
          <div className="header-title-box">
            <h1>Indian Equity & IPO Console</h1>
            <div className="header-subtitle">
              <span>Viewing:</span>
              <span className="scope-pill" id="active-scope-badge">
                {isCombined ? (
                  <>
                    <Users size={12} />
                    <span>All Family Portfolios (Combined - {portfolios.length} Demats)</span>
                  </>
                ) : (
                  <>
                    <Briefcase size={12} />
                    <span>{activePortfolio?.profile_name} ({activePortfolio?.broker_name})</span>
                  </>
                )}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            {/* IST Market Status Badge */}
            <div 
              className="market-status-pill"
              title={`IST Market Hours: Mon-Fri 9:15 AM - 3:30 PM (Current IST: ${marketStatus.istTime || 'Live'})`}
              id="market-status-badge"
            >
              <span className={`status-dot ${marketStatus.isOpen ? 'dot-live' : 'dot-closed'}`} />
              <span style={{ fontWeight: 600 }}>{marketStatus.badge}</span>
              {summary?.last_price_sync && (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.74rem' }}>
                  • Synced {formatTimeAgo(summary.last_price_sync)}
                </span>
              )}
            </div>

            {/* Sync Live Prices Button */}
            <button
              className="btn-primary"
              style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)', boxShadow: '0 4px 14px rgba(6, 182, 212, 0.35)' }}
              onClick={() => syncPricesMutation.mutate({ force: true })}
              disabled={syncPricesMutation.isPending}
              id="btn-sync-live-prices"
              title="Force fetch live CMP and previous close from NSE/BSE"
            >
              <RefreshCw size={15} className={syncPricesMutation.isPending ? 'animate-spin' : ''} />
              <span>{syncPricesMutation.isPending ? 'Syncing...' : 'Sync Live Prices'}</span>
            </button>

            <button
              className="btn-secondary"
              onClick={handleRefreshAll}
              title="Refresh Portfolio Data"
              id="btn-refresh-data"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Sync Toast Banner */}
        {syncToast && (
          <div className="toast-banner" id="sync-toast-banner">
            <Check size={16} />
            <span>{syncToast}</span>
          </div>
        )}

        {/* Top KPI Cards & Sector Diversification */}
        <SummaryCards 
          summary={summary} 
          loading={summaryLoading} 
          activeTab={activeTab}
          onNavigate={handleNavigate}
        />

        {/* Primary Tabs */}
        <div className="tab-navigation" id="portfolio-tabs-section">
          <button
            className={`tab-btn ${activeTab === 'EQUITY' ? 'active' : ''}`}
            onClick={() => setActiveTab('EQUITY')}
            id="tab-equities"
          >
            <Briefcase size={16} />
            <span>Direct Equity Holdings</span>
            <span className="tab-count-badge">{holdings?.length || 0}</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'POWER_UP' ? 'active' : ''}`}
            onClick={() => setActiveTab('POWER_UP')}
            id="tab-powerup"
            style={{
              borderColor: activeTab === 'POWER_UP' ? '#06b6d4' : undefined
            }}
          >
            <Zap size={16} className={activeTab === 'POWER_UP' ? 'text-cyan' : ''} />
            <span>⚡ Portfolio Power-Up</span>
            {powerUpData?.health_score && (
              <span 
                className="tab-count-badge" 
                style={{ 
                  background: powerUpData.health_score >= 75 ? 'rgba(16, 185, 129, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                  color: powerUpData.health_score >= 75 ? 'var(--green-gain)' : 'var(--amber-mandate)'
                }}
              >
                {powerUpData.health_score}/100
              </span>
            )}
          </button>

          <button
            className={`tab-btn ${activeTab === 'CASH' ? 'active' : ''}`}
            onClick={() => setActiveTab('CASH')}
            id="tab-cash"
          >
            <Coins size={16} />
            <span>Cash, Chitti & Schemes</span>
            <span className="tab-count-badge">{cashSchemes?.length || 0}</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'IPO' ? 'active' : ''}`}
            onClick={() => setActiveTab('IPO')}
            id="tab-ipos"
          >
            <Lock size={16} />
            <span>IPO Mandates & Allotments</span>
            <span className="tab-count-badge">{ipos?.length || 0}</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'OVERLAP' ? 'active' : ''}`}
            onClick={() => setActiveTab('OVERLAP')}
            id="tab-overlap"
          >
            <Layers size={16} />
            <span>Mutual Fund Overlap</span>
            {overlapData?.overlapping_stocks_count > 0 && (
              <span className="tab-count-badge" style={{ background: 'var(--amber-mandate-bg)', color: 'var(--amber-mandate)' }}>
                {overlapData.overlapping_stocks_count} overlap
              </span>
            )}
          </button>
        </div>

        {/* Tab Panels */}
        {activeTab === 'EQUITY' && (
          <EquityHoldingsTable
            holdings={holdings}
            loading={holdingsLoading}
            onRefresh={handleRefreshAll}
          />
        )}

        {activeTab === 'POWER_UP' && (
          <PortfolioPowerUp
            powerUpData={powerUpData}
            loading={powerUpLoading}
            onRefresh={handleRefreshAll}
          />
        )}

        {activeTab === 'CASH' && (
          <CashSchemesVault
            schemes={cashSchemes}
            loading={cashLoading}
            onRefresh={handleRefreshAll}
          />
        )}

        {activeTab === 'IPO' && (
          <IpoTracker
            ipos={ipos}
            loading={iposLoading}
            onRefresh={handleRefreshAll}
          />
        )}

        {activeTab === 'OVERLAP' && (
          <MutualFundOverlap
            overlapData={overlapData}
            mfList={mfList}
            loading={overlapLoading || mfLoading}
            onRefresh={handleRefreshAll}
          />
        )}
      </main>

      {/* Mobile Fixed Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'POWER_UP' ? 'active' : ''}`}
          onClick={() => setActiveTab('POWER_UP')}
          id="mobile-tab-powerup"
        >
          <Zap size={18} />
          <span>⚡ Power-Up</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'EQUITY' ? 'active' : ''}`}
          onClick={() => setActiveTab('EQUITY')}
          id="mobile-tab-equities"
        >
          <Briefcase size={18} />
          <span>📈 Equities</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'CASH' ? 'active' : ''}`}
          onClick={() => setActiveTab('CASH')}
          id="mobile-tab-cash"
        >
          <Coins size={18} />
          <span>🏦 Cash/Chitti</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'IPO' ? 'active' : ''}`}
          onClick={() => setActiveTab('IPO')}
          id="mobile-tab-ipos"
        >
          <Lock size={18} />
          <span>🎯 IPOs</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'OVERLAP' ? 'active' : ''}`}
          onClick={() => setActiveTab('OVERLAP')}
          id="mobile-tab-overlap"
        >
          <Layers size={18} />
          <span>🔍 Overlap</span>
        </button>
      </nav>
    </div>
  );
}

function MainApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <RefreshCw size={24} className="animate-spin text-cyan" />
          <div style={{ fontSize: '0.9rem' }}>Loading Portfolio Console...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return <Dashboard />;
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <MainApp />
      </AuthProvider>
    </QueryClientProvider>
  );
}
