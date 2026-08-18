'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const semver = require('../src/lib/semver-lite');

test('meetsFloor: version por debajo del piso es false', () => {
  assert.equal(semver.meetsFloor('3.5.6', '3.5.16+'), false);
});

test('meetsFloor: version igual al piso es true', () => {
  assert.equal(semver.meetsFloor('3.5.16', '3.5.16+'), true);
});

test('meetsFloor: version por sobre el piso, incluso de mayor major, es true', () => {
  assert.equal(semver.meetsFloor('4.1.0', '3.5.16+'), true);
});

test('meetsFloor: prefijos ^/~/v y specs "N.x+" se interpretan igual', () => {
  assert.equal(semver.meetsFloor('^19.2.0', '21.0.0+'), false);
  assert.equal(semver.meetsFloor('v21.0.0', '21.x+'), true);
});

test('meetsFloor: version solo con major (Java "17") se compara sin fallar', () => {
  assert.equal(semver.meetsFloor('17', '21+'), false);
  assert.equal(semver.meetsFloor('21', '21+'), true);
});

test('meetsFloor: entrada no interpretable devuelve null, no lanza', () => {
  assert.equal(semver.meetsFloor('latest', '21+'), null);
  assert.equal(semver.meetsFloor(null, '21+'), null);
});
