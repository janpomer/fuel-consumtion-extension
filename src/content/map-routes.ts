import {
  labelPoint,
  parseDirections,
  parseViewport,
  pointsEvery,
  project,
  thin,
  type Point,
  type Route,
} from '../lib/route-geo.js';

export interface PlacedRoute {
  /** Position of the route in Maps' list, as used by the `!5i<n>` URL marker. */
  index: number;
  title: string;
  distanceMeters: number;
  /** Position inside the map container, in CSS pixels. */
  x: number;
  y: number;
}

const DIRECTIONS_PATH = '/maps/preview/directions';

/** Pointer travel below this counts as a click, not a drag. */
const DRAG_THRESHOLD_PX = 5;

let routes: Route[] = [];

/**
 * `location.href` when the user grabbed or scrolled the map. Maps only writes
 * the new viewport to the URL once the map settles, so until the URL moves on
 * our labels would float in the wrong place, and we hide them.
 */
let staleHref: string | null = null;

/**
 * Keeps `routes` in sync with the directions Maps shows. Maps draws routes in a
 * worker-owned canvas, so the geometry is only available from its own
 * same-origin directions request, which we re-request once per route change
 * while `wanted()` is true.
 */
export function watchRoutes(onChange: () => void, wanted: () => boolean): void {
  let latest = 0;
  // Our own re-request shows up as a resource entry too; without this check it
  // would trigger itself forever.
  let lastUrl = '';

  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (!wanted() || !entry.name.includes(DIRECTIONS_PATH) || entry.name === lastUrl) continue;
      lastUrl = entry.name;

      const ticket = ++latest;
      fetch(entry.name)
        .then((response) => response.text())
        .then((body) => {
          if (ticket !== latest) return;
          routes = parseDirections(body);
          onChange();
        })
        .catch((error) => console.warn('[fuel-consumption] could not read route geometry:', error));
    }
  }).observe({ type: 'resource', buffered: true });

  let down: PointerEvent | null = null;
  const settleStart = (event: Event): void => {
    if (!findMap()?.contains(event.target as Node)) return;
    if (event instanceof PointerEvent) down = event;
    staleHref = location.href;
    onChange();
  };

  addEventListener('pointerdown', settleStart, true);
  addEventListener('wheel', settleStart, { capture: true, passive: true });
  addEventListener(
    'pointerup',
    (event) => {
      if (down && Math.hypot(event.clientX - down.clientX, event.clientY - down.clientY) < DRAG_THRESHOLD_PX) {
        staleHref = null;
        onChange();
      }
      down = null;
    },
    true,
  );
}

/** The element the map canvas lives in, or `null` without a vector map. */
export function findMap(): HTMLElement | null {
  let best: HTMLCanvasElement | null = null;
  let bestArea = 0;
  for (const canvas of document.querySelectorAll('canvas')) {
    const { width, height } = canvas.getBoundingClientRect();
    if (width * height > bestArea) {
      best = canvas;
      bestArea = width * height;
    }
  }
  return best?.parentElement ?? null;
}

/**
 * Where each route's label goes on the map right now, clear of the spots in
 * `avoid`; empty while the map moves.
 */
export function placeRoutes(map: HTMLElement, avoid: Point[] = []): PlacedRoute[] {
  const screen = screenOf(map);
  if (!screen) return [];

  const { width, height, toScreen } = screen;
  const paths = routes.map((route) => thin(route.path.map(([lat, lng]) => toScreen(lat, lng))));

  // Alternatives pick first: they only tell apart from the main route (Maps'
  // first) where they branch off, while the main route can take any spot left.
  const taken: Point[] = [...avoid];
  return routes
    .map((route, i) => [route, i] as const)
    .reverse()
    .flatMap(([route, i]) => {
      const at = labelPoint(paths, i, width, height, taken);
      if (!at) return [];
      taken.push(at);
      return [
        { index: i, title: route.title, distanceMeters: route.distanceMeters, x: Math.round(at[0]), y: Math.round(at[1]) },
      ];
    });
}

/** Where to refuel along route `index`, every `legMeters`; empty while the map moves. */
export function placeRefuelStops(map: HTMLElement, index: number, legMeters: number): Point[] {
  const screen = screenOf(map);
  const route = routes[index];
  if (!screen || !route) return [];

  return pointsEvery(route.path, legMeters).map(([lat, lng]) => {
    const [x, y] = screen.toScreen(lat, lng);
    return [Math.round(x), Math.round(y)];
  });
}

/** Map-container pixels for `[lat, lng]`, or `null` while the map moves or the view isn't flat. */
function screenOf(map: HTMLElement): { width: number; height: number; toScreen: (lat: number, lng: number) => Point } | null {
  if (staleHref === location.href) return null;
  staleHref = null;

  const view = parseViewport(location.href);
  if (!view) return null;

  const { width, height } = map.getBoundingClientRect();
  return {
    width,
    height,
    toScreen(lat, lng) {
      const [dx, dy] = project(lat, lng, view);
      return [width / 2 + dx, height / 2 + dy];
    },
  };
}
