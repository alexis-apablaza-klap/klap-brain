'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { writeText } = require('../src/lib/fs-utils');
const { loadBaseline, checkComponent } = require('../src/model/stack-baseline');

function makeBaseline() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klap-brain-stack-baseline-test-'));
  const stackYmlPath = path.join(dir, 'stack.yml');
  writeText(stackYmlPath, [
    'libraries:',
    '  - name: "Java"',
    '    ecosystem: java',
    '    required: "21+"',
    '',
    '  - name: "Spring Boot"',
    '    ecosystem: java',
    '    required: "3.5.16+"',
    '    recommended: "4.1.0+"',
    '',
    '  - name: "springdoc-openapi"',
    '    ecosystem: java',
    '    conditional:',
    '      - when:',
    '          library: "Spring Boot"',
    '          majorAtLeast: 4',
    '        required: "3.1.0+"',
    '      - required: "2.9.0+"',
    '',
  ].join('\n'));
  return { dir, stackYmlPath };
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('libreria ausente en el repo no genera falla ni nota', () => {
  const f = makeBaseline();
  const baseline = loadBaseline(f.stackYmlPath);
  const { violations, notes } = checkComponent({}, baseline);
  assert.equal(violations.length, 0);
  assert.equal(notes.length, 0);
  cleanup(f.dir);
});

test('por debajo de "required" es violacion; por debajo de "recommended" (pero sobre required) es solo nota', () => {
  const f = makeBaseline();
  const baseline = loadBaseline(f.stackYmlPath);
  const { violations, notes } = checkComponent({ Java: '17', 'Spring Boot': '3.5.16' }, baseline);
  assert.equal(violations.length, 1);
  assert.equal(violations[0].library, 'Java');
  assert.equal(notes.length, 1);
  assert.equal(notes[0].library, 'Spring Boot');
  cleanup(f.dir);
});

test('springdoc-openapi condicional: Spring Boot 3.x exige 2.9.0+, Spring Boot 4.x exige 3.1.0+', () => {
  const f = makeBaseline();
  const baseline = loadBaseline(f.stackYmlPath);

  const enBoot3 = checkComponent({ 'Spring Boot': '3.5.16', 'springdoc-openapi': '2.8.12' }, baseline);
  assert.equal(enBoot3.violations.length, 1);
  assert.equal(enBoot3.violations[0].required, '2.9.0+');

  const enBoot4 = checkComponent({ 'Spring Boot': '4.1.0', 'springdoc-openapi': '2.9.0' }, baseline);
  assert.equal(enBoot4.violations.length, 1);
  assert.equal(enBoot4.violations[0].required, '3.1.0+');

  cleanup(f.dir);
});

test('stack.yml inexistente devuelve baseline vacio, no lanza', () => {
  const baseline = loadBaseline('/ruta/que/no/existe/stack.yml');
  assert.deepEqual(baseline.libraries, []);
});
