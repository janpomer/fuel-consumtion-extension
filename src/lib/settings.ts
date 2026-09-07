import type { Settings } from './types.js';

export const DEFAULT_SETTINGS: Settings = {
  consumption: 7,
  consumptionUnit: 'l_per_100km',
  price: 1.75,
  priceUnit: 'per_litre',
  currency: '€',
  showCost: true,
  enabled: true,
};

/** Resolved lazily so the pure helpers below can be imported outside Chrome. */
function area(): chrome.storage.SyncStorageArea {
  return chrome.storage.sync;
}

/** Reads settings, falling back to defaults for anything missing or invalid. */
export async function loadSettings(): Promise<Settings> {
  const stored = (await area().get(DEFAULT_SETTINGS)) as Partial<Settings>;
  return sanitiseSettings(stored);
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  await area().set(patch);
}

/** Runs `listener` whenever any setting changes, in any tab or page. */
export function onSettingsChanged(listener: (settings: Settings) => void): void {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;
    if (!Object.keys(changes).some((key) => key in DEFAULT_SETTINGS)) return;
    void loadSettings().then(listener);
  });
}

export function sanitiseSettings(input: Partial<Settings>): Settings {
  return {
    consumption: positiveNumber(input.consumption, DEFAULT_SETTINGS.consumption),
    consumptionUnit: oneOf(
      input.consumptionUnit,
      ['l_per_100km', 'km_per_l', 'mpg_us', 'mpg_uk'],
      DEFAULT_SETTINGS.consumptionUnit,
    ),
    price: nonNegativeNumber(input.price, DEFAULT_SETTINGS.price),
    priceUnit: oneOf(
      input.priceUnit,
      ['per_litre', 'per_gallon_us', 'per_gallon_uk'],
      DEFAULT_SETTINGS.priceUnit,
    ),
    currency: typeof input.currency === 'string' ? input.currency.slice(0, 8) : DEFAULT_SETTINGS.currency,
    showCost: typeof input.showCost === 'boolean' ? input.showCost : DEFAULT_SETTINGS.showCost,
    enabled: typeof input.enabled === 'boolean' ? input.enabled : DEFAULT_SETTINGS.enabled,
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
