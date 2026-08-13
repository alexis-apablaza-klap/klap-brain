'use strict';

const fs = require('fs');
const { spawnSync } = require('child_process');
const path = require('path');
const { readJson, removeRecursive } = require('../lib/fs-utils');
const paths = require('../lib/paths');
const { MANIFEST_PATH } = require('./install');

const COMPOSE_FILE = path.join(paths.REPO_ROOT, 'docker-compose.yml');

function run(args) {
  const keepData = args.includes('--keep-data');
  const manifest = readJson(MANIFEST_PATH, { paths: [] });

  for (const p of manifest.paths || []) {
    removeRecursive(p);
    console.log(`Eliminado: ${p}`);
  }
  removeRecursive(MANIFEST_PATH);

  if (fs.existsSync(COMPOSE_FILE)) {
    const downArgs = ['compose', '-f', COMPOSE_FILE, 'down'];
    if (!keepData) downArgs.push('-v');
    spawnSync('docker', downArgs, { cwd: paths.REPO_ROOT, stdio: 'inherit', env: { ...process.env, NEO4J_PASSWORD: process.env.NEO4J_PASSWORD || 'unused' } });
  }

  console.log(keepData ? 'Rollback completo (volumenes de Neo4j conservados).' : 'Rollback completo (volumenes de Neo4j eliminados).');
}

module.exports = { run };
