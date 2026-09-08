import { estimate } from '../lib/fuel.js';
import { formatEstimate } from '../lib/format.js';
import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged } from '../lib/settings.js';
import type { ConsumptionUnit, Settings } from '../lib/types.js';
import { findRouteCards, isDirectionsView, isDrivingMode } from './maps-dom.js';
import { ensureStyles, removeAllEstimates, renderEstimate } from './panel.js';

const REFRESH_DELAY_MS = 250;

const UNIT_LABELS: Record<ConsumptionUnit, string> = {
  l_per_100km: 'l/100 km',
  km_per_l: 'km/l',
  mpg_us: 'mpg (US)',
  mpg_uk: 'mpg (UK)',
};

let settings: Settings = DEFAULT_SETTINGS;
let refreshTimer: number | undefined;

/** Entry point, called once by the content script bootstrap. */
export async function init(): Promise<void> {
  settings = await loadSettings();
  ensureStyles();

  onSettingsChanged((next) => {
    settings = next;
    refresh();
  });

  observeMaps();
  refresh();
}

/** Google Maps re-renders constantly, so we react to DOM changes, debounced. */
function observeMaps(): void {
  const observer = new MutationObserver(scheduleRefresh);

  observer.observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('popstate', scheduleRefresh);
  addEventListener('hashchange', scheduleRefresh);
}

function scheduleRefresh(): void {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(refresh, REFRESH_DELAY_MS);
}

function refresh(): void {
  if (!settings.enabled || !isDirectionsView() || !isDrivingMode()) {
    removeAllEstimates();
    return;
  }

  ensureStyles();

  for (const card of findRouteCards()) {
    const result = estimate(card.distanceMeters, settings);
    if (!result) continue;

    renderEstimate(
      card.element,
      formatEstimate(result, settings.currency, navigator.language),
      tooltip(result.distanceMeters),
    );
  }
}

function tooltip(distanceMeters: number): string {
  const km = (distanceMeters / 1000).toFixed(1);
  return `Estimated fuel for ${km} km at ${settings.consumption} ${UNIT_LABELS[settings.consumptionUnit]} (average, ignores traffic and elevation)`;
}
