'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeJson, writeText } = require('../src/lib/fs-utils');
const { buildGraph } = require('../src/model/topology');
const { loadMemoryIndex } = require('../src/model/memory');
const { findOrphanedMemoryRefs } = require('../src/model/integrity');

function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klap-brain-integrity-test-'));
  const topologyPath = path.join(dir, 'topology.json');
  const productosPath = path.join(dir, 'productos.yml');
  const memoryDir = path.join(dir, 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });

  writeJson(topologyPath, {
    generatedAt: '2026-01-01T00:00:00Z',
    components: [
      { id: 'svc-a', type: 'ms', domain: 'x', source: 'test', topics: { input: [], output: [], notification: [], dlq: [], other: [] }, database: { hasDatabase: false, schema: null }, externalApis: [] },
    ],
  });

  writeText(productosPath, [
    'products:',
    '  - id: producto-uno',
    '    name: "Producto Uno"',
    '    description: "desc"',
    '    phase: "Fase 1"',
    '    componentPatterns:',
    '      - "svc-a"',
    '',
  ].join('\n'));

  return { dir, topologyPath, productosPath, memoryDir };
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('memoria sin product ni components se reporta como "sin-ancla"', () => {
  const f = makeFixture();
  writeText(path.join(f.memoryDir, 'hecho-sin-ancla.md'), [
    '---',
    'type: note',
    'date: 2026-01-01',
    '---',
    'Un hecho sin ancla real.',
    '',
  ].join('\n'));

  const graph = buildGraph(f.topologyPath, f.productosPath);
  const memoryIndex = loadMemoryIndex(f.memoryDir);
  const orphans = findOrphanedMemoryRefs(graph, memoryIndex);

  assert.equal(orphans.length, 1);
  assert.equal(orphans[0].kind, 'sin-ancla');
  assert.equal(orphans[0].ref, null);
  cleanup(f.dir);
});

test('memoria con ancla real (product o component existente) no se reporta', () => {
  const f = makeFixture();
  writeText(path.join(f.memoryDir, 'hecho-anclado.md'), [
    '---',
    'type: decision',
    'product: producto-uno',
    'date: 2026-01-01',
    '---',
    'Un hecho anclado a un producto real.',
    '',
  ].join('\n'));

  const graph = buildGraph(f.topologyPath, f.productosPath);
  const memoryIndex = loadMemoryIndex(f.memoryDir);
  const orphans = findOrphanedMemoryRefs(graph, memoryIndex);

  assert.equal(orphans.length, 0);
  cleanup(f.dir);
});
