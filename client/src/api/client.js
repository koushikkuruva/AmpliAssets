const BASE_URL = import.meta.env.VITE_API_URL || '/api';
const REQUEST_TIMEOUT_MS = 12000; // 12-second client timeout to prevent infinite UI hang

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('equity_token');
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  const config = {
    ...options,
    headers,
    signal: options.signal || controller.signal
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, config);
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Connection timed out after 12 seconds. Please check your network or server connection.');
    }
    throw new Error(err.message || 'Network request failed. Please verify the server is running.');
  } finally {
    clearTimeout(timeoutId);
  }

  // Safely parse text response to gracefully handle HTML error pages (e.g. 502/504 from proxies or Vercel)
  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }

  if (response.status === 401) {
    localStorage.removeItem('equity_token');
    window.dispatchEvent(new Event('auth-unauthorized'));
    const message = data?.error || 'Session expired or invalid credentials. Please log in again.';
    throw new Error(message);
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || data?.details || (
      text && text.length < 200 && !text.includes('<!DOCTYPE') 
        ? text 
        : `Server responded with status ${response.status}. Please try again.`
    );
    throw new Error(errorMsg);
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
