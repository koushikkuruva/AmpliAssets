import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, 
  Sparkles, 
  LogIn, 
  UserPlus, 
  ShieldCheck, 
  PieChart, 
  Layers, 
  ArrowRight 
} from 'lucide-react';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [tab, setTab] = useState('login'); // 'login' or 'register'
  
  // Login fields
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regBroker, setRegBroker] = useState('Zerodha');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(loginEmail, loginPassword);
    } catch (err) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(regName, regEmail, regPassword, regBroker);
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOneClickDemo = async () => {
    setError('');
    setLoading(true);
    try {
      await login('demo@investor.in', 'password123');
    } catch (err) {
      setError(err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-icon-wrap">
            <TrendingUp size={28} strokeWidth={2.5} />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '-0.02em', marginBottom: '0.4rem' }}>
            Indian Equity & IPO Analyzer
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            Consolidated family demat tracking, corporate action adjuster & IPO mandates
          </p>
        </div>

        {/* Tabs for Login / Register */}
        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab-btn ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
            id="tab-login"
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`auth-tab-btn ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
            id="tab-register"
          >
            Create Account
          </button>
        </div>

        {error && (
          <div style={{ marginBottom: '1rem', padding: '0.75rem', background: 'var(--red-loss-bg)', border: '1px solid var(--red-loss-border)', borderRadius: 'var(--radius-sm)', color: 'var(--red-loss)', fontSize: '0.85rem' }}>
            {error}
          </div>
        )}

        {tab === 'login' ? (
          <form onSubmit={handleLoginSubmit} id="form-login">
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="investor@example.in"
                value={loginEmail}
                onChange={e => setLoginEmail(e.target.value)}
                required
                id="input-login-email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="••••••••"
                value={loginPassword}
                onChange={e => setLoginPassword(e.target.value)}
                required
                id="input-login-password"
              />
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={loading}
              id="btn-submit-login"
            >
              <LogIn size={16} />
              <span>{loading ? 'Authenticating...' : 'Sign In to Portfolio'}</span>
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} id="form-register">
            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label className="form-label">Full Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Ramesh Patel"
                value={regName}
                onChange={e => setRegName(e.target.value)}
                required
                id="input-register-name"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label className="form-label">Email Address</label>
              <input 
                type="email" 
                className="form-input" 
                placeholder="ramesh@investor.in"
                value={regEmail}
                onChange={e => setRegEmail(e.target.value)}
                required
                id="input-register-email"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '0.9rem' }}>
              <label className="form-label">Password</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder="At least 6 characters"
                value={regPassword}
                onChange={e => setRegPassword(e.target.value)}
                required
                id="input-register-password"
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.4rem' }}>
              <label className="form-label">Primary Demat Broker</label>
              <select 
                className="form-select"
                value={regBroker}
                onChange={e => setRegBroker(e.target.value)}
                id="select-register-broker"
              >
                <option value="Zerodha">Zerodha</option>
                <option value="Groww">Groww</option>
                <option value="AngelOne">AngelOne</option>
                <option value="Upstox">Upstox</option>
                <option value="ICICI Direct">ICICI Direct</option>
                <option value="HDFC Sky">HDFC Sky</option>
              </select>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              style={{ width: '100%', padding: '0.75rem' }}
              disabled={loading}
              id="btn-submit-register"
            >
              <UserPlus size={16} />
              <span>{loading ? 'Creating Portfolio...' : 'Create Free Account'}</span>
            </button>
          </form>
        )}

        {/* Polished Interactive Sandbox CTA */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
          <button 
            type="button" 
            className="btn-sandbox-cta"
            onClick={handleOneClickDemo}
            disabled={loading}
            id="btn-sandbox-login"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.8rem 1rem',
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(6, 182, 212, 0.12) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.35)',
              borderRadius: 'var(--radius-md)',
              color: '#c7d2fe',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)'
            }}
          >
            <Sparkles size={16} className="text-cyan" />
            <span>Explore Interactive Sandbox (Sample Portfolio) →</span>
          </button>
          <p style={{ fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '0.6rem', lineHeight: 1.45 }}>
            Test live NSE prices, IPO mandates, Chitti vault, and Alpha audit with pre-loaded sample data.
          </p>
        </div>

        <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <ShieldCheck size={14} className="text-gain" />
            <span>Isolated Family Data</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <PieChart size={14} className="text-cyan" />
            <span>MF Overlap Engine</span>
          </div>
        </div>
      </div>
    </div>
  );
}
