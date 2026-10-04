const BASE_URL = import.meta.env.VITE_API_URL || '/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('equity_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const config = {
    ...options,
    headers
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem('equity_token');
    window.dispatchEvent(new Event('auth-unauthorized'));
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Session expired. Please log in again.');
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `HTTP error! Status: ${response.status}`);
  }

  return data;
}

export const api = {
  // Auth
  login: (credentials) => apiRequest('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (userData) => apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
  getMe: () => apiRequest('/auth/me'),
  addPortfolio: (profile) => apiRequest('/auth/portfolios', { method: 'POST', body: JSON.stringify(profile) }),
  resetSandbox: () => apiRequest('/auth/sandbox-reset', { method: 'POST' }),

  // Portfolio Summary
  getSummary: (portfolioId) => apiRequest(`/portfolio/summary?portfolioId=${portfolioId || 'ALL'}`),

  // Equities
  getEquities: (portfolioId) => apiRequest(`/equities?portfolioId=${portfolioId || 'ALL'}`),
  syncPrices: (payload = {}, portfolioId) => apiRequest(`/equities/sync-prices?portfolioId=${portfolioId || 'ALL'}`, { method: 'POST', body: JSON.stringify(payload) }),
  addEquity: (holding) => apiRequest('/equities', { method: 'POST', body: JSON.stringify(holding) }),
  updateCorporateAction: (id, payload) => apiRequest(`/equities/${id}/corporate-action`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteEquity: (id) => apiRequest(`/equities/${id}`, { method: 'DELETE' }),

  // IPOs
  getIpos: (portfolioId) => apiRequest(`/ipos?portfolioId=${portfolioId || 'ALL'}`),
  addIpo: (ipo) => apiRequest('/ipos', { method: 'POST', body: JSON.stringify(ipo) }),
  updateIpo: (id, payload) => apiRequest(`/ipos/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteIpo: (id) => apiRequest(`/ipos/${id}`, { method: 'DELETE' }),

  // Mutual Funds & Overlap
  getMutualFunds: (portfolioId) => apiRequest(`/mf?portfolioId=${portfolioId || 'ALL'}`),
  addMutualFund: (fund) => apiRequest('/mf', { method: 'POST', body: JSON.stringify(fund) }),
  deleteMutualFund: (id) => apiRequest(`/mf/${id}`, { method: 'DELETE' }),
  getOverlap: (portfolioId) => apiRequest(`/overlap?portfolioId=${portfolioId || 'ALL'}`),

  // Cash, Chitti & Traditional Schemes Vault
  getCash: (portfolioId) => apiRequest(`/cash?portfolioId=${portfolioId || 'ALL'}`),
  addCash: (scheme) => apiRequest('/cash', { method: 'POST', body: JSON.stringify(scheme) }),
  updateCash: (id, payload) => apiRequest(`/cash/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  deleteCash: (id) => apiRequest(`/cash/${id}`, { method: 'DELETE' }),

  // Portfolio Power-Up & Benchmark Alpha Analyzer
  getPowerUp: (portfolioId) => apiRequest(`/portfolio/power-up?portfolioId=${portfolioId || 'ALL'}`)
};
