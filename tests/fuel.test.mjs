import assert from 'node:assert/strict';
import { test } from 'node:test';

const { estimate, toLitresPer100Km } = await import('../dist/lib/fuel.js');
const { formatEstimate } = await import('../dist/lib/format.js');

const base = {
  consumption: 7,
  consumptionUnit: 'l_per_100km',
  price: 1.5,
  priceUnit: 'per_litre',
  currency: '€',
  showCost: true,
  enabled: true,
};

test('converts every supported consumption unit to l/100 km', () => {
  assert.equal(toLitresPer100Km(7, 'l_per_100km'), 7);
  assert.equal(toLitresPer100Km(10, 'km_per_l'), 10);
  assert.equal(toLitresPer100Km(30, 'mpg_us').toFixed(2), '7.84');
  assert.equal(toLitresPer100Km(30, 'mpg_uk').toFixed(2), '9.42');
  assert.equal(toLitresPer100Km(0, 'l_per_100km'), null);
  assert.equal(toLitresPer100Km(NaN, 'l_per_100km'), null);
});

test('estimates volume and cost for a route', () => {
  const result = estimate(250_000, base);
  assert.equal(result.litres, 17.5);
  assert.equal(result.cost, 26.25);
});

test('omits cost when disabled or unpriced', () => {
  assert.equal(estimate(100_000, { ...base, showCost: false }).cost, null);
  assert.equal(estimate(100_000, { ...base, price: 0 }).cost, null);
});

test('prices per gallon are converted to litres', () => {
  const result = estimate(100_000, { ...base, price: 3.785411784, priceUnit: 'per_gallon_us' });
  assert.equal(result.cost.toFixed(2), '7.00');
});

test('rejects nonsensical distances', () => {
  assert.equal(estimate(0, base), null);
  assert.equal(estimate(-5, base), null);
  assert.equal(estimate(NaN, base), null);
});

test('formats the injected label', () => {
  const result = estimate(100_000, base);
  assert.equal(formatEstimate(result, '€', 'en-GB'), '7.00 l · 10.50 €');
});
