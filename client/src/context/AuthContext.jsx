import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [portfolios, setPortfolios] = useState([]);
  const [activePortfolioId, setActivePortfolioId] = useState('ALL');
  const [loading, setLoading] = useState(true);

  // Initialize auth on load
  useEffect(() => {
    const token = localStorage.getItem('equity_token');
    if (!token) {
      setLoading(false);
      return;
    }

    api.getMe()
      .then(data => {
        setUser(data.user);
        setPortfolios(data.portfolios || []);
      })
      .catch(err => {
        console.error('Failed to restore session:', err);
        localStorage.removeItem('equity_token');
        setUser(null);
        setPortfolios([]);
      })
      .finally(() => {
        setLoading(false);
      });

    const handleUnauthorized = () => {
      setUser(null);
      setPortfolios([]);
    };
    window.addEventListener('auth-unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth-unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    localStorage.setItem('equity_token', data.token);
    setUser(data.user);
    setPortfolios(data.portfolios || []);
    setActivePortfolioId('ALL');
    return data;
  };

  const register = async (name, email, password, defaultBroker = 'Zerodha') => {
    const data = await api.register({ name, email, password, defaultBroker });
    localStorage.setItem('equity_token', data.token);
    setUser(data.user);
    setPortfolios(data.portfolios || []);
    setActivePortfolioId('ALL');
    return data;
  };

  const logout = () => {
    localStorage.removeItem('equity_token');
    setUser(null);
    setPortfolios([]);
    setActivePortfolioId('ALL');
  };

  const addProfile = async (profile_name, broker_name) => {
    const data = await api.addPortfolio({ profile_name, broker_name });
    setPortfolios(prev => [...prev, data.portfolio]);
    return data.portfolio;
  };

  const refreshUser = async () => {
    try {
      const data = await api.getMe();
      setUser(data.user);
      setPortfolios(data.portfolios || []);
    } catch (e) {
      console.error('Error refreshing user:', e);
    }
  };

  const resetSandbox = async () => {
    const data = await api.resetSandbox();
    localStorage.setItem('equity_token', data.token);
    setUser(data.user);
    setPortfolios(data.portfolios || []);
    setActivePortfolioId('ALL');
    return data;
  };

  return (
    <AuthContext.Provider value={{
      user,
      portfolios,
      activePortfolioId,
      setActivePortfolioId,
      loading,
      login,
      register,
      logout,
      addProfile,
      refreshUser,
      resetSandbox
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
