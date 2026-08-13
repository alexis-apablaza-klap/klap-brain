'use strict';

/**
 * Adaptador de topologia para microservicios Spring Boot on-prem cuya
 * configuracion vive centralizada en el repo de Spring Cloud Config
 * (ms-central-config-server-repo). Cada componente puede tener varios
 * archivos *.properties, uno por ambiente (local/develop/qa/master/...);
 * este adaptador los agrupa por nombre base y fusiona sus claves.
 *
 * No requiere clonar el repo del componente: toda la topologia relevante
 * (topics Kafka, datasource, APIs externas) esta declarada en las properties.
 */

const fs = require('fs');
const path = require('path');

const ENV_SUFFIXES = ['local', 'develop', 'dev', 'qa', 'master', 'production', 'prod', 'test'];
const ENV_SUFFIX_RE = new RegExp(`-(${ENV_SUFFIXES.join('|')})$`);
const TYPE_RE = /^([a-z]+)-/;

const KAFKA_TOPIC_KEY_RE = /topic/i;
const DATASOURCE_KEY_RE = /datasource/i;
const SCHEMA_KEY_RE = /(hikari\.schema|schema)$/i;
const EXTERNAL_API_KEY_RE = /(^|\.)(url|uri|host|wsdl-url)$/i;
const GROUP_ID_KEY_RE = /kafka\.consumer\.group-id$/i;

function isPlaceholder(value) {
  return !value || value.startsWith('${') || value.trim() === '';
}

/** Parser de .properties: ignora comentarios/blank, soporta continuacion con backslash. */
function parseProperties(text) {
  const props = {};
  const lines = text.split(/\r?\n/);
  let pendingKey = null;
  let pendingValue = '';
  for (let raw of lines) {
    if (pendingKey) {
      const cont = raw.replace(/\\$/, '');
      pendingValue += cont.trim();
      if (raw.endsWith('\\')) continue;
      props[pendingKey] = pendingValue;
      pendingKey = null;
      pendingValue = '';
      continue;
    }
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx === -1) continue;
    const key = line.slice(0, eqIdx).trim();
    let value = line.slice(eqIdx + 1).trim();
    if (value.endsWith('\\')) {
      pendingKey = key;
      pendingValue = value.slice(0, -1).trim();
      continue;
    }
    props[key] = value;
  }
  return props;
}

function baseNameOf(filename) {
  const name = filename.replace(/\.properties$/, '');
  const match = ENV_SUFFIX_RE.exec(name);
  const base = match ? name.slice(0, match.index) : name;
  const env = match ? match[1] : 'default';
  return { base, env };
}

function typeOf(componentId) {
  const match = TYPE_RE.exec(componentId);
  return match ? match[1] : 'unknown';
}

function domainOf(componentId) {
  const parts = componentId.split('-');
  return parts.length > 1 ? parts[1] : 'unknown';
}

const NON_TOPIC_VALUE_RE = /^(true|false|-?\d+(\.\d+)?)$/i;

function extractTopics(props) {
  const topics = { input: [], output: [], notification: [], dlq: [], other: [] };
  for (const [key, value] of Object.entries(props)) {
    if (!KAFKA_TOPIC_KEY_RE.test(key) || isPlaceholder(value)) continue;
    const values = value.split(',')
      .map((v) => v.trim())
      .filter((v) => v && !v.startsWith('${') && !NON_TOPIC_VALUE_RE.test(v));
    if (!values.length) continue;
    let bucket = 'other';
    // Orden de prioridad: dlq/notification son mas especificos que input/output
    // y deben evaluarse antes. consumer./producer. es una segunda convencion
    // real del stack (dominio sva-anticipo) ademas de topic.input/output.
    if (/dlq|dlt/i.test(key)) bucket = 'dlq';
    else if (/notification/i.test(key)) bucket = 'notification';
    else if (/input|consumer/i.test(key)) bucket = 'input';
    else if (/output|producer/i.test(key)) bucket = 'output';
    for (const v of values) {
      if (!topics[bucket].includes(v)) topics[bucket].push(v);
    }
  }
  return topics;
}

function extractDatabase(props) {
  let hasDatabase = false;
  let schema = null;
  for (const [key, value] of Object.entries(props)) {
    if (DATASOURCE_KEY_RE.test(key)) {
      hasDatabase = true;
      if (SCHEMA_KEY_RE.test(key) && !isPlaceholder(value)) schema = value;
    }
  }
  return hasDatabase ? { hasDatabase: true, schema } : { hasDatabase: false, schema: null };
}

function extractExternalApis(props) {
  const apis = [];
  for (const [key] of Object.entries(props)) {
    if (EXTERNAL_API_KEY_RE.test(key)) {
      const label = key.replace(/\.(url|uri|host|wsdl-url)$/i, '');
      if (!apis.includes(label)) apis.push(label);
    }
  }
  return apis;
}

function extractGroupId(props) {
  for (const [key, value] of Object.entries(props)) {
    if (GROUP_ID_KEY_RE.test(key) && !isPlaceholder(value)) return value;
  }
  return null;
}

/**
 * @param {string} sourceDir - ruta al repo de config server clonado localmente
 * @returns {{components: object[], skipped: string[]}}
 */
function scan(sourceDir) {
  if (!fs.existsSync(sourceDir)) {
    throw new Error(`spring-config-server: directorio no encontrado: ${sourceDir}`);
  }
  const files = fs.readdirSync(sourceDir).filter((f) => f.endsWith('.properties'));
  const groups = new Map();

  for (const file of files) {
    if (file === 'application.properties' || file.startsWith('application-')) continue;
    const { base } = baseNameOf(file);
    if (!groups.has(base)) groups.set(base, []);
    groups.get(base).push(file);
  }

  const components = [];
  for (const [componentId, envFiles] of groups) {
    // Cada archivo de ambiente se extrae por separado y se UNEN los resultados.
    // Un merge plano de props (Object.assign) pierde valores: si "local" y
    // "develop" declaran topics distintos bajo la misma clave, el ultimo
    // archivo leido pisa al anterior y ese topic real desaparece del scan.
    const envs = [];
    const topicsUnion = { input: [], output: [], notification: [], dlq: [], other: [] };
    let groupId = null;
    let hasDatabase = false;
    let schema = null;
    const apisUnion = [];

    for (const file of envFiles) {
      const { env } = baseNameOf(file);
      envs.push(env);
      const text = fs.readFileSync(path.join(sourceDir, file), 'utf8');
      const props = parseProperties(text);

      const topics = extractTopics(props);
      for (const bucket of Object.keys(topicsUnion)) {
        for (const v of topics[bucket]) {
          if (!topicsUnion[bucket].includes(v)) topicsUnion[bucket].push(v);
        }
      }

      if (!groupId) groupId = extractGroupId(props);

      const db = extractDatabase(props);
      if (db.hasDatabase) hasDatabase = true;
      if (!schema && db.schema) schema = db.schema;

      for (const api of extractExternalApis(props)) {
        if (!apisUnion.includes(api)) apisUnion.push(api);
      }
    }

    components.push({
      id: componentId,
      type: typeOf(componentId),
      domain: domainOf(componentId),
      source: 'spring-config-server',
      envs: envs.sort(),
      topics: topicsUnion,
      groupId,
      database: { hasDatabase, schema },
      externalApis: apisUnion,
    });
  }

  components.sort((a, b) => a.id.localeCompare(b.id));
  return { components, skipped: ['application.properties'] };
}

module.exports = {
  scan,
  baseNameOf,
  typeOf,
  domainOf,
  parseProperties,
  extractTopics,
  extractDatabase,
  extractExternalApis,
  extractGroupId,
  isPlaceholder,
};
