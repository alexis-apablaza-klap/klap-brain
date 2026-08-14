'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { readJson } = require('../src/lib/fs-utils');

test('readJson despoja el BOM (bug real: export de Neo4j en Windows con \\uFEFF al inicio)', () => {
  const file = path.join(os.tmpdir(), `klap-brain-bom-test-${Date.now()}.json`);
  fs.writeFileSync(file, '﻿' + JSON.stringify({ entities: [{ name: 'x' }] }), 'utf8');
  try {
    const data = readJson(file);
    assert.deepEqual(data, { entities: [{ name: 'x' }] });
  } finally {
    fs.rmSync(file, { force: true });
  }
});

test('readJson sin BOM sigue funcionando igual', () => {
  const file = path.join(os.tmpdir(), `klap-brain-nobom-test-${Date.now()}.json`);
  fs.writeFileSync(file, JSON.stringify({ a: 1 }), 'utf8');
  try {
    assert.deepEqual(readJson(file), { a: 1 });
  } finally {
    fs.rmSync(file, { force: true });
  }
});
