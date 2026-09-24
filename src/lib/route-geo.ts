/** A screen position in CSS pixels. */
export type Point = [x: number, y: number];

/** One route option as Google Maps sends it: total distance plus its geometry. */
export interface Route {
  /** The roads Maps names the route by, e.g. "D1 and D46/E462". */
  title: string;
  distanceMeters: number;
  /** `[lat, lng]` pairs in degrees. */
  path: [lat: number, lng: number][];
}

/** The flat (untilted, unrotated) map view encoded in the Maps URL. */
export interface Viewport {
  lat: number;
  lng: number;
  zoom: number;
}

/**
 * `@lat,lng,zoomz` followed directly by the end of the segment. Tilted or rotated
 * views (`…,35y,90h,45t`) and satellite altitude views (`…,500m`) don't match,
 * because our flat projection would be wrong for them.
 */
const VIEWPORT_PATTERN = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?),(\d+(?:\.\d+)?)z(?=[/?#]|$)/;

/** Screen size of the whole world at zoom 0, in CSS pixels (Web Mercator tiles). */
const WORLD_PX_AT_ZOOM_0 = 256;

/** Labels closer than this to the map edge would be cut off. */
const EDGE_MARGIN_PX = 48;

/** Roughly one label's footprint; two labels closer than this overlap. */
const LABEL_SPACING_PX: Point = [190, 48];

export function parseViewport(url: string): Viewport | null {
  const match = VIEWPORT_PATTERN.exec(url);
  if (!match) return null;
  return { lat: Number(match[1]), lng: Number(match[2]), zoom: Number(match[3]) };
}

/**
 * Parses a `/maps/preview/directions` response body. The format is undocumented
 * and was reverse-engineered: `[0][1][k][0][1]` is route k's title,
 * `[0][1][k][0][2][0]` its distance in metres, `[0][7][k][0]` / `[0][7][k][1]` its latitudes / longitudes as deltas
 * in 1e-7 degrees. Anything that doesn't fit is dropped, so a change on Google's
 * side degrades to "no map labels" rather than wrong ones.
 */
export function parseDirections(body: string): Route[] {
  let data: any;
  try {
    data = JSON.parse(body.replace(/^\)\]\}'/, ''));
  } catch {
    return [];
  }

  const infos: unknown = data?.[0]?.[1];
  const lines: unknown = data?.[0]?.[7];
  if (!Array.isArray(infos) || !Array.isArray(lines)) return [];

  const routes: Route[] = [];
  infos.forEach((info, k) => {
    const title: unknown = info?.[0]?.[1];
    const distanceMeters: unknown = info?.[0]?.[2]?.[0];
    const lats: unknown = lines[k]?.[0];
    const lngs: unknown = lines[k]?.[1];
    if (typeof distanceMeters !== 'number' || !isNumbers(lats) || !isNumbers(lngs)) return;
    if (lats.length !== lngs.length || lats.length === 0) return;

    let lat = 0;
    let lng = 0;
    const path: Route['path'] = lats.map((dLat, i) => {
      lat += dLat;
      lng += lngs[i]!;
      return [lat / 1e7, lng / 1e7];
    });
    routes.push({ title: typeof title === 'string' ? title : '', distanceMeters, path });
  });
  return routes;
}

/** Pixel offset of `[lat, lng]` from the centre of the map (Web Mercator). */
export function project(lat: number, lng: number, view: Viewport): Point {
  const worldPx = WORLD_PX_AT_ZOOM_0 * 2 ** view.zoom;
  return [(mercatorX(lng) - mercatorX(view.lng)) * worldPx, (mercatorY(lat) - mercatorY(view.lat)) * worldPx];
}

/** Drops points closer than `minGap` px to the previously kept one. */
export function thin(points: Point[], minGap = 16): Point[] {
  const kept: Point[] = [];
  for (const point of points) {
    const last = kept[kept.length - 1];
    if (!last || Math.hypot(point[0] - last[0], point[1] - last[1]) >= minGap) kept.push(point);
  }
  return kept;
}

/**
 * Where to pin the label of `paths[index]`: its on-screen point farthest from
 * every other route, so alternatives sharing a highway still get separate
 * labels, and clear of the labels already placed at `taken`. A lone route gets
 * the middle of its on-screen part.
 */
export function labelPoint(
  paths: Point[][],
  index: number,
  width: number,
  height: number,
  taken: Point[] = [],
): Point | null {
  const visible = (paths[index] ?? []).filter(
    ([x, y]) =>
      x >= EDGE_MARGIN_PX &&
      x <= width - EDGE_MARGIN_PX &&
      y >= EDGE_MARGIN_PX &&
      y <= height - EDGE_MARGIN_PX &&
      taken.every(([tx, ty]) => Math.abs(tx - x) >= LABEL_SPACING_PX[0] || Math.abs(ty - y) >= LABEL_SPACING_PX[1]),
  );
  let best = visible[visible.length >> 1] ?? null;
  if (paths.length < 2) return best;

  let bestGap = -1;
  for (const point of visible) {
    let gap = Infinity;
    paths.forEach((other, j) => {
      if (j === index) return;
      for (const [x, y] of other) gap = Math.min(gap, Math.hypot(point[0] - x, point[1] - y));
    });
    if (gap > bestGap) {
      bestGap = gap;
      best = point;
    }
  }
  return best;
}

function isNumbers(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'number');
}

function mercatorX(lng: number): number {
  return (lng + 180) / 360;
}

function mercatorY(lat: number): number {
  const sin = Math.sin((lat * Math.PI) / 180);
  return 0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI);
}
