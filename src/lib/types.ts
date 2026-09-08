/** How the user prefers to express their car's fuel consumption. */
export const CONSUMPTION_UNITS = ['l_per_100km', 'km_per_l', 'mpg_us', 'mpg_uk'] as const;
export type ConsumptionUnit = (typeof CONSUMPTION_UNITS)[number];

/** Volume unit the fuel price refers to. */
export const PRICE_UNITS = ['per_litre', 'per_gallon_us', 'per_gallon_uk'] as const;
export type PriceUnit = (typeof PRICE_UNITS)[number];

export interface Settings {
  /** Consumption figure, expressed in `consumptionUnit`. */
  consumption: number;
  consumptionUnit: ConsumptionUnit;
  /** Fuel price, expressed in `priceUnit`, in `currency`. */
  price: number;
  priceUnit: PriceUnit;
  /** Free-form currency label shown next to the cost, e.g. "€", "CZK", "$". */
  currency: string;
  /** Show the estimated cost next to the estimated volume. */
  showCost: boolean;
  /** Show the estimate at all (kill switch without uninstalling). */
  enabled: boolean;
}

/** A route estimate, always kept in SI internally. */
export interface Estimate {
  distanceMeters: number;
  litres: number;
  /** `null` when no usable price is configured or cost display is off. */
  cost: number | null;
}
