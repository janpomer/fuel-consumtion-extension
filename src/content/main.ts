import { estimate } from '../lib/fuel.js';
import { formatEstimate } from '../lib/format.js';
import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged } from '../lib/settings.js';
import type { Settings } from '../lib/types.js';
import { findRouteCards, isDirectionsView, isDrivingMode } from './maps-dom.js';
import { ensureStyles, removeAllEstimates, renderEstimate } from './panel.js';

const REFRESH_DELAY_MS = 250;

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
  const observer = new MutationObserver((records) => {
    if (records.every(isSelfInflicted)) return;
    scheduleRefresh();
  });

  observer.observe(document.documentElement, { childList: true, subtree: true });
  addEventListener('popstate', scheduleRefresh);
  addEventListener('hashchange', scheduleRefresh);
}

/** Ignore the mutations our own panel causes, to avoid a feedback loop. */
function isSelfInflicted(record: MutationRecord): boolean {
  const target = record.target instanceof Element ? record.target : record.target.parentElement;
  if (target?.closest('.fce-estimate')) return true;

  const nodes = [...record.addedNodes, ...record.removedNodes];
  return (
    nodes.length > 0 &&
    nodes.every((node) => node instanceof Element && node.classList.contains('fce-estimate'))
  );
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
  return `Estimated fuel for ${km} km at ${settings.consumption} ${unitLabel(settings)} (average, ignores traffic and elevation)`;
}

function unitLabel(current: Settings): string {
  switch (current.consumptionUnit) {
    case 'l_per_100km':
      return 'l/100 km';
    case 'km_per_l':
      return 'km/l';
    case 'mpg_us':
      return 'mpg (US)';
    case 'mpg_uk':
      return 'mpg (UK)';
  }
}
