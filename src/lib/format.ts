import type { Estimate } from './types.js';

/** Formats a volume in litres with a sensible number of decimals. */
export function formatLitres(litres: number, locale?: string): string {
  const digits = litres < 10 ? 2 : litres < 100 ? 1 : 0;
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(litres);
}

/** Formats a money amount; `currency` is a free-form label, not an ISO code. */
export function formatCost(cost: number, currency: string, locale?: string): string {
  const digits = cost < 100 ? 2 : 0;
  const amount = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(cost);
  const label = currency.trim();
  return label ? `${amount}\u00a0${label}` : amount;
}

/** The one-line summary shown inside the Google Maps route card. */
export function formatEstimate(est: Estimate, currency: string, locale?: string): string {
  const parts = [`${formatLitres(est.litres, locale)} l`];
  if (est.cost !== null) parts.push(formatCost(est.cost, currency, locale));
  return parts.join(' · ');
}
