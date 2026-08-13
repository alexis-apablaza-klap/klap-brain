'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeJson, writeText } = require('../src/lib/fs-utils');
const query = require('../src/model/query');

function makeFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klap-brain-query-test-'));
  const topologyPath = path.join(dir, 'topology.json');
  const productosPath = path.join(dir, 'productos.yml');
  const memoryDir = path.join(dir, 'memory');
  fs.mkdirSync(memoryDir, { recursive: true });

  writeJson(topologyPath, {
    generatedAt: '2026-01-01T00:00:00Z',
    components: [
      { id: 'svc-a', type: 'ms', domain: 'x', source: 'test', topics: { input: [], output: ['topic-1'], notification: [], dlq: [], other: [] }, database: { hasDatabase: true, schema: 'schema-a' }, externalApis: [] },
      { id: 'svc-b', type: 'ms', domain: 'x', source: 'test', topics: { input: ['topic-1'], output: [], notification: [], dlq: [], other: [] }, database: { hasDatabase: true, schema: 'schema-a' }, externalApis: [] },
      { id: 'svc-c', type: 'ms', domain: 'y', source: 'test', topics: { input: [], output: [], notification: [], dlq: [], other: [] }, database: { hasDatabase: false, schema: null }, externalApis: [] },
    ],
  });

  writeText(productosPath, [
    'products:',
    '  - id: producto-uno',
    '    name: "Producto Uno"',
    '    description: "desc uno"',
    '    phase: "Fase 1"',
    '    componentPatterns:',
    '      - "svc-a"',
    '  - id: producto-dos',
    '    name: "Producto Dos"',
    '    description: "desc dos"',
    '    phase: "Mantencion"',
    '    componentPatterns:',
    '      - "svc-b"',
    '  - id: producto-vacio',
    '    name: "Producto Vacio"',
    '    description: "sin componentes"',
    '    phase: "Kickoff"',
    '    componentPatterns: []',
    '',
  ].join('\n'));

  return { dir, topologyPath, productosPath, memoryDir };
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('ctx sobre un producto: componentes matcheados, integracion cruzada por topic, huecos por falta de memoria', () => {
  const f = makeFixture();
  const result = query.ctx('producto-uno', { topologyPath: f.topologyPath, productosPath: f.productosPath, memoryDir: f.memoryDir });
  assert.equal(result.kind, 'product');
  assert.equal(result.components.length, 1);
  assert.equal(result.components[0].id, 'svc-a');
  assert.equal(result.integrations.length, 1);
  assert.equal(result.integrations[0].product, 'producto-dos');
  assert.deepEqual(result.integrations[0].topics, ['topic-1']);
  assert.ok(result.gaps.some((g) => g.includes('svc-a')));
  cleanup(f.dir);
});

test('ctx sobre un producto sin componentes matcheados reporta el hueco explicitamente', () => {
  const f = makeFixture();
  const result = query.ctx('producto-vacio', { topologyPath: f.topologyPath, productosPath: f.productosPath, memoryDir: f.memoryDir });
  assert.equal(result.kind, 'product');
  assert.equal(result.components.length, 0);
  assert.ok(result.gaps[0].includes('Ningun componente'));
  cleanup(f.dir);
});

test('ctx sobre un componente: vecino por topic y por schema compartido', () => {
  const f = makeFixture();
  const result = query.ctx('svc-a', { topologyPath: f.topologyPath, productosPath: f.productosPath, memoryDir: f.memoryDir });
  assert.equal(result.kind, 'component');
  assert.equal(result.products[0], 'producto-uno');
  assert.equal(result.neighbors.topicNeighbors.length, 1);
  assert.equal(result.neighbors.topicNeighbors[0].component, 'svc-b');
  assert.equal(result.neighbors.schemaNeighbors.length, 1);
  assert.equal(result.neighbors.schemaNeighbors[0].component, 'svc-b');
  cleanup(f.dir);
});

test('ctx sobre id inexistente devuelve sugerencias por distancia de edicion', () => {
  const f = makeFixture();
  const result = query.ctx('producto-un', { topologyPath: f.topologyPath, productosPath: f.productosPath, memoryDir: f.memoryDir });
  assert.equal(result.kind, 'not-found');
  assert.ok(result.suggestions.includes('producto-uno'));
  cleanup(f.dir);
});

test('impact sobre un topic real devuelve productor y consumidor con sus productos', () => {
  const f = makeFixture();
  const result = query.impact('topic-1', { topologyPath: f.topologyPath, productosPath: f.productosPath });
  assert.equal(result.kind, 'topic');
  assert.deepEqual(result.producers.map((p) => p.component), ['svc-a']);
  assert.deepEqual(result.consumers.map((c) => c.component), ['svc-b']);
  assert.deepEqual(result.producers[0].products, ['producto-uno']);
  cleanup(f.dir);
});

test('memoria vinculada a un producto aparece en ctx y desaparece el hueco de "sin memoria" para ese componente', () => {
  const f = makeFixture();
  writeText(path.join(f.memoryDir, 'hecho-1.md'), [
    '---',
    'type: decision',
    'product: producto-uno',
    'components: [svc-a]',
    'date: 2026-01-01',
    '---',
    'Se decidio X por razon Y.',
    '',
  ].join('\n'));

  const result = query.ctx('producto-uno', { topologyPath: f.topologyPath, productosPath: f.productosPath, memoryDir: f.memoryDir });
  assert.equal(result.memory.length, 1);
  assert.equal(result.memory[0].slug, 'hecho-1');
  assert.ok(!result.gaps.some((g) => g.includes('Sin conocimiento funcional registrado para svc-a')));
  cleanup(f.dir);
});
