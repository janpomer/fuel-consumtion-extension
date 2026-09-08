// Tests run against the compiled output in dist/; `npm test` builds first.
import assert from 'node:assert/strict';
import { test } from 'node:test';

const { parseDistance, parseLocalisedNumber } = await import('../dist/lib/units.js');

test('parses metric distances as Google Maps renders them', () => {
  assert.equal(parseDistance('12,4 km'), 12_400);
  assert.equal(parseDistance('12.4 km'), 12_400);
  assert.equal(parseDistance('850 m'), 850);
  assert.equal(parseDistance('1,234 km'), 1_234_000);
  assert.equal(parseDistance('1.234,5 km'), 1_234_500);
  assert.equal(parseDistance('1 234 km'), 1_234_000);
});

test('parses imperial distances', () => {
  assert.equal(Math.round(parseDistance('1 mi')), 1609);
  assert.equal(Math.round(parseDistance('1 mile')), 1609);
  assert.equal(Math.round(parseDistance('2 miles')), 3219);
  assert.equal(Math.round(parseDistance('0.6 mi')), 966);
  assert.equal(Math.round(parseDistance('200 yd')), 183);
  assert.equal(Math.round(parseDistance('300 ft')), 91);
});

test('ignores durations and other non-distance labels', () => {
  assert.equal(parseDistance('1 h 20 min'), null);
  assert.equal(parseDistance('45 min'), null);
  assert.equal(parseDistance('50 km/h'), null);
  assert.equal(parseDistance('Fastest route now'), null);
  assert.equal(parseDistance(''), null);
});

test('finds the distance inside a combined label', () => {
  assert.equal(parseDistance('2 h 14 min193 km'), 193_000);
  assert.equal(parseDistance('Route 1, 45 km'), 45_000);
  assert.equal(parseDistance('Continue for 12,4 km'), 12_400);
});

test('decides between decimal and thousands separators', () => {
  assert.equal(parseLocalisedNumber('12,4'), 12.4);
  assert.equal(parseLocalisedNumber('1,234'), 1234);
  assert.equal(parseLocalisedNumber('1 234,5'), 1234.5);
  assert.equal(parseLocalisedNumber('1.234.567'), 1_234_567);
  assert.equal(parseLocalisedNumber('1,234,567.8'), 1_234_567.8);
  assert.equal(parseLocalisedNumber('7'), 7);
  assert.equal(parseLocalisedNumber('abc'), null);
  assert.equal(parseLocalisedNumber('7,'), null);
});
