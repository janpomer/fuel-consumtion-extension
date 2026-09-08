import type { Estimate } from './types.js';

function fixed(value: number, digits: number, locale?: string): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * The one-line summary shown inside the Google Maps route card. `currency` is a
 * free-form label, not an ISO code.
 */
export function formatEstimate(est: Estimate, currency: string, locale?: string): string {
  const litres = `${fixed(est.litres, est.litres < 10 ? 2 : est.litres < 100 ? 1 : 0, locale)} l`;
  if (est.cost === null) return litres;

  const amount = fixed(est.cost, est.cost < 100 ? 2 : 0, locale);
  const label = currency.trim();
  return `${litres} · ${label ? `${amount} ${label}` : amount}`;
}
