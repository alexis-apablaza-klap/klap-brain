'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { extractTopics, extractDatabase, extractExternalApis, parseProperties } = require('../src/adapters/spring-config-server');

test('parseProperties ignora comentarios y soporta continuacion con backslash', () => {
  const text = [
    '# comentario',
    'a=1',
    '',
    'b=hola \\',
    '  mundo',
    'c=${PLACEHOLDER}',
  ].join('\n');
  const props = parseProperties(text);
  assert.equal(props.a, '1');
  assert.equal(props.b, 'holamundo');
  assert.equal(props.c, '${PLACEHOLDER}');
});

test('extractTopics categoriza por sufijo de clave y separa valores por coma', () => {
  const topics = extractTopics({
    'kafka.topic.input': 'topic-a,topic-b',
    'kafka.topic.output': 'topic-c',
    'kafka.topic.dlq': 'topic-dlq',
    'kafka.topic.other-thing': '${PLACEHOLDER}',
  });
  assert.deepEqual(topics.input, ['topic-a', 'topic-b']);
  assert.deepEqual(topics.output, ['topic-c']);
  assert.deepEqual(topics.dlq, ['topic-dlq']);
  assert.deepEqual(topics.other, []);
});

test('union de topics entre archivos de ambiente no debe perder valores (bug real detectado en scan)', () => {
  const develop = extractTopics({ 'kafka.topic.input': 'bysf-liqsvbo-notificacion,bysf-liqsvbo-notificacion-input' });
  const local = extractTopics({ 'kafka.topic.input': 'notificaciones' });
  const union = new Set([...develop.input, ...local.input]);
  assert.equal(union.size, 3);
  assert.ok(union.has('bysf-liqsvbo-notificacion-input'));
});

test('extractTopics ignora valores booleanos de claves que solo contienen la palabra "topic" (bug real: es.topico=true)', () => {
  const topics = extractTopics({ 'es.topico': 'true', 'kafka.topic.input': 'topic-real' });
  assert.deepEqual(topics.input, ['topic-real']);
  assert.deepEqual(Object.values(topics).flat(), ['topic-real']);
});

test('extractTopics clasifica consumer./producer. como input/output (segunda convencion real: dominio sva-anticipo)', () => {
  const topics = extractTopics({
    'spring.kafka.consumer.topic': 'sva-inicio-anticipo',
    'spring.kafka.producer.topic': 'sva-calculo-anticipo',
  });
  assert.deepEqual(topics.input, ['sva-inicio-anticipo']);
  assert.deepEqual(topics.output, ['sva-calculo-anticipo']);
  assert.deepEqual(topics.other, []);
});

test('extractDatabase detecta datasource y toma el schema literal, ignora placeholders', () => {
  const db = extractDatabase({
    'spring.datasource.url': '${AWS_AURORA_URL}',
    'spring.datasource.hikari.schema': 'backoffice_serv_fin',
  });
  assert.equal(db.hasDatabase, true);
  assert.equal(db.schema, 'backoffice_serv_fin');
});

test('extractExternalApis dedup por nombre base de clave', () => {
  const apis = extractExternalApis({
    'api.bo.url': '${BO_URL}',
    'api.bo.host': '${BO_HOST}',
    'api.crontabshell.url': '${X}',
  });
  assert.deepEqual(apis.sort(), ['api.bo', 'api.crontabshell'].sort());
});
