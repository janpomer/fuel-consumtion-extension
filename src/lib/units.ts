import type { PriceUnit } from './types.js';

export const METRES_PER_MILE = 1609.344;
export const LITRES_PER_GALLON_US = 3.785411784;
export const LITRES_PER_GALLON_UK = 4.54609;

export const LITRES_PER_VOLUME_UNIT: Record<PriceUnit, number> = {
  per_litre: 1,
  per_gallon_us: LITRES_PER_GALLON_US,
  per_gallon_uk: LITRES_PER_GALLON_UK,
};

/**
 * A number as Maps renders it: digit groups joined by a single space, `.` or
 * `,`, e.g. `12,4`, `1 234`, `1.234,5`. Requiring digits on both sides of every
 * separator keeps `"Route 1, 45 km"` from being read as `1,45`.
 */
const DISTANCE_PATTERN = /(\d+(?:[\s.,]\d+)*)\s*(km|mi|miles?|m|ft|yd)(?![a-z/])/i;

/**
 * Parses a distance as Google Maps renders it, e.g. `"12,4 km"`, `"1,234 mi"`,
 * `"850 m"`, `"0.6 mi"`, `"300 ft"`, `"200 yd"`. Returns metres, or `null` if
 * the text is not a distance (durations such as `"1 h 20 min"` yield `null`).
 */
export function parseDistance(text: string): number | null {
  const match = DISTANCE_PATTERN.exec(text);
  if (!match) return null;

  const value = parseLocalisedNumber(match[1]!);
  if (value === null) return null;

  switch (match[2]!.toLowerCase()) {
    case 'km':
      return value * 1000;
    case 'm':
      return value;
    case 'mi':
    case 'mile':
    case 'miles':
      return value * METRES_PER_MILE;
    case 'yd':
      return value * 0.9144;
    case 'ft':
      return value * 0.3048;
    default:
      return null;
  }
}

/**
 * Reads a number written with either `,` or `.` as the decimal separator.
 *
 * The last separator is the decimal point (`"12,4"` -> 12.4, `"1.234,5"` ->
 * 1234.5) — unless every separator is the same character grouping exactly three
 * digits, which makes them all thousands separators (`"1,234"` -> 1234).
 */
export function parseLocalisedNumber(raw: string): number | null {
  const text = raw.replace(/[\s']/g, '');
  if (!/^\d+(?:[.,]\d+)*$/.test(text)) return null;

  const sepAt = /^\d+([.,])\d{3}(?:\1\d{3})*$/.test(text)
    ? -1
    : Math.max(text.lastIndexOf(','), text.lastIndexOf('.'));

  const value = Number(
    sepAt < 0
      ? text.replace(/[.,]/g, '')
      : text.slice(0, sepAt).replace(/[.,]/g, '') + '.' + text.slice(sepAt + 1),
  );
  return Number.isFinite(value) ? value : null;
}
