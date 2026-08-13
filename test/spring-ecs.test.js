'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { scan } = require('../src/adapters/spring-ecs');

function makeRepo(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'klap-brain-test-'));
  const resourcesDir = path.join(dir, 'src', 'main', 'resources');
  fs.mkdirSync(resourcesDir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(path.join(resourcesDir, name), content, 'utf8');
  }
  return dir;
}

test('YAML multi-documento: cada documento se parsea y se une, no se pisan entre si (bug real: application.yml con --- por perfil)', () => {
  const yaml = [
    'spring:',
    '  application:',
    '    name: mi-servicio',
    '---',
    'spring:',
    '  config:',
    '    activate:',
    '      on-profile: develop',
    'kafka:',
    '  topic:',
    '    input: topic-real',
    '---',
    'logging:',
    '  level:',
    '    root: info',
    '',
  ].join('\n');
  const repo = makeRepo({ 'application.yml': yaml });
  const { components } = scan(repo);
  assert.equal(components.length, 1);
  assert.deepEqual(components[0].topics.input, ['topic-real']);
  fs.rmSync(repo, { recursive: true, force: true });
});

test('repo que delega en config-server compartido y no declara topologia propia se omite (bug real: ms-central-sva-anticipo-calculos)', () => {
  const yaml = [
    'spring:',
    '  application:',
    '    name: ms-central-sva-anticipo-calculos',
    '---',
    'spring:',
    '  config:',
    '    import: optional:configserver:${SPRING_CONFIG_SERVER}/',
    '  datasource:',
    '    hikari:',
    '      connection-test-query: SELECT 1',
    '',
  ].join('\n');
  const repo = makeRepo({ 'application.yml': yaml });
  const result = scan(repo);
  assert.equal(result.components.length, 0);
  assert.equal(result.skipped.length, 1);
  assert.match(result.reason, /delega en config-server/);
  fs.rmSync(repo, { recursive: true, force: true });
});

test('repo que delega en config-server PERO ademas declara topics propios no se omite', () => {
  const yaml = [
    'spring:',
    '  config:',
    '    import: optional:configserver:${X}/',
    'kafka:',
    '  topic:',
    '    input: topic-local-real',
    '',
  ].join('\n');
  const repo = makeRepo({ 'application.yml': yaml });
  const { components } = scan(repo);
  assert.equal(components.length, 1);
  assert.deepEqual(components[0].topics.input, ['topic-local-real']);
  fs.rmSync(repo, { recursive: true, force: true });
});
