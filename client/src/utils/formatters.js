/**
 * Indian Rupee & Financial Data Formatters adhering to en-IN standards
 */

export function formatINR(val, showDecimals = true) {
  if (val === null || val === undefined || isNaN(val)) {
    return '₹ 0.00';
  }
  const num = Number(val);
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0
  }).format(num);
}

export function formatCompactINR(val) {
  if (val === null || val === undefined || isNaN(val)) {
    return '₹ 0';
  }
  const num = Math.abs(Number(val));
  const sign = Number(val) < 0 ? '-' : '';

  if (num >= 10000000) { // 1 Crore = 100 Lakhs = 10,000,000
    return `${sign}₹ ${(num / 10000000).toFixed(2)} Cr`;
  } else if (num >= 100000) { // 1 Lakh = 100,000
    return `${sign}₹ ${(num / 100000).toFixed(2)} L`;
  } else if (num >= 1000) {
    return `${sign}₹ ${(num / 1000).toFixed(1)} K`;
  }
  return `${sign}₹ ${num.toFixed(2)}`;
}

export function formatPct(val) {
  if (val === null || val === undefined || isNaN(val)) {
    return '0.00%';
  }
  const num = Number(val);
  const prefix = num > 0 ? '+' : '';
  return `${prefix}${num.toFixed(2)}%`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(d);
  } catch (e) {
    return dateStr;
  }
}

export function formatTimeAgo(isoString) {
  if (!isoString) return 'Never';
  try {
    const past = new Date(isoString).getTime();
    const now = Date.now();
    const diffSecs = Math.floor((now - past) / 1000);

    if (diffSecs < 10) return 'Just now';
    if (diffSecs < 60) return `${diffSecs}s ago`;
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hr${diffHours > 1 ? 's' : ''} ago`;
    return formatDate(isoString);
  } catch (e) {
    return 'Recently';
  }
}
