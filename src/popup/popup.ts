import { byId, flash, renderPreview } from '../lib/form.js';
import { loadSettings, sanitiseSettings, saveSettings } from '../lib/settings.js';
import type { Settings } from '../lib/types.js';

const SAVE_DEBOUNCE_MS = 300;

const form = byId<HTMLFormElement>('form');
const fields = {
  enabled: byId<HTMLInputElement>('enabled'),
  consumption: byId<HTMLInputElement>('consumption'),
  consumptionUnit: byId<HTMLSelectElement>('consumptionUnit'),
  price: byId<HTMLInputElement>('price'),
  priceUnit: byId<HTMLSelectElement>('priceUnit'),
  currency: byId<HTMLInputElement>('currency'),
};
const preview = byId<HTMLElement>('preview');
const status = byId<HTMLSpanElement>('status');

/**
 * Last known full settings. The popup only edits a subset, so anything it does
 * not show (e.g. `showCost`) must be carried over rather than reset.
 */
let current: Settings;
let saveTimer: number | undefined;

void main();

async function main(): Promise<void> {
  current = await loadSettings();
  fill(current);
  renderPreview(preview, current);

  // The popup has no submit button; make sure Enter never reloads it.
  form.addEventListener('submit', (event) => event.preventDefault());

  for (const field of Object.values(fields)) {
    field.addEventListener('input', onInput);
    field.addEventListener('change', onInput);
  }

  byId<HTMLButtonElement>('openOptions').addEventListener('click', () => {
    void chrome.runtime.openOptionsPage();
  });
}

function onInput(): void {
  clearTimeout(saveTimer);

  // While a field is empty or out of range, show nothing and save nothing,
  // otherwise a half-typed value would be replaced by the default in storage.
  if (!form.checkValidity()) {
    renderPreview(preview, null);
    return;
  }

  current = read();
  renderPreview(preview, current);

  const pending = current;
  saveTimer = setTimeout(() => {
    saveSettings(pending).then(
      () => flash(status, 'Saved'),
      () => flash(status, 'Could not save'),
    );
  }, SAVE_DEBOUNCE_MS);
}

function fill(settings: Settings): void {
  fields.enabled.checked = settings.enabled;
  fields.consumption.value = String(settings.consumption);
  fields.consumptionUnit.value = settings.consumptionUnit;
  fields.price.value = String(settings.price);
  fields.priceUnit.value = settings.priceUnit;
  fields.currency.value = settings.currency;
}

function read(): Settings {
  return sanitiseSettings({
    ...current,
    enabled: fields.enabled.checked,
    consumption: Number(fields.consumption.value),
    consumptionUnit: fields.consumptionUnit.value as Settings['consumptionUnit'],
    price: Number(fields.price.value),
    priceUnit: fields.priceUnit.value as Settings['priceUnit'],
    currency: fields.currency.value,
  });
}
