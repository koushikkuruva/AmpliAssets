import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  ChevronDown, 
  PlusCircle, 
  LogOut, 
  TrendingUp, 
  Check, 
  Briefcase,
  RotateCcw,
  Menu,
  X,
  Sparkles,
  ArrowRight,
  RefreshCw,
  UserCheck
} from 'lucide-react';
import AddProfileModal from './AddProfileModal';

export default function Navbar({ onSyncPrices, isSyncing = false, marketStatus }) {
  const { 
    user, 
    portfolios, 
    activePortfolioId, 
    setActivePortfolioId, 
    logout, 
    resetSandbox,
    startRegistrationFromSandbox 
  } = useAuth();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [resetting, setResetting] = useState(false);
  const dropdownRef = useRef(null);

  const isSandbox = user?.email === 'demo@investor.in';

  const handleResetSandbox = async () => {
    if (!window.confirm('Reset sandbox to default sample portfolio? Any custom changes made in this demo session will be restored.')) {
      return;
    }
    setResetting(true);
    try {
      await resetSandbox();
      window.location.reload();
    } catch (err) {
      alert(err.message || 'Failed to reset sandbox');
      setResetting(false);
    }
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activePortfolio = portfolios.find(p => p.id === Number(activePortfolioId));
  const activeLabel = activePortfolioId === 'ALL' 
    ? 'All Family Portfolios (Combined)' 
    : `${activePortfolio?.profile_name || 'Portfolio'} (${activePortfolio?.broker_name || ''})`;

  const activeLabelCompact = activePortfolioId === 'ALL'
    ? 'All Family'
    : (activePortfolio?.profile_name || 'Portfolio');

  return (
    <>
      <header className="navbar-container">
        <nav className="navbar">
          {/* Brand - Desktop & Mobile Left */}
          <div className="nav-brand">
            <div className="brand-icon-box">
              <TrendingUp size={20} strokeWidth={2.5} />
            </div>
            <div className="brand-text-desktop">
              <div style={{ fontWeight: 800, fontSize: '1.05rem', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                Indian Equity & IPO Analyzer
              </div>
              <div style={{ fontSize: '0.66rem', fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
                FAMILY DEMAT CONSOLE
              </div>
            </div>
            <div className="brand-text-mobile">
              <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>Equity & IPO</span>
            </div>
          </div>

          {/* Mobile Center: Active Portfolio Pill */}
          <div className="mobile-portfolio-pill-wrap">
            <button
              type="button"
              className="mobile-portfolio-pill"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              title="Change active portfolio"
              id="mobile-portfolio-switch-btn"
            >
              {activePortfolioId === 'ALL' ? (
                <Users size={13} className="text-cyan" />
              ) : (
                <Briefcase size={13} className="text-amber" />
              )}
              <span className="pill-text">{activeLabelCompact}</span>
              <ChevronDown size={12} style={{ opacity: 0.6 }} />
            </button>
          </div>

          {/* Mobile Right: Hamburger Toggle Button */}
          <div className="mobile-hamburger-wrap">
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              aria-label="Toggle Menu"
              aria-expanded={mobileMenuOpen}
              id="btn-mobile-menu-toggle"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>

          {/* Desktop Right Actions (Hidden on Mobile) */}
          <div className="nav-actions desktop-nav-actions">
            {/* Portfolio Switcher Dropdown */}
            <div className="portfolio-switcher" ref={dropdownRef}>
              <button 
                className="switcher-btn"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                title="Switch Demat Portfolio View"
                id="portfolio-switcher-btn"
              >
                {activePortfolioId === 'ALL' ? (
                  <Users size={16} className="text-cyan" />
                ) : (
                  <Briefcase size={16} className="text-amber" />
                )}
                <span>{activeLabel}</span>
                <ChevronDown size={14} style={{ opacity: 0.7 }} />
              </button>

              {dropdownOpen && (
                <div className="switcher-dropdown">
                  <div className="dropdown-header">Select Portfolio View</div>
                  
                  {/* Combined Option */}
                  <button
                    className={`dropdown-item ${activePortfolioId === 'ALL' ? 'active' : ''}`}
                    onClick={() => {
                      setActivePortfolioId('ALL');
                      setDropdownOpen(false);
                    }}
                    id="portfolio-option-all"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <Users size={15} />
                      <span>All Family Portfolios (Combined)</span>
                    </div>
                    {activePortfolioId === 'ALL' && <Check size={14} className="text-cyan" />}
                  </button>

                  <div className="dropdown-divider" />
                  <div className="dropdown-header">Individual Demats ({portfolios.length})</div>

                  {portfolios.map(p => (
                    <button
                      key={p.id}
                      className={`dropdown-item ${Number(activePortfolioId) === p.id ? 'active' : ''}`}
                      onClick={() => {
                        setActivePortfolioId(p.id);
                        setDropdownOpen(false);
                      }}
                      id={`portfolio-option-${p.id}`}
                    >
                      <div>
                        <div>{p.profile_name}</div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {p.broker_name} Demat
                        </div>
                      </div>
                      {Number(activePortfolioId) === p.id && <Check size={14} className="text-cyan" />}
                    </button>
                  ))}

                  <div className="dropdown-divider" />

                  <button
                    className="dropdown-item"
                    style={{ color: '#818cf8', fontWeight: 600 }}
                    onClick={() => {
                      setDropdownOpen(false);
                      setShowAddProfile(true);
                    }}
                    id="btn-add-profile-nav"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <PlusCircle size={15} />
                      <span>+ Add Family Profile</span>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {/* User profile & Logout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {isSandbox ? (
                <button
                  className="btn-secondary"
                  onClick={handleResetSandbox}
                  disabled={resetting}
                  title="Restore default sample portfolio data"
                  id="btn-reset-sandbox"
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    borderColor: 'rgba(239, 68, 68, 0.25)',
                    color: '#fca5a5',
                    padding: '0.45rem 0.75rem',
                    fontSize: '0.78rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <RotateCcw size={13} className={resetting ? 'animate-spin' : ''} />
                  <span>{resetting ? 'Resetting...' : 'Reset Sandbox'}</span>
                </button>
              ) : (
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.name || 'Investor'}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                </div>
              )}

              <button 
                className="btn-secondary" 
                onClick={logout}
                title="Sign Out"
                id="logout-button"
              >
                <LogOut size={15} />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Sandbox Conversion Strip (Rendered for demo user) */}
        {isSandbox && (
          <div className="sandbox-conversion-strip sandbox-banner sandbox-strip" id="sandbox-conversion-banner">
            <div className="sandbox-strip-left">
              <span className="sandbox-badge sandbox-badge-desktop">
                <span className="sandbox-badge-pulse" />
                <span>🧪 Sandbox Preview</span>
              </span>
              <span className="sandbox-badge sandbox-badge-mobile">
                <span className="sandbox-badge-pulse" />
                <span>🧪 Sandbox Mode</span>
              </span>
              <span className="sandbox-strip-desc"> — Viewing live sample portfolio data</span>
            </div>

            <div className="sandbox-strip-actions">
              <button
                type="button"
                className="btn-reset-subtle"
                onClick={handleResetSandbox}
                disabled={resetting}
                title="Reset sample portfolio to initial state"
                id="btn-strip-reset"
              >
                <RotateCcw size={13} className={resetting ? 'animate-spin' : ''} />
                <span className="btn-reset-text">Reset Sample</span>
                <span className="btn-reset-text-short">Reset</span>
              </button>

              <div className="sandbox-actions-divider" />

              <button
                type="button"
                className="btn-create-account-pill"
                onClick={startRegistrationFromSandbox}
                title="Create your free personal account"
                id="btn-strip-register"
              >
                <Sparkles size={14} className="sparkle-icon" />
                <span className="cta-text-full">Create Free Account →</span>
                <span className="cta-text-short">Create Account →</span>
              </button>
            </div>
          </div>
        )}

        {/* Mobile Slide-Down Drawer (< 768px) */}
        {mobileMenuOpen && (
          <>
            <div 
              className="mobile-drawer-backdrop" 
              onClick={() => setMobileMenuOpen(false)} 
            />
            <div className="mobile-drawer" id="mobile-navigation-drawer">
              {/* Drawer Header */}
              <div className="mobile-drawer-header">
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Portfolio Menu</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {isSandbox ? 'Sandbox Exploration Mode' : user?.email}
                  </div>
                </div>
                <button
                  type="button"
                  className="mobile-drawer-close"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <X size={18} />
                </button>
              </div>

              {/* Drawer Section 1: Portfolio Selector */}
              <div className="mobile-drawer-section">
                <div className="mobile-section-label">Select Active Demat</div>
                <div className="mobile-portfolio-list">
                  <button
                    className={`mobile-portfolio-item ${activePortfolioId === 'ALL' ? 'active' : ''}`}
                    onClick={() => {
                      setActivePortfolioId('ALL');
                      setMobileMenuOpen(false);
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <Users size={16} className="text-cyan" />
                      <div>
                        <div style={{ fontWeight: 600 }}>All Family Portfolios</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Combined view ({portfolios.length} accounts)</div>
                      </div>
                    </div>
                    {activePortfolioId === 'ALL' && <Check size={16} className="text-cyan" />}
                  </button>

                  {portfolios.map(p => (
                    <button
                      key={p.id}
                      className={`mobile-portfolio-item ${Number(activePortfolioId) === p.id ? 'active' : ''}`}
                      onClick={() => {
                        setActivePortfolioId(p.id);
                        setMobileMenuOpen(false);
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <Briefcase size={16} className="text-amber" />
                        <div>
                          <div style={{ fontWeight: 600 }}>{p.profile_name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{p.broker_name} Demat</div>
                        </div>
                      </div>
                      {Number(activePortfolioId) === p.id && <Check size={16} className="text-cyan" />}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="mobile-btn-add-profile"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setShowAddProfile(true);
                  }}
                  id="mobile-btn-add-profile"
                >
                  <PlusCircle size={15} />
                  <span>+ Add New Family Profile</span>
                </button>
              </div>

              {/* Drawer Section 2: Market Status & Live Sync */}
              {onSyncPrices && (
                <div className="mobile-drawer-section">
                  <div className="mobile-section-label">Market Status & Pricing</div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div className="market-status-pill" style={{ padding: '0.3rem 0.7rem', fontSize: '0.75rem' }}>
                      <span className={`status-dot ${marketStatus?.isOpen ? 'dot-live' : 'dot-closed'}`} />
                      <span style={{ fontWeight: 600 }}>{marketStatus?.badge || 'NSE/BSE'}</span>
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {marketStatus?.istTime ? `IST: ${marketStatus.istTime}` : ''}
                    </span>
                  </div>

                  <button
                    type="button"
                    className="mobile-sync-btn"
                    onClick={() => {
                      onSyncPrices();
                      setMobileMenuOpen(false);
                    }}
                    disabled={isSyncing}
                  >
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    <span>{isSyncing ? 'Syncing Market Prices...' : 'Sync Live NSE/BSE Prices'}</span>
                  </button>
                </div>
              )}

              {/* Drawer Section 3: Account Actions */}
              <div className="mobile-drawer-section mobile-account-section">
                {isSandbox ? (
                  <>
                    <button
                      type="button"
                      className="mobile-cta-register"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        startRegistrationFromSandbox();
                      }}
                      id="mobile-drawer-register-cta"
                    >
                      <Sparkles size={16} />
                      <span>🚀 Create Your Personal Account</span>
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        className="mobile-subtle-btn"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          handleResetSandbox();
                        }}
                      >
                        <RotateCcw size={13} />
                        <span>Reset Data</span>
                      </button>

                      <button
                        type="button"
                        className="mobile-subtle-btn text-loss"
                        onClick={() => {
                          setMobileMenuOpen(false);
                          logout();
                        }}
                      >
                        <LogOut size={13} />
                        <span>Exit Sandbox</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.65rem 0.85rem', borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.name || 'Investor'}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.email}</div>
                    </div>

                    <button
                      type="button"
                      className="mobile-sync-btn"
                      style={{ background: 'rgba(239, 68, 68, 0.1)', borderColor: 'rgba(239, 68, 68, 0.25)', color: '#fca5a5' }}
                      onClick={() => {
                        setMobileMenuOpen(false);
                        logout();
                      }}
                    >
                      <LogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </header>

      {showAddProfile && (
        <AddProfileModal onClose={() => setShowAddProfile(false)} />
      )}
    </>
  );
}
