import assert from 'node:assert/strict';
import { test } from 'node:test';

const { DEFAULT_SETTINGS, sanitiseSettings } = await import('../dist/lib/settings.js');

test('fills in defaults for missing keys', () => {
  assert.deepEqual(sanitiseSettings({}), DEFAULT_SETTINGS);
});

test('keeps valid values and preserves flags the caller passes through', () => {
  const result = sanitiseSettings({
    consumption: 6.85,
    consumptionUnit: 'mpg_uk',
    price: 0,
    priceUnit: 'per_gallon_uk',
    currency: '£',
    showCost: false,
    enabled: false,
    showOnMap: false,
  });
  assert.equal(result.consumption, 6.85);
  assert.equal(result.consumptionUnit, 'mpg_uk');
  assert.equal(result.price, 0);
  assert.equal(result.priceUnit, 'per_gallon_uk');
  assert.equal(result.currency, '£');
  assert.equal(result.showCost, false);
  assert.equal(result.enabled, false);
  assert.equal(result.showOnMap, false);
});

test('replaces invalid values with defaults', () => {
  const result = sanitiseSettings({
    consumption: 0,
    consumptionUnit: 'furlongs',
    price: -1,
    priceUnit: 'per_barrel',
    currency: 42,
    showCost: 'yes',
  });
  assert.deepEqual(result, DEFAULT_SETTINGS);
});

test('accepts numbers typed with a decimal comma and truncates long currency labels', () => {
  const result = sanitiseSettings({ consumption: '7,5', currency: 'ABCDEFGHIJ' });
  assert.equal(result.consumption, 7.5);
  assert.equal(result.currency, 'ABCDEFGH');
});
