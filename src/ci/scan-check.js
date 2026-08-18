'use strict';

/**
 * Gate de drift: compara topology/topology.json (componentes con
 * source=repo-docs-properties) contra un re-scan en vivo de los repos SVA
 * locales -- lee `docs/*.properties` DENTRO de cada repo, no el
 * config-server compartido completo.
 *
 * Decision 2026-08-18: el config-server compartido tiene 200+ componentes
 * de otros equipos que cambian a diario -- escanearlo "a cada rato" traia
 * ruido ajeno constante. El config-server sigue siendo la fuente real para
 * que un servicio levante (eso no cambia), pero para *topologia* la fuente
 * pasa a ser la copia en `docs/` de cada repo SVA, mantenida a mano por
 * quien toca el config-server para ese componente.
 *
 * Requiere acceso local a los repos (--repos-dir=<path> o KLAP_REPOS_DIR)
 * -- sin eso se omite, mismo patron que versions-check. Mientras ningun
 * repo real tenga `docs/*.properties` todavia, este gate no encuentra
 * nada que comparar y pasa en verde sin mas (no es una falla).
 */

const fs = require('fs');
const path = require('path');
const paths = require('../lib/paths');
const { findGitRepos } = require('../commands/scan');
const propertiesDocs = require('../adapters/spring-properties-docs');

function parseArgs(args) {
  const reposDirArg = args.find((a) => a.startsWith('--repos-dir='));
  const reposDir = (reposDirArg && reposDirArg.split('=')[1]) || process.env.KLAP_REPOS_DIR;
  return { reposDir };
}

function run(args = []) {
  const { reposDir } = parseArgs(args);
  if (!reposDir || !fs.existsSync(reposDir)) {
    console.log('scan-check: sin acceso local a los repos (--repos-dir=<path> o KLAP_REPOS_DIR) — se omite, no es una falla.');
    return true;
  }
  if (!fs.existsSync(paths.TOPOLOGY_JSON)) {
    console.log(`Sin ${paths.TOPOLOGY_JSON} todavia — nada que comparar.`);
    return true;
  }

  const committed = JSON.parse(fs.readFileSync(paths.TOPOLOGY_JSON, 'utf8'));
  const committedFromDocs = (committed.components || []).filter((c) => c.source === 'repo-docs-properties');

  const repos = findGitRepos(reposDir);
  const fresh = [];
  for (const repoPath of repos) {
    const { components } = propertiesDocs.scan(repoPath);
    fresh.push(...components);
  }

  const committedIds = new Set(committedFromDocs.map((c) => c.id));
  const freshIds = new Set(fresh.map((c) => c.id));
  const missing = [...freshIds].filter((id) => !committedIds.has(id));
  const stale = [...committedIds].filter((id) => !freshIds.has(id));

  console.log(`Repos escaneados: ${repos.length}  ·  con docs/*.properties: ${fresh.length}`);
  console.log(`Componentes en topology.json (source=repo-docs-properties): ${committedIds.size}`);

  if (missing.length || stale.length) {
    console.error('\nFALLAS: topology.json esta desfasado — correr "klap scan --repos-dir <...>" de nuevo.');
    if (missing.length) console.error(`  Faltan (nuevos, con docs/ pero no committeados): ${missing.join(', ')}`);
    if (stale.length) console.error(`  Sobran (committeados pero ya sin docs/*.properties): ${stale.join(', ')}`);
    process.exitCode = 1;
    return false;
  }
  console.log('OK');
  return true;
}

if (require.main === module) run(process.argv.slice(2));
module.exports = { run };
