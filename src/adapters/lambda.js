'use strict';

/**
 * Adaptador de topologia para AWS Lambda (prefijo `lbd-`). A diferencia de
 * los microservicios Spring, la config no es declarativa en un solo lugar:
 * el runtime, la region y los endpoints HTTP salen de serverless.yml/
 * template.yaml, pero las dependencias reales (BD, Kafka, APIs externas)
 * suelen resolverse via Secrets Manager en tiempo de ejecucion y solo son
 * visibles por el CODIGO que las usa.
 *
 * Por eso este adaptador marca sus hallazgos con confidence:
 *   - "declared"  -> viene de serverless.yml/template.yaml, fuente exacta
 *   - "heuristic" -> viene de un grep sobre el codigo fuente, puede tener
 *                    falsos negativos (secreto inyectado en runtime) o
 *                    positivos (import sin uso real). No se inventan
 *                    nombres de topico/tabla: solo se declara presencia.
 */

const fs = require('fs');
const path = require('path');
const yamlLite = require('../lib/yaml-lite');

const SRC_EXT_RE = /\.(ts|js)$/;
const DB_SIGNATURES = [
  { pattern: /from\s+['"]pg['"]|require\(['"]pg['"]\)/, label: 'postgresql (pg)' },
  { pattern: /from\s+['"]mysql2?['"]|require\(['"]mysql2?['"]\)/, label: 'mysql' },
  { pattern: /DynamoDB|dynamodb/i, label: 'dynamodb' },
  { pattern: /mongodb|Mongoose/i, label: 'mongodb' },
];
const KAFKA_SIGNATURE_RE = /kafkajs|sasl\.jaas|KafkaProducer|KafkaConsumer/i;
const URL_LITERAL_RE = /https?:\/\/([a-zA-Z0-9.-]+)[^\s'"`]*/g;
const IGNORED_HOSTS = /^(localhost|127\.0\.0\.1|example\.com|schemas\.|www\.w3\.org)/i;

function findManifest(repoPath) {
  for (const name of ['serverless.yml', 'serverless.yaml', 'template.yaml', 'template.yml']) {
    const full = path.join(repoPath, name);
    if (fs.existsSync(full)) return full;
  }
  return null;
}

function walkSourceFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkSourceFiles(full, out);
    else if (SRC_EXT_RE.test(entry.name)) out.push(full);
  }
  return out;
}

function extractHttpEndpoints(manifest) {
  const endpoints = [];
  const functions = manifest.functions || {};
  for (const [fnName, fn] of Object.entries(functions)) {
    const events = Array.isArray(fn.events) ? fn.events : [];
    for (const event of events) {
      if (event && event.http) {
        endpoints.push({ function: fnName, method: event.http.method, path: event.http.path });
      }
    }
  }
  return endpoints;
}

function scanSourceHeuristics(repoPath) {
  const files = walkSourceFiles(path.join(repoPath, 'src'));
  const databases = new Set();
  let usesKafka = false;
  const hosts = new Set();

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    for (const sig of DB_SIGNATURES) {
      if (sig.pattern.test(text)) databases.add(sig.label);
    }
    if (KAFKA_SIGNATURE_RE.test(text)) usesKafka = true;
    let match;
    URL_LITERAL_RE.lastIndex = 0;
    while ((match = URL_LITERAL_RE.exec(text))) {
      const host = match[1];
      if (!IGNORED_HOSTS.test(host)) hosts.add(host);
    }
  }

  return {
    databases: [...databases],
    usesKafka,
    externalHosts: [...hosts],
    filesScanned: files.length,
  };
}

/**
 * @param {string} repoPath - raiz de un repo lambda individual
 */
function scan(repoPath) {
  const manifestPath = findManifest(repoPath);
  const componentId = path.basename(repoPath);

  let declared = { service: componentId, runtime: null, region: null, httpEndpoints: [] };
  if (manifestPath) {
    const text = fs.readFileSync(manifestPath, 'utf8');
    const manifest = yamlLite.parse(text);
    declared = {
      service: manifest.service || componentId,
      runtime: manifest.provider && manifest.provider.runtime,
      region: manifest.provider && manifest.provider.region,
      httpEndpoints: extractHttpEndpoints(manifest),
    };
  }

  const heuristics = scanSourceHeuristics(repoPath);

  return {
    components: [{
      id: componentId,
      type: 'lbd',
      domain: componentId.split('-')[1] || 'unknown',
      source: 'lambda',
      manifest: manifestPath ? path.basename(manifestPath) : null,
      declared,
      database: {
        hasDatabase: heuristics.databases.length > 0,
        schema: null,
        engines: heuristics.databases,
        confidence: 'heuristic',
      },
      topics: { input: [], output: [], notification: [], dlq: [], other: [] },
      usesKafka: heuristics.usesKafka,
      externalApis: heuristics.externalHosts,
      externalApisConfidence: 'heuristic',
      notes: manifestPath
        ? []
        : ['Sin serverless.yml/template.yaml — solo se aplico heuristica sobre el codigo fuente'],
    }],
    skipped: [],
  };
}

module.exports = { scan, findManifest, scanSourceHeuristics };
