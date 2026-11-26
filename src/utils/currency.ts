/**
 * Multi-Currency & Indian Currency Formatting Utilities
 * Handles Indian numbering system (lakhs, crores), multi-currency symbols, and exchange rate conversions
 */

export const CURRENCY_SYMBOLS: Record<string, string> = {
  'INR': '₹',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'CAD': 'C$',
  'AUD': 'A$',
  'JPY': '¥',
};

// Fallback rates against USD
export const DEFAULT_USD_RATES: Record<string, number> = {
  'USD': 1.0,
  'INR': 83.35,
  'EUR': 0.92,
  'GBP': 0.79,
  'CAD': 1.36,
  'AUD': 1.52,
  'JPY': 155.20,
};

export const getCurrencySymbol = (currency: string = 'INR'): string => {
  return CURRENCY_SYMBOLS[currency] || '₹';
};

export const formatIndianCurrency = (amount: number): string => {
  if (amount === 0) return '₹0.00';
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return formatter.format(amount);
};

export const formatCurrencyWithSymbol = (amount: number, currency: string = 'INR'): string => {
  if (currency === 'INR') {
    return formatIndianCurrency(amount);
  }
  
  try {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return formatter.format(amount);
  } catch {
    const symbol = getCurrencySymbol(currency);
    return `${symbol}${amount.toFixed(2)}`;
  }
};

export const convertCurrency = (
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  customRates?: Record<string, number>
): number => {
  if (fromCurrency === toCurrency) return amount;
  
  const rates = customRates || DEFAULT_USD_RATES;
  const fromRate = rates[fromCurrency] || 1.0;
  const toRate = rates[toCurrency] || 1.0;
  
  // Convert fromCurrency -> USD -> toCurrency
  const inUSD = amount / fromRate;
  return Number((inUSD * toRate).toFixed(2));
};

export const parseIndianCurrency = (value: string): number => {
  const cleanValue = value.replace(/[^\d.]/g, '');
  return parseFloat(cleanValue) || 0;
};
