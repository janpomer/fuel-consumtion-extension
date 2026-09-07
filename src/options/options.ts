import { estimate } from '../lib/fuel.js';
import { formatEstimate } from '../lib/format.js';
import { DEFAULT_SETTINGS, loadSettings, sanitiseSettings, saveSettings } from '../lib/settings.js';
import type { Settings } from '../lib/types.js';

const PREVIEW_DISTANCE_M = 100_000;

const fields = {
  consumption: byId<HTMLInputElement>('consumption'),
  consumptionUnit: byId<HTMLSelectElement>('consumptionUnit'),
  price: byId<HTMLInputElement>('price'),
  priceUnit: byId<HTMLSelectElement>('priceUnit'),
  currency: byId<HTMLInputElement>('currency'),
  showCost: byId<HTMLInputElement>('showCost'),
  enabled: byId<HTMLInputElement>('enabled'),
};
const form = byId<HTMLFormElement>('form');
const preview = byId<HTMLParagraphElement>('preview');
const status = byId<HTMLSpanElement>('status');

void main();

async function main(): Promise<void> {
  fill(await loadSettings());
  updatePreview();

  for (const field of Object.values(fields)) {
    field.addEventListener('input', updatePreview);
    field.addEventListener('change', updatePreview);
  }

  // Native validation (required / min) blocks submit while the form is invalid.
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    save(read(), 'Settings saved');
  });

  byId<HTMLButtonElement>('reset').addEventListener('click', () => {
    fill(DEFAULT_SETTINGS);
    updatePreview();
    save(DEFAULT_SETTINGS, 'Defaults restored');
  });
}

function save(settings: Settings, confirmation: string): void {
  saveSettings(settings).then(
    () => flash(confirmation),
    () => flash('Could not save settings'),
  );
}

function fill(settings: Settings): void {
  fields.consumption.value = String(settings.consumption);
  fields.consumptionUnit.value = settings.consumptionUnit;
  fields.price.value = String(settings.price);
  fields.priceUnit.value = settings.priceUnit;
  fields.currency.value = settings.currency;
  fields.showCost.checked = settings.showCost;
  fields.enabled.checked = settings.enabled;
}

function read(): Settings {
  return sanitiseSettings({
    consumption: Number(fields.consumption.value),
    consumptionUnit: fields.consumptionUnit.value as Settings['consumptionUnit'],
    price: Number(fields.price.value),
    priceUnit: fields.priceUnit.value as Settings['priceUnit'],
    currency: fields.currency.value,
    showCost: fields.showCost.checked,
    enabled: fields.enabled.checked,
  });
}

function updatePreview(): void {
  // An empty or out-of-range field would otherwise preview the default value.
  const settings = form.checkValidity() ? read() : null;
  const result = settings ? estimate(PREVIEW_DISTANCE_M, settings) : null;

  preview.textContent = '';
  const label = document.createElement('span');
  label.textContent = 'A 100 km drive ≈ ';
  const value = document.createElement('strong');
  value.textContent =
    result && settings ? formatEstimate(result, settings.currency, navigator.language) : '—';

  preview.append(label, value);
}

function flash(message: string): void {
  status.textContent = message;
  setTimeout(() => {
    if (status.textContent === message) status.textContent = '';
  }, 2000);
}

function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}
