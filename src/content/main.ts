import { estimate, refuelLegMeters } from '../lib/fuel.js';
import { formatEstimate } from '../lib/format.js';
import { DEFAULT_SETTINGS, loadSettings, onSettingsChanged } from '../lib/settings.js';
import type { ConsumptionUnit, Settings } from '../lib/types.js';
import { findMap, placeRefuelStops, placeRoutes, watchRoutes } from './map-routes.js';
import { findRouteCards, isDirectionsView, isDrivingMode, selectedRouteIndex } from './maps-dom.js';
import { ensureStyles, removeAllEstimates, renderEstimate, renderMapLabels } from './panel.js';

const REFRESH_DELAY_MS = 250;
const URL_POLL_MS = 250;

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
  // ponytail: turning the map option on shows labels from the next route change, not the current one.
  watchRoutes(refresh, () => settings.enabled && (settings.showOnMap || settings.showRefuelStops));
  refresh();
}

/**
 * Google Maps re-renders constantly, so we react to DOM changes, debounced.
 * It also rewrites the URL (and so the map viewport) with `replaceState`,
 * which fires no event, hence the poll.
 */
function observeMaps(): void {
  const observer = new MutationObserver(scheduleRefresh);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  let lastHref = location.href;
  setInterval(() => {
    if (location.href === lastHref) return;
    lastHref = location.href;
    refresh();
  }, URL_POLL_MS);
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

  const cards = findRouteCards();
  for (const card of cards) {
    const result = estimate(card.distanceMeters, settings);
    if (!result) continue;

    renderEstimate(
      card.element,
      formatEstimate(result, settings.currency, navigator.language),
      tooltip(result.distanceMeters),
    );
  }

  const map = findMap();
  if (!map) return;
  const selected = selectedRouteIndex();
  const leg = settings.showRefuelStops ? refuelLegMeters(settings) : null;
  const stops = leg ? placeRefuelStops(map, selected, leg) : [];
  renderMapLabels(
    map,
    (settings.showOnMap ? placeRoutes(map, stops) : []).flatMap(({ index, title, distanceMeters, x, y }) => {
      // Our re-requested directions reflect traffic a moment later than what
      // Maps shows, so prefer the card's distance to keep both figures equal.
      const card = cards.find((c) => c.index === index);
      const result = estimate(card?.distanceMeters ?? distanceMeters, settings);
      if (!result) return [];
      const text = formatEstimate(result, settings.currency, navigator.language);
      return [{ x, y, title, text, selected: index === selected }];
    }),
    stops,
  );
}

function tooltip(distanceMeters: number): string {
  const km = (distanceMeters / 1000).toFixed(1);
  return `Estimated fuel for ${km} km at ${settings.consumption} ${UNIT_LABELS[settings.consumptionUnit]} (average, ignores traffic and elevation)`;
}
