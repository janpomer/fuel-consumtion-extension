import type { ConsumptionUnit, Estimate, Settings } from './types.js';
import {
  LITRES_PER_GALLON_UK,
  LITRES_PER_GALLON_US,
  LITRES_PER_VOLUME_UNIT,
  METRES_PER_MILE,
} from './units.js';

/** Converts any supported consumption figure to litres per 100 km. */
export function toLitresPer100Km(consumption: number, unit: ConsumptionUnit): number | null {
  if (!Number.isFinite(consumption) || consumption <= 0) return null;

  switch (unit) {
    case 'l_per_100km':
      return consumption;
    case 'km_per_l':
      return 100 / consumption;
    case 'mpg_us':
      return (100 * LITRES_PER_GALLON_US) / (consumption * (METRES_PER_MILE / 1000));
    case 'mpg_uk':
      return (100 * LITRES_PER_GALLON_UK) / (consumption * (METRES_PER_MILE / 1000));
  }
}

/**
 * Distance between refuelling stops: how far a full tank gets before only
 * `reserveKm` of range is left. Assumes the trip starts with a full tank and
 * every stop fills it up again. `null` when a tank doesn't reach the reserve.
 */
export function refuelLegMeters(settings: Settings): number | null {
  const lPer100Km = toLitresPer100Km(settings.consumption, settings.consumptionUnit);
  if (lPer100Km === null || !(settings.tankLitres > 0)) return null;

  const legKm = (settings.tankLitres / lPer100Km) * 100 - settings.reserveKm;
  return legKm > 0 ? legKm * 1000 : null;
}

/**
 * Estimates fuel used over `distanceMeters` for the configured car, plus the
 * cost of that fuel when a price is configured.
 *
 * This is a flat average-consumption model: it deliberately ignores elevation,
 * traffic and driving style, which Google Maps does not expose to extensions.
 */
export function estimate(distanceMeters: number, settings: Settings): Estimate | null {
  if (!Number.isFinite(distanceMeters) || distanceMeters <= 0) return null;

  const lPer100Km = toLitresPer100Km(settings.consumption, settings.consumptionUnit);
  if (lPer100Km === null) return null;

  const litres = (distanceMeters / 100_000) * lPer100Km;

  let cost: number | null = null;
  if (settings.showCost && Number.isFinite(settings.price) && settings.price > 0) {
    const pricePerLitre = settings.price / LITRES_PER_VOLUME_UNIT[settings.priceUnit];
    cost = litres * pricePerLitre;
  }

  return { distanceMeters, litres, cost };
}
