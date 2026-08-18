'use strict';

const fs = require('fs');
const path = require('path');
const { writeJson, readJson } = require('../lib/fs-utils');
const paths = require('../lib/paths');

const springConfigServer = require('../adapters/spring-config-server');
const springPropertiesDocs = require('../adapters/spring-properties-docs');
const springEcs = require('../adapters/spring-ecs');
const lambda = require('../adapters/lambda');
const angularMfe = require('../adapters/angular-mfe');

function parseArgs(args) {
  const out = { repos: [], fresh: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--config-server') out.configServer = args[++i];
    else if (a === '--repo') out.repos.push(args[++i]);
    else if (a === '--repos-dir') out.reposDir = args[++i];
    else if (a === '--fresh') out.fresh = true;
    else if (a === '--out') out.out = args[++i];
  }
  return out;
}

function findGitRepos(rootDir, maxDepth = 2) {
  const found = [];
  function walk(dir, depth) {
    if (depth > maxDepth) return;
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    if (entries.some((e) => e.isDirectory() && e.name === '.git')) {
      found.push(dir);
      return; // no descender dentro de un repo ya identificado
    }
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      walk(path.join(dir, entry.name), depth + 1);
    }
  }
  walk(rootDir, 0);
  return found;
}

function detectAdapter(repoPath) {
  if (fs.existsSync(path.join(repoPath, 'docs')) &&
    fs.readdirSync(path.join(repoPath, 'docs')).some((f) => f.endsWith('.properties'))) {
    return springPropertiesDocs;
  }
  if (fs.existsSync(path.join(repoPath, 'src', 'environments'))) return angularMfe;
  if (
    fs.existsSync(path.join(repoPath, 'serverless.yml')) ||
    fs.existsSync(path.join(repoPath, 'serverless.yaml')) ||
    fs.existsSync(path.join(repoPath, 'template.yaml')) ||
    path.basename(repoPath).startsWith('lbd-')
  ) return lambda;
  if (fs.existsSync(path.join(repoPath, 'src', 'main', 'resources'))) return springEcs;
  return null;
}

function mergeComponents(existing, incoming, sourceLabel, warnings) {
  const byId = new Map(existing.map((c) => [c.id, c]));
  for (const comp of incoming) {
    if (byId.has(comp.id) && byId.get(comp.id).source !== comp.source) {
      warnings.push(`Componente "${comp.id}" ya existia (source=${byId.get(comp.id).source}), sobreescrito por ${sourceLabel} (source=${comp.source})`);
    }
    byId.set(comp.id, comp);
  }
  return [...byId.values()].sort((a, b) => a.id.localeCompare(b.id));
}

function run(args) {
  const opts = parseArgs(args);
  const outPath = opts.out || paths.TOPOLOGY_JSON;
  const existing = opts.fresh ? { components: [], sources: [] } : (readJson(outPath) || { components: [], sources: [] });

  let components = existing.components || [];
  const sources = [];
  const warnings = [];

  if (opts.configServer) {
    const { components: found } = springConfigServer.scan(opts.configServer);
    components = mergeComponents(components, found, 'spring-config-server', warnings);
    sources.push({ adapter: 'spring-config-server', path: opts.configServer, componentCount: found.length });
    console.log(`spring-config-server: ${found.length} componentes desde ${opts.configServer}`);
  }

  const reposToScan = [...opts.repos];
  if (opts.reposDir) {
    const found = findGitRepos(opts.reposDir).filter((p) => path.resolve(p) !== path.resolve(process.cwd()));
    reposToScan.push(...found);
  }

  let scannedRepos = 0;
  let skippedRepos = 0;
  for (const repoPath of reposToScan) {
    const adapter = detectAdapter(repoPath);
    if (!adapter) {
      skippedRepos++;
      continue;
    }
    const result = adapter.scan(repoPath);
    if (result.components.length) {
      components = mergeComponents(components, result.components, path.basename(repoPath), warnings);
      scannedRepos++;
    } else {
      skippedRepos++;
    }
  }
  if (reposToScan.length) {
    sources.push({ adapter: 'repo-scan', reposScanned: scannedRepos, reposSkipped: skippedRepos });
    console.log(`repo-scan: ${scannedRepos} repos con topologia extraida, ${skippedRepos} sin adaptador aplicable`);
  }

  for (const w of warnings) console.warn(`⚠ ${w}`);

  const output = {
    generatedAt: new Date().toISOString(),
    sources: [...(opts.fresh ? [] : existing.sources || []), ...sources],
    components,
  };
  writeJson(outPath, output);
  console.log(`\n${components.length} componentes totales -> ${outPath}`);
  return output;
}

module.exports = { run, findGitRepos, detectAdapter };
