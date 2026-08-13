'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const yamlLite = require('../src/lib/yaml-lite');

test('mapa simple con valores escalares', () => {
  const out = yamlLite.parse('a: 1\nb: "two"\nc: true\nd: null\n');
  assert.deepEqual(out, { a: 1, b: 'two', c: true, d: null });
});

test('comentario inline no contamina el valor (bug real: serverless.yml region)', () => {
  const out = yamlLite.parse('region: us-east-2   # comentario\n');
  assert.equal(out.region, 'us-east-2');
});

test('clave con solo un comentario como valor se interpreta como bloque anidado', () => {
  const text = [
    'vpc:                # nota',
    '  securityGroupIds:',
    '    - sg-123',
  ].join('\n');
  const out = yamlLite.parse(text);
  assert.deepEqual(out.vpc, { securityGroupIds: ['sg-123'] });
});

test('lista de mapas con clave inline unica y bloque anidado (bug real: functions.events[].http)', () => {
  const text = [
    'functions:',
    '  mainFunction:',
    '    events:',
    '      - http:',
    '          path: main',
    '          method: post',
  ].join('\n');
  const out = yamlLite.parse(text);
  assert.deepEqual(out.functions.mainFunction.events, [{ http: { path: 'main', method: 'post' } }]);
});

test('lista de mapas con multiples claves hermanas y lista anidada (productos.yml)', () => {
  const text = [
    'products:',
    '  - id: abono-ya',
    '    name: "Abono Ya"',
    '    componentPatterns:',
    '      - "*anticipo*"',
    '      - "*sva-anticipo*"',
    '  - id: impulso-klap',
    '    name: "Impulso Klap"',
  ].join('\n');
  const out = yamlLite.parse(text);
  assert.deepEqual(out.products, [
    { id: 'abono-ya', name: 'Abono Ya', componentPatterns: ['*anticipo*', '*sva-anticipo*'] },
    { id: 'impulso-klap', name: 'Impulso Klap' },
  ]);
});

test('flow-style vacio [] se interpreta como lista vacia, no como string literal (bug real: productos.yml)', () => {
  const out = yamlLite.parse('id: vouchering-itau\ncomponentPatterns: []\n');
  assert.deepEqual(out.componentPatterns, []);
  assert.ok(Array.isArray(out.componentPatterns));
});

test('flow-style con elementos [a, b] se parsea como lista (bug real: round-trip con frontmatter.stringify — components: [svc-a] se leia como string literal, no como array)', () => {
  const out = yamlLite.parse('components: [svc-a, svc-b]\ntags: ["con espacio", solo]\n');
  assert.deepEqual(out.components, ['svc-a', 'svc-b']);
  assert.deepEqual(out.tags, ['con espacio', 'solo']);
});

test('round-trip completo: frontmatter.stringify -> frontmatter.parse preserva arrays', () => {
  const frontmatter = require('../src/lib/frontmatter');
  const written = frontmatter.stringify({ type: 'decision', components: ['svc-a'], tags: ['x', 'y'] }, 'cuerpo\n');
  const { data } = frontmatter.parse(written);
  assert.deepEqual(data.components, ['svc-a']);
  assert.deepEqual(data.tags, ['x', 'y']);
});

test('flatten aplana objetos anidados a notacion de puntos', () => {
  const out = yamlLite.flatten({ spring: { datasource: { url: 'x', hikari: { schema: 'y' } } } });
  assert.deepEqual(out, { 'spring.datasource.url': 'x', 'spring.datasource.hikari.schema': 'y' });
});
