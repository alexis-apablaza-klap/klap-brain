'use strict';

const path = require('path');
const { spawnSync } = require('child_process');
const paths = require('../lib/paths');
const configCmd = require('./config');
const { buildGraph } = require('../model/topology');
const { loadMemoryIndex } = require('../model/memory');
const project = require('../neo4j/project');

const COMPOSE_FILE = path.join(paths.REPO_ROOT, 'docker-compose.yml');

function requirePassword(config) {
  const password = process.env.NEO4J_PASSWORD || config.password;
  if (!password) {
    console.error('Falta password de Neo4j. Define NEO4J_PASSWORD o corre: klap config set --password <valor>');
    process.exit(1);
  }
  return password;
}

function dockerCompose(args, envExtra = {}) {
  const result = spawnSync('docker', ['compose', '-f', COMPOSE_FILE, ...args], {
    cwd: paths.REPO_ROOT,
    stdio: 'inherit',
    env: { ...process.env, ...envExtra },
  });
  return result.status ?? 0;
}

async function run(args) {
  const [sub, ...rest] = args;
  const config = configCmd.load();

  if (sub === 'up' || sub === 'down' || sub === 'restart') {
    const password = sub === 'down' ? (process.env.NEO4J_PASSWORD || config.password || 'unused') : requirePassword(config);
    const envExtra = {
      NEO4J_PASSWORD: password,
      NEO4J_USER: config.user,
      NEO4J_HTTP_PORT: String(config.httpPort),
      NEO4J_BOLT_PORT: String(config.boltPort),
    };
    const code = dockerCompose([sub === 'restart' ? 'restart' : sub, ...(sub === 'up' ? ['-d'] : [])], envExtra);
    process.exitCode = code;
    return;
  }

  if (sub === 'status') {
    process.exitCode = dockerCompose(['ps']);
    return;
  }

  if (sub === 'logs') {
    process.exitCode = dockerCompose(['logs', '-f', '--tail', '100']);
    return;
  }

  if (sub === 'browser') {
    const url = `http://${config.host}:${config.httpPort}`;
    const opener = process.platform === 'win32' ? 'start' : process.platform === 'darwin' ? 'open' : 'xdg-open';
    spawnSync(opener, process.platform === 'win32' ? ['', url] : [url], { shell: process.platform === 'win32' });
    console.log(`Abriendo ${url}`);
    return;
  }

  if (sub === 'build') {
    const password = requirePassword(config);
    const graph = buildGraph();
    const memoryIndex = loadMemoryIndex();
    const projConfig = { ...config, password };
    try {
      await project.build(projConfig, graph, memoryIndex, { log: console.log });
    } catch (err) {
      console.error(`Error proyectando a Neo4j: ${err.message}`);
      process.exitCode = 1;
    }
    return;
  }

  console.error('Uso: klap graph <up|down|restart|status|logs|browser|build>');
  process.exitCode = 1;
}

module.exports = { run };
