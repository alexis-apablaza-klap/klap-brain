'use strict';

/**
 * Adaptador de topologia para microservicios Spring Boot que corren en
 * ECS Fargate (no usan el config-server compartido: la config vive en el
 * propio repo, en src/main/resources/application*.{properties,yml}).
 *
 * Reusa los mismos extractores de topics/datasource/APIs que
 * spring-config-server: la unica diferencia real es de donde vienen las
 * claves (properties planas vs. YAML anidado, que aca se aplana primero).
 */

const fs = require('fs');
const path = require('path');
const yamlLite = require('../lib/yaml-lite');
const {
  parseProperties,
  extractTopics,
  extractDatabase,
  extractExternalApis,
  extractGroupId,
} = require('./spring-config-server');

const RESOURCES_REL = path.join('src', 'main', 'resources');

function findConfigFiles(repoPath) {
  const dir = path.join(repoPath, RESOURCES_REL);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /^application(-[\w.]+)?\.(properties|ya?ml)$/.test(f))
    .map((f) => path.join(dir, f));
}

/**
 * Los application.yml de Spring Boot casi siempre son YAML multi-documento
 * (separados por lineas "---", un documento por perfil). yaml-lite.parse
 * no tiene concepto de stream multi-documento -- pasarle el archivo entero
 * pierde silenciosamente todos los documentos salvo el ultimo. Se separa
 * aca, a nivel de adaptador, porque es una convencion de Spring, no YAML
 * generico.
 */
function splitYamlDocuments(text) {
  return text.split(/^---[ \t]*$/m).map((doc) => doc.trim()).filter(Boolean);
}

/** @returns {object[]} un flat-props por documento (properties: un solo "documento") */
function loadFlatPropsDocs(file) {
  const text = fs.readFileSync(file, 'utf8');
  if (file.endsWith('.properties')) return [parseProperties(text)];
  return splitYamlDocuments(text).map((doc) => yamlLite.flatten(yamlLite.parse(doc)));
}

const CONFIG_SERVER_IMPORT_RE = /configserver:/i;

function importsFromConfigServer(props) {
  const value = props['spring.config.import'];
  return typeof value === 'string' && CONFIG_SERVER_IMPORT_RE.test(value);
}

function componentIdOf(repoPath) {
  const pkgJson = path.join(repoPath, 'package.json');
  const buildGradle = path.join(repoPath, 'build.gradle');
  if (fs.existsSync(buildGradle)) {
    // gradle projects casi siempre usan el nombre del directorio como artifactId
    return path.basename(repoPath);
  }
  if (fs.existsSync(pkgJson)) {
    try {
      const pkg = JSON.parse(fs.readFileSync(pkgJson, 'utf8'));
      if (pkg.name) return pkg.name;
    } catch { /* fallback abajo */ }
  }
  return path.basename(repoPath);
}

/**
 * @param {string} repoPath - raiz de un repo individual (no un directorio de multiples repos)
 */
function scan(repoPath) {
  const files = findConfigFiles(repoPath);
  if (!files.length) {
    return { components: [], skipped: [repoPath], reason: 'sin src/main/resources/application*.{properties,yml}' };
  }

  const componentId = componentIdOf(repoPath);
  const topicsUnion = { input: [], output: [], notification: [], dlq: [], other: [] };
  let groupId = null;
  let hasDatabase = false;
  let schema = null;
  const apisUnion = [];
  const envs = [];
  let delegatesToConfigServer = false;

  for (const file of files) {
    const base = path.basename(file).replace(/\.(properties|ya?ml)$/, '');
    envs.push(base === 'application' ? 'default' : base.replace(/^application-/, ''));

    for (const props of loadFlatPropsDocs(file)) {
      if (importsFromConfigServer(props)) delegatesToConfigServer = true;

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
  }

  // Este repo delega su config real al config-server compartido: sus
  // application*.yml locales no son fuente de topologia (normalmente solo
  // traen el nombre de la app y overrides de logging/JPA). Si se scannea
  // igual, un `klap scan --repos-dir` sobreescribiria en topology.json el
  // registro mucho mas completo que ya produjo spring-config-server.
  if (delegatesToConfigServer && !hasTopologySignal(topicsUnion, schema, apisUnion)) {
    return {
      components: [],
      skipped: [repoPath],
      reason: 'delega en config-server compartido (spring.config.import) y no declara topologia propia — usar spring-config-server para este componente',
    };
  }

  return {
    components: [{
      id: componentId,
      type: componentId.split('-')[0] || 'unknown',
      domain: componentId.split('-')[1] || 'unknown',
      source: 'spring-ecs',
      envs: envs.sort(),
      topics: topicsUnion,
      groupId,
      database: { hasDatabase, schema },
      externalApis: apisUnion,
      notes: delegatesToConfigServer
        ? ['Delega en config-server compartido pero declara topologia propia adicional — verificar cual es la fuente real']
        : [],
    }],
    skipped: [],
  };
}

// hasDatabase por si solo es una señal debil: cualquier tuning de Hikari
// ("connection-test-query", "maximum-pool-size") matchea /datasource/i sin
// que exista una conexion real configurada. Se exige el schema literal
// (o topics/apis) como evidencia de topologia propia real.
function hasTopologySignal(topics, schema, apis) {
  return Object.values(topics).some((arr) => arr.length) || Boolean(schema) || apis.length > 0;
}

module.exports = { scan, findConfigFiles, componentIdOf };
