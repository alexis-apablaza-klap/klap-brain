'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const propertiesDocs = require('../src/adapters/spring-properties-docs');

function tmpRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'klap-brain-properties-docs-test-'));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('repo sin docs/ devuelve components vacio, no lanza', () => {
  const dir = tmpRepo();
  const result = propertiesDocs.scan(dir);
  assert.deepEqual(result.components, []);
  cleanup(dir);
});

test('docs/ sin .properties (solo otros archivos) devuelve components vacio', () => {
  const dir = tmpRepo();
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.writeFileSync(path.join(dir, 'docs', 'README.md'), '# nota');
  const result = propertiesDocs.scan(dir);
  assert.deepEqual(result.components, []);
  cleanup(dir);
});

test('docs/*.properties se escanea igual que el config-server compartido, pero con source=repo-docs-properties', () => {
  const dir = tmpRepo();
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.writeFileSync(path.join(dir, 'docs', 'ms-central-sva-anticipo-calculos-develop.properties'), [
    'kafka.topic.input=anticipo-input',
    'spring.datasource.hikari.schema=contable',
  ].join('\n'));

  const result = propertiesDocs.scan(dir);
  assert.equal(result.components.length, 1);
  const c = result.components[0];
  assert.equal(c.id, 'ms-central-sva-anticipo-calculos');
  assert.equal(c.source, 'repo-docs-properties');
  assert.deepEqual(c.topics.input, ['anticipo-input']);
  assert.equal(c.database.hasDatabase, true);
  cleanup(dir);
});
