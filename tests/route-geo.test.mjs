import assert from 'node:assert/strict';
import { test } from 'node:test';

const { labelPoint, parseDirections, parseViewport, pointsEvery, project, thin } = await import('../dist/lib/route-geo.js');

test('parses routes and delta-decodes their geometry', () => {
  const body = `)]}'\n${JSON.stringify([
    [
      null,
      [[[0, 'D1', [205187, '205 km', 0]]], [[0, 'alt', [86101, '86,1 km', 0]]]],
      null, null, null, null, null,
      [
        [[500000000, 10000000], [140000000, -5000000], null, null, [0, 0]],
        [['broken'], [1]],
      ],
    ],
  ])}`;

  const routes = parseDirections(body);
  assert.equal(routes.length, 1);
  assert.equal(routes[0].title, 'D1');
  assert.equal(routes[0].distanceMeters, 205187);
  assert.deepEqual(routes[0].path, [[50, 14], [51, 13.5]]);
  assert.deepEqual(parseDirections('not json'), []);
});

test('reads only flat viewports from the Maps URL', () => {
  assert.deepEqual(parseViewport('/maps/dir/A/B/@49.37,16.26,9.5z/data=!3m1'), { lat: 49.37, lng: 16.26, zoom: 9.5 });
  assert.deepEqual(parseViewport('/maps/dir/A/B/@-33.8,151.2,12z?entry=ttu'), { lat: -33.8, lng: 151.2, zoom: 12 });
  assert.equal(parseViewport('/maps/@50.08,14.42,500a,35y,39.16h,76.79t/data=!3m1'), null);
  assert.equal(parseViewport('/maps/@50.08,14.42,1234m/data=!3m1'), null);
});

test('projects with Web Mercator around the map centre', () => {
  const view = { lat: 0, lng: 0, zoom: 1 };
  assert.deepEqual(project(0, 0, view), [0, 0]);
  assert.deepEqual(project(0, 90, view), [128, 0]);
  assert.ok(project(45, 0, view)[1] < 0, 'north is up');
});

test('thins points and pins labels where routes diverge', () => {
  assert.deepEqual(thin([[0, 0], [5, 0], [20, 0]]), [[0, 0], [20, 0]]);

  const shared = [[100, 100], [200, 100]];
  const main = [...shared, [300, 100], [400, 100]];
  const alt = [...shared, [300, 300], [400, 100]];
  assert.deepEqual(labelPoint([main, alt], 1, 1000, 1000), [300, 300]);
  assert.deepEqual(labelPoint([main], 0, 1000, 1000), [300, 100]);
  assert.equal(labelPoint([[[0, 0]]], 0, 1000, 1000), null, 'off-screen');
  assert.deepEqual(labelPoint([main], 0, 1000, 1000, [[300, 100]]), [100, 100], 'avoids taken spots');
  assert.deepEqual(labelPoint([main], 0, 1000, 1000, [], [[300, 100]]), [100, 100], 'avoids markers');
  assert.deepEqual(labelPoint([main], 0, 1000, 1000, [], [[300, 20]]), [300, 100], 'markers take less room than labels');
});

test('finds points at fixed distances along a path', () => {
  // One degree of latitude is ~111.2 km.
  const path = [[0, 0], [1, 0], [2, 0]];
  const points = pointsEvery(path, 100_000);
  assert.equal(points.length, 2);
  assert.ok(Math.abs(points[0][0] - 0.8993) < 1e-3);
  assert.ok(Math.abs(points[1][0] - 1.7987) < 1e-3);
  assert.deepEqual(pointsEvery(path, 0), []);
  // The road is twice as long as the chords: stops come twice as often along them.
  assert.equal(pointsEvery(path, 100_000, 444_780).length, 4);
});
