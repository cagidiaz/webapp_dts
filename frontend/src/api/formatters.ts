/**
 * Shared formatting utilities for dTS Instruments
 */

/**
 * Formats a number with 2 decimal places and German locale (dot for thousands, comma for decimals)
 */
export const formatNumber = (val: number | undefined | null, decimals: number = 2): string => {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return '---';
  return val.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

/**
 * Formats a percentage (0.152 -> 15,20%)
 */
export const formatPercent = (val: number | undefined | null, decimals: number = 2): string => {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return '---%';
  return formatNumber(val * 100, decimals) + '%';
};

/**
 * Formats currency (1234.5 -> 1.234,50 €)
 */
export const formatCurrency = (val: number | undefined | null, decimals: number = 2): string => {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return '--- €';
  return formatNumber(val, decimals) + ' €';
};

/**
 * Formats values into a simple decimal string (12.3 -> "12.30")
 */
export const formatDecimal = (val: number | undefined | null, decimals: number = 2): string => {
  if (val === undefined || val === null || isNaN(val) || !isFinite(val)) return '---';
  return val.toFixed(decimals);
};
