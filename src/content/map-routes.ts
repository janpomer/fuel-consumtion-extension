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

/** Where each route's label and each refuelling stop go on the map right now. */
export interface Placement {
  labels: PlacedRoute[];
  /** Stops along the selected route, in map-container pixels. */
  stops: Point[];
}

/**
 * Places the route labels (when `labels`) and, every `refuel.legMeters` along
 * route `refuel.index`, a refuelling stop; both empty while the map moves or the
 * view isn't flat.
 */
export function placeOnMap(
  map: HTMLElement,
  labels: boolean,
  refuel: { index: number; legMeters: number } | null,
): Placement {
  const none: Placement = { labels: [], stops: [] };
  if (staleHref === location.href) return none;
  staleHref = null;

  const view = parseViewport(location.href);
  if (!view) return none;

  const { width, height } = map.getBoundingClientRect();
  const toScreen = ([lat, lng]: Route['path'][number]): Point => {
    const [dx, dy] = project(lat, lng, view);
    return [width / 2 + dx, height / 2 + dy];
  };
  const round = ([x, y]: Point): Point => [Math.round(x), Math.round(y)];

  const stopRoute = refuel ? routes[refuel.index] : undefined;
  const stops =
    refuel && stopRoute
      ? pointsEvery(stopRoute.path, refuel.legMeters, stopRoute.distanceMeters).map(toScreen).map(round)
      : [];
  if (!labels) return { labels: [], stops };

  const paths = routes.map((route) => thin(route.path.map(toScreen)));

  // Alternatives pick first: they only tell apart from the main route (Maps'
  // first) where they branch off, while the main route can take any spot left.
  const taken: Point[] = [];
  return {
    stops,
    labels: routes
      .map((route, i) => [route, i] as const)
      .reverse()
      .flatMap(([route, i]) => {
        const at = labelPoint(paths, i, width, height, taken, stops);
        if (!at) return [];
        taken.push(at);
        const [x, y] = round(at);
        return [{ index: i, title: route.title, distanceMeters: route.distanceMeters, x, y }];
      }),
  };
}
