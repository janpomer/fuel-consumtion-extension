import type { PriceUnit } from './types.js';

export const METRES_PER_MILE = 1609.344;
export const METRES_PER_YARD = 0.9144;
export const METRES_PER_FOOT = 0.3048;
export const LITRES_PER_GALLON_US = 3.785411784;
export const LITRES_PER_GALLON_UK = 4.54609;

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
      return value * METRES_PER_YARD;
    case 'ft':
      return value * METRES_PER_FOOT;
    default:
      return null;
  }
}

/**
 * Reads a number written with either `,` or `.` as the decimal separator.
 *
 * A lone separator followed by exactly three digits is treated as a thousands
 * separator (`"1,234"` -> 1234), anything else as a decimal separator
 * (`"12,4"` -> 12.4). When both separators appear, the last one decides
 * (`"1.234,5"` -> 1234.5).
 */
export function parseLocalisedNumber(raw: string): number | null {
  const text = raw.replace(/[\s']/g, '');
  if (!/^\d[\d.,]*$/.test(text)) return null;

  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  let normalised: string;

  if (lastComma >= 0 && lastDot >= 0) {
    const decimalAt = Math.max(lastComma, lastDot);
    normalised = text.slice(0, decimalAt).replace(/[.,]/g, '') + '.' + text.slice(decimalAt + 1);
  } else {
    const sepAt = Math.max(lastComma, lastDot);
    if (sepAt < 0) {
      normalised = text;
    } else if (/^\d{3}$/.test(text.slice(sepAt + 1))) {
      // Thousands grouping: "1,234" / "1.234".
      normalised = text.replace(/[.,]/g, '');
    } else {
      normalised = text.slice(0, sepAt) + '.' + text.slice(sepAt + 1);
    }
  }

  const value = Number(normalised);
  return Number.isFinite(value) ? value : null;
}

export function litresPerVolumeUnit(unit: PriceUnit): number {
  switch (unit) {
    case 'per_litre':
      return 1;
    case 'per_gallon_us':
      return LITRES_PER_GALLON_US;
    case 'per_gallon_uk':
      return LITRES_PER_GALLON_UK;
  }
}
