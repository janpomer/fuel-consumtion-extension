import { CONSUMPTION_UNITS, PRICE_UNITS, type Settings } from './types.js';

export const DEFAULT_SETTINGS: Settings = {
  consumption: 7,
  consumptionUnit: 'l_per_100km',
  price: 1.75,
  priceUnit: 'per_litre',
  currency: '€',
  showCost: true,
  enabled: true,
  showOnMap: true,
};

/** Reads settings, falling back to defaults for anything missing or invalid. */
export async function loadSettings(): Promise<Settings> {
  const stored = (await chrome.storage.sync.get(DEFAULT_SETTINGS)) as Partial<Settings>;
  return sanitiseSettings(stored);
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await chrome.storage.sync.set(patch);
}

/** Runs `listener` whenever any setting changes, in any tab or page. */
export function onSettingsChanged(listener: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((_, areaName) => {
    if (areaName !== 'sync') return;
    void loadSettings().then(listener);
  });
}

export function sanitiseSettings(input: Partial<Settings>): Settings {
  return {
    consumption: positiveNumber(input.consumption, DEFAULT_SETTINGS.consumption),
    consumptionUnit: oneOf(input.consumptionUnit, CONSUMPTION_UNITS, DEFAULT_SETTINGS.consumptionUnit),
    price: nonNegativeNumber(input.price, DEFAULT_SETTINGS.price),
    priceUnit: oneOf(input.priceUnit, PRICE_UNITS, DEFAULT_SETTINGS.priceUnit),
    currency: typeof input.currency === 'string' ? input.currency.slice(0, 8) : DEFAULT_SETTINGS.currency,
    showCost: typeof input.showCost === 'boolean' ? input.showCost : DEFAULT_SETTINGS.showCost,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : DEFAULT_SETTINGS.enabled,
    showOnMap: typeof input.showOnMap === 'boolean' ? input.showOnMap : DEFAULT_SETTINGS.showOnMap,
  };
}

function positiveNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function nonNegativeNumber(value: unknown, fallback: number): number {
  const n = typeof value === 'string' ? Number(value.replace(',', '.')) : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
