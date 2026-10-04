import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  Users, 
  ChevronDown, 
  PlusCircle, 
  LogOut, 
  TrendingUp, 
  Check, 
  Layers, 
  Briefcase,
  RotateCcw
} from 'lucide-react';
import AddProfileModal from './AddProfileModal';

export default function Navbar() {
  const { user, portfolios, activePortfolioId, setActivePortfolioId, logout, resetSandbox } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showAddProfile, setShowAddProfile] = useState(false);
  const [resetting, setResetting] = useState(false);
  const dropdownRef = useRef(null);

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

  return (
    <>
      <nav className="navbar">
        <div className="nav-brand">
          <div className="brand-icon-box">
            <TrendingUp size={22} strokeWidth={2.5} />
          </div>
          <div>
            <div>Indian Equity & IPO Analyzer</div>
            <div style={{ fontSize: '0.68rem', fontWeight: 500, color: 'var(--text-muted)', letterSpacing: '0.04em' }}>
              FAMILY DEMAT & MANDATE CONSOLE
            </div>
          </div>
        </div>

        <div className="nav-actions">
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
            {/* Reset Sandbox Button (Only for demo user) */}
            {user?.email === 'demo@investor.in' && (
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
            )}

            <div style={{ textAlign: 'right', display: 'none', md: 'block' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.name || 'Investor'}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.email}</div>
            </div>

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

      {showAddProfile && (
        <AddProfileModal onClose={() => setShowAddProfile(false)} />
      )}
    </>
  );
}
