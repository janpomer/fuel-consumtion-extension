import { byId, flash, renderPreview } from '../lib/form.js';
import { DEFAULT_SETTINGS, loadSettings, sanitiseSettings, saveSettings } from '../lib/settings.js';
import type { Settings } from '../lib/types.js';

const fields = {
  consumption: byId<HTMLInputElement>('consumption'),
  consumptionUnit: byId<HTMLSelectElement>('consumptionUnit'),
  price: byId<HTMLInputElement>('price'),
  priceUnit: byId<HTMLSelectElement>('priceUnit'),
  currency: byId<HTMLInputElement>('currency'),
  showCost: byId<HTMLInputElement>('showCost'),
  enabled: byId<HTMLInputElement>('enabled'),
  showOnMap: byId<HTMLInputElement>('showOnMap'),
  showRefuelStops: byId<HTMLInputElement>('showRefuelStops'),
  tankLitres: byId<HTMLInputElement>('tankLitres'),
  reserveKm: byId<HTMLInputElement>('reserveKm'),
};
const form = byId<HTMLFormElement>('form');
const preview = byId<HTMLElement>('preview');
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
    () => flash(status, confirmation),
    () => flash(status, 'Could not save settings'),
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
  fields.showOnMap.checked = settings.showOnMap;
  fields.showRefuelStops.checked = settings.showRefuelStops;
  fields.tankLitres.value = String(settings.tankLitres);
  fields.reserveKm.value = String(settings.reserveKm);
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
    showOnMap: fields.showOnMap.checked,
    showRefuelStops: fields.showRefuelStops.checked,
    tankLitres: Number(fields.tankLitres.value),
    reserveKm: Number(fields.reserveKm.value),
  });
}

function updatePreview(): void {
  // An empty or out-of-range field would otherwise preview the default value.
  renderPreview(preview, form.checkValidity() ? read() : null);
}
