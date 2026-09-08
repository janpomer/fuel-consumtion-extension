// Shared bits of the two settings UIs (popup and options page).
import { estimate } from './fuel.js';
import { formatEstimate } from './format.js';
import type { Settings } from './types.js';

const PREVIEW_DISTANCE_M = 100_000;
const FLASH_MS = 2000;

export function byId<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
}

/** Shows what a round 100 km would cost, as a sanity check on the inputs. */
export function renderPreview(target: HTMLElement, settings: Settings | null): void {
  const result = settings ? estimate(PREVIEW_DISTANCE_M, settings) : null;
  target.textContent =
    result && settings ? formatEstimate(result, settings.currency, navigator.language) : '—';
}

/** Shows a transient status message, unless a newer one has replaced it. */
export function flash(target: HTMLElement, message: string): void {
  target.textContent = message;
  setTimeout(() => {
    if (target.textContent === message) target.textContent = '';
  }, FLASH_MS);
}
