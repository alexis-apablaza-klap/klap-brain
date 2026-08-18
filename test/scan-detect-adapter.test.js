'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { detectAdapter } = require('../src/commands/scan');
const springPropertiesDocs = require('../src/adapters/spring-properties-docs');
const springEcs = require('../src/adapters/spring-ecs');

function tmpRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'klap-brain-detect-adapter-test-'));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('repo con docs/*.properties Y src/main/resources usa spring-properties-docs, no spring-ecs', () => {
  const dir = tmpRepo();
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.writeFileSync(path.join(dir, 'docs', 'ms-x-develop.properties'), 'kafka.topic.input=x\n');
  fs.mkdirSync(path.join(dir, 'src', 'main', 'resources'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'main', 'resources', 'application.yml'), 'server:\n  port: 8080\n');

  assert.equal(detectAdapter(dir), springPropertiesDocs);
  cleanup(dir);
});

test('repo solo con src/main/resources (sin docs/) sigue usando spring-ecs', () => {
  const dir = tmpRepo();
  fs.mkdirSync(path.join(dir, 'src', 'main', 'resources'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'src', 'main', 'resources', 'application.yml'), 'server:\n  port: 8080\n');

  assert.equal(detectAdapter(dir), springEcs);
  cleanup(dir);
});

test('repo con docs/ vacio de .properties cae al siguiente adaptador aplicable', () => {
  const dir = tmpRepo();
  fs.mkdirSync(path.join(dir, 'docs'));
  fs.writeFileSync(path.join(dir, 'docs', 'README.md'), '# nota');
  fs.mkdirSync(path.join(dir, 'src', 'main', 'resources'), { recursive: true });

  assert.equal(detectAdapter(dir), springEcs);
  cleanup(dir);
});
