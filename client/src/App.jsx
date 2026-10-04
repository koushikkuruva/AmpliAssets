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
import AddProfileModal from './components/AddProfileModal';
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
  Coins,
  Home,
  ArrowLeft,
  ArrowRight,
  PlusCircle,
  GitCommit
} from 'lucide-react';

const HASH_TO_TAB = {
  '': 'OVERVIEW',
  '#': 'OVERVIEW',
  '#overview': 'OVERVIEW',
  '#home': 'OVERVIEW',
  '#power-up': 'POWER_UP',
  '#powerup': 'POWER_UP',
  '#equities': 'EQUITY',
  '#equity': 'EQUITY',
  '#cash': 'CASH',
  '#schemes': 'CASH',
  '#ipos': 'IPO',
  '#ipo': 'IPO',
  '#overlap': 'OVERLAP'
};

const TAB_TO_HASH = {
  OVERVIEW: '#overview',
  POWER_UP: '#power-up',
  EQUITY: '#equities',
  CASH: '#cash',
  IPO: '#ipos',
  OVERLAP: '#overlap'
};

const TAB_TITLES = {
  OVERVIEW: 'Portfolio Overview',
  POWER_UP: '⚡ Portfolio Power-Up & Alpha Audit',
  EQUITY: '📈 Direct Equity Holdings',
  CASH: '🏦 Cash, Chitti & Schemes Vault',
  IPO: '🎯 IPO Mandates & Allotments',
  OVERLAP: '🔍 Mutual Fund & Direct Overlap'
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 1000 * 30 // 30 seconds
    }
  }
});

function Dashboard() {
  const { user, portfolios, activePortfolioId, setActivePortfolioId, resetSandbox } = useAuth();
  const queryClient = useQueryClient();

  const getInitialTab = () => {
    if (typeof window !== 'undefined') {
      const hash = (window.location.hash || '').toLowerCase();
      if (HASH_TO_TAB[hash]) return HASH_TO_TAB[hash];
      return window.innerWidth < 768 ? 'OVERVIEW' : 'EQUITY';
    }
    return 'EQUITY';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);
  const [syncToast, setSyncToast] = useState('');
  const [showAddProfile, setShowAddProfile] = useState(false);

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

  // Synchronize activeTab with URL hash history for browser back/forward support
  useEffect(() => {
    const handleHashChange = () => {
      const hash = (window.location.hash || '').toLowerCase();
      if (HASH_TO_TAB[hash]) {
        setActiveTab(HASH_TO_TAB[hash]);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleRefreshAll = () => {
    refetchSummary();
    refetchEquities();
    refetchIpos();
    refetchMf();
    refetchOverlap();
    refetchCash();
    refetchPowerUp();
  };

  const handleResetSandbox = async () => {
    if (!window.confirm('Reset sandbox to default sample portfolio? Any custom changes made in this demo session will be restored.')) {
      return;
    }
    try {
      await resetSandbox();
      handleRefreshAll();
      setSyncToast('Sandbox portfolio restored to default sample data.');
      setTimeout(() => setSyncToast(''), 4500);
    } catch (err) {
      alert(err.message || 'Failed to reset sandbox');
    }
  };

  const handleNavigate = (tabKey) => {
    let target = tabKey;
    if (tabKey === 'equities' || tabKey === 'equity') target = 'EQUITY';
    if (tabKey === 'powerup' || tabKey === 'power-up') target = 'POWER_UP';
    if (tabKey === 'cash') target = 'CASH';
    if (tabKey === 'ipos' || tabKey === 'ipo') target = 'IPO';
    if (tabKey === 'overlap') target = 'OVERLAP';
    if (tabKey === 'overview' || tabKey === 'home') target = 'OVERVIEW';

    setActiveTab(target);
    const targetHash = TAB_TO_HASH[target] || '#overview';
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // On desktop, scroll smoothly to tabs section
    if (window.innerWidth >= 768) {
      setTimeout(() => {
        const el = document.getElementById('portfolio-tabs-section');
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 50);
    }
  };

  const activePortfolio = portfolios.find(p => p.id === Number(activePortfolioId));
  const isCombined = activePortfolioId === 'ALL';
  const marketStatus = summary?.market_status || { isOpen: false, status: 'CLOSED', badge: 'Market Closed', istTime: '' };

  const isOverview = activeTab === 'OVERVIEW';
  const currentModule = activeTab === 'OVERVIEW' ? 'EQUITY' : activeTab;

  return (
    <div className="app-container">
      <Navbar 
        onSyncPrices={() => syncPricesMutation.mutate({ force: true })}
        isSyncing={syncPricesMutation.isPending}
        marketStatus={marketStatus}
        portfolios={portfolios}
        selectedPortfolio={activePortfolioId}
        onSelectPortfolio={setActivePortfolioId}
        onOpenAddProfile={() => setShowAddProfile(true)}
        onResetSandbox={handleResetSandbox}
      />

      <main className="main-content">
        {/* Dashboard Title & Scope Indicator (Hidden on mobile when inside dedicated module page) */}
        <div className={`dashboard-header ${!isOverview ? 'hide-on-mobile' : ''}`}>
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
              type="button"
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
              type="button"
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

        {/* Mobile Page Top Back Bar (Shown on mobile when viewing dedicated module pages) */}
        {!isOverview && (
          <div className="mobile-page-top-bar" id="mobile-page-top-bar">
            <button 
              type="button" 
              className="btn-back-home"
              onClick={() => handleNavigate('OVERVIEW')}
              title="Return to Portfolio Overview"
              id="btn-back-home"
            >
              <ArrowLeft size={16} />
              <span>← Home</span>
            </button>

            <div className="mobile-page-title-text">
              {TAB_TITLES[activeTab] || 'Module'}
            </div>

            <div className="mobile-page-top-actions">
              {activeTab === 'EQUITY' && (
                <>
                  <button
                    type="button"
                    className="mobile-top-action-btn secondary"
                    onClick={() => {
                      const el = document.getElementById('btn-corp-action-modal');
                      if (el) el.click();
                    }}
                    disabled={!holdings || holdings.length === 0}
                    id="mobile-header-btn-corp-action"
                    title="Record Corporate Action"
                  >
                    <GitCommit size={13} className="text-cyan" />
                    <span>Corp Action</span>
                  </button>

                  <button
                    type="button"
                    className="mobile-top-action-btn primary"
                    onClick={() => {
                      const el = document.getElementById('btn-add-stock-modal');
                      if (el) el.click();
                    }}
                    id="mobile-header-btn-add-stock"
                  >
                    <PlusCircle size={13} />
                    <span>+ Add Stock</span>
                  </button>
                </>
              )}

              {activeTab === 'CASH' && (
                <button
                  type="button"
                  className="mobile-top-action-btn primary"
                  onClick={() => {
                    const el = document.getElementById('btn-add-cash-scheme');
                    if (el) el.click();
                  }}
                  id="mobile-header-btn-add-scheme"
                >
                  <PlusCircle size={13} />
                  <span>+ Add Scheme</span>
                </button>
              )}

              {activeTab === 'IPO' && (
                <button
                  type="button"
                  className="mobile-top-action-btn primary"
                  onClick={() => {
                    const el = document.getElementById('btn-apply-ipo-modal');
                    if (el) el.click();
                  }}
                  id="mobile-header-btn-apply-ipo"
                >
                  <PlusCircle size={13} />
                  <span>+ Apply IPO</span>
                </button>
              )}

              {activeTab === 'OVERLAP' && (
                <button
                  type="button"
                  className="mobile-top-action-btn primary"
                  onClick={() => {
                    const el = document.getElementById('btn-add-mf-modal');
                    if (el) el.click();
                  }}
                  id="mobile-header-btn-add-mf"
                >
                  <PlusCircle size={13} />
                  <span>+ Add MF</span>
                </button>
              )}

              {activeTab === 'POWER_UP' && (
                <button
                  type="button"
                  className="mobile-top-action-btn primary"
                  onClick={() => syncPricesMutation.mutate({ force: true })}
                  disabled={syncPricesMutation.isPending}
                  id="mobile-header-btn-sync"
                >
                  <RefreshCw size={13} className={syncPricesMutation.isPending ? 'animate-spin' : ''} />
                  <span>{syncPricesMutation.isPending ? 'Syncing...' : 'Sync'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Top KPI Cards (Hidden on mobile when inside dedicated module page) */}
        <div className={`summary-cards-wrapper ${!isOverview ? 'hide-on-mobile' : ''}`}>
          <SummaryCards 
            summary={summary} 
            loading={summaryLoading} 
            activeTab={currentModule}
            onNavigate={handleNavigate}
          />
        </div>

        {/* Mobile Home Overview Shortcuts (Shown only on mobile Home) */}
        {isOverview && (
          <div className="mobile-overview-shortcuts">
            <div className="overview-shortcuts-header">
              <span>Portfolio Modules</span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Tap to open full page</span>
            </div>
            <div className="overview-shortcuts-grid">
              <button 
                type="button" 
                className="shortcut-card" 
                onClick={() => handleNavigate('POWER_UP')}
                id="shortcut-powerup"
              >
                <div className="shortcut-icon" style={{ color: '#06b6d4', background: 'rgba(6, 182, 212, 0.12)' }}>
                  <Zap size={20} />
                </div>
                <div className="shortcut-info">
                  <div className="shortcut-title">Portfolio Power-Up</div>
                  <div className="shortcut-desc">Dezerv-style Alpha & Health Audit</div>
                </div>
                <ArrowRight size={16} className="shortcut-arrow" />
              </button>

              <button 
                type="button" 
                className="shortcut-card" 
                onClick={() => handleNavigate('EQUITY')}
                id="shortcut-equities"
              >
                <div className="shortcut-icon" style={{ color: '#10b981', background: 'rgba(16, 185, 129, 0.12)' }}>
                  <Briefcase size={20} />
                </div>
                <div className="shortcut-info">
                  <div className="shortcut-title">Direct Equity Holdings</div>
                  <div className="shortcut-desc">{holdings?.length || 0} stocks across Demats</div>
                </div>
                <ArrowRight size={16} className="shortcut-arrow" />
              </button>

              <button 
                type="button" 
                className="shortcut-card" 
                onClick={() => handleNavigate('CASH')}
                id="shortcut-cash"
              >
                <div className="shortcut-icon" style={{ color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.12)' }}>
                  <Coins size={20} />
                </div>
                <div className="shortcut-info">
                  <div className="shortcut-title">Cash & Chitti Vault</div>
                  <div className="shortcut-desc">{cashSchemes?.length || 0} traditional schemes</div>
                </div>
                <ArrowRight size={16} className="shortcut-arrow" />
              </button>

              <button 
                type="button" 
                className="shortcut-card" 
                onClick={() => handleNavigate('IPO')}
                id="shortcut-ipos"
              >
                <div className="shortcut-icon" style={{ color: '#f59e0b', background: 'rgba(245, 158, 11, 0.12)' }}>
                  <Lock size={20} />
                </div>
                <div className="shortcut-info">
                  <div className="shortcut-title">IPO ASBA Mandates</div>
                  <div className="shortcut-desc">{ipos?.length || 0} applied & allotted</div>
                </div>
                <ArrowRight size={16} className="shortcut-arrow" />
              </button>

              <button 
                type="button" 
                className="shortcut-card" 
                onClick={() => handleNavigate('OVERLAP')}
                id="shortcut-overlap"
              >
                <div className="shortcut-icon" style={{ color: '#38bdf8', background: 'rgba(56, 189, 248, 0.12)' }}>
                  <Layers size={20} />
                </div>
                <div className="shortcut-info">
                  <div className="shortcut-title">MF & Stock Overlap</div>
                  <div className="shortcut-desc">{overlapData?.overlapping_stocks_count || 0} overlapping stocks</div>
                </div>
                <ArrowRight size={16} className="shortcut-arrow" />
              </button>
            </div>
          </div>
        )}

        {/* Primary Desktop Tabs (Hidden on mobile) */}
        <div className="tab-navigation" id="portfolio-tabs-section">
          <button
            type="button"
            className={`tab-btn ${currentModule === 'EQUITY' ? 'active' : ''}`}
            onClick={() => handleNavigate('EQUITY')}
            id="tab-equities"
          >
            <Briefcase size={16} />
            <span>Direct Equity Holdings</span>
            <span className="tab-count-badge">{holdings?.length || 0}</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${currentModule === 'POWER_UP' ? 'active' : ''}`}
            onClick={() => handleNavigate('POWER_UP')}
            id="tab-powerup"
            style={{
              borderColor: currentModule === 'POWER_UP' ? '#06b6d4' : undefined
            }}
          >
            <Zap size={16} className={currentModule === 'POWER_UP' ? 'text-cyan' : ''} />
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
            type="button"
            className={`tab-btn ${currentModule === 'CASH' ? 'active' : ''}`}
            onClick={() => handleNavigate('CASH')}
            id="tab-cash"
          >
            <Coins size={16} />
            <span>Cash, Chitti & Schemes</span>
            <span className="tab-count-badge">{cashSchemes?.length || 0}</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${currentModule === 'IPO' ? 'active' : ''}`}
            onClick={() => handleNavigate('IPO')}
            id="tab-ipos"
          >
            <Lock size={16} />
            <span>IPO Mandates & Allotments</span>
            <span className="tab-count-badge">{ipos?.length || 0}</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${currentModule === 'OVERLAP' ? 'active' : ''}`}
            onClick={() => handleNavigate('OVERLAP')}
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

        {/* Tab Panels (Hidden on mobile Home; visible on mobile when inside dedicated module page; always visible on desktop) */}
        <div className={`tab-panel-container ${isOverview ? 'hide-on-mobile' : ''}`}>
          {currentModule === 'EQUITY' && (
            <EquityHoldingsTable
              holdings={holdings}
              loading={holdingsLoading}
              onRefresh={handleRefreshAll}
            />
          )}

          {currentModule === 'POWER_UP' && (
            <PortfolioPowerUp
              powerUpData={powerUpData}
              loading={powerUpLoading}
              onRefresh={handleRefreshAll}
            />
          )}

          {currentModule === 'CASH' && (
            <CashSchemesVault
              schemes={cashSchemes}
              loading={cashLoading}
              onRefresh={handleRefreshAll}
            />
          )}

          {currentModule === 'IPO' && (
            <IpoTracker
              ipos={ipos}
              loading={iposLoading}
              onRefresh={handleRefreshAll}
            />
          )}

          {currentModule === 'OVERLAP' && (
            <MutualFundOverlap
              overlapData={overlapData}
              mfList={mfList}
              loading={overlapLoading || mfLoading}
              onRefresh={handleRefreshAll}
            />
          )}
        </div>
      </main>

      {/* Mobile Fixed Bottom Navigation Bar (6 Page Items) */}
      <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'OVERVIEW' ? 'active' : ''}`}
          onClick={() => handleNavigate('OVERVIEW')}
          id="mobile-tab-home"
        >
          <Home size={17} />
          <span>Home</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'POWER_UP' ? 'active' : ''}`}
          onClick={() => handleNavigate('POWER_UP')}
          id="mobile-tab-powerup"
        >
          <Zap size={17} />
          <span>Power-Up</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'EQUITY' ? 'active' : ''}`}
          onClick={() => handleNavigate('EQUITY')}
          id="mobile-tab-equities"
        >
          <Briefcase size={17} />
          <span>Equities</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'CASH' ? 'active' : ''}`}
          onClick={() => handleNavigate('CASH')}
          id="mobile-tab-cash"
        >
          <Coins size={17} />
          <span>Cash/Chitti</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'IPO' ? 'active' : ''}`}
          onClick={() => handleNavigate('IPO')}
          id="mobile-tab-ipos"
        >
          <Lock size={17} />
          <span>IPOs</span>
        </button>

        <button
          type="button"
          className={`bottom-nav-item ${activeTab === 'OVERLAP' ? 'active' : ''}`}
          onClick={() => handleNavigate('OVERLAP')}
          id="mobile-tab-overlap"
        >
          <Layers size={17} />
          <span>Overlap</span>
        </button>
      </nav>

      {showAddProfile && (
        <AddProfileModal onClose={() => setShowAddProfile(false)} />
      )}
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
