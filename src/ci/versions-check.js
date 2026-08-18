'use strict';

/**
 * Gate de cumplimiento de stack: compara la version real de cada libreria
 * gobernada (Java/Spring Boot/Gradle/Resilience4j/springdoc-openapi via
 * Gradle, Angular/TypeScript/Node via package.json) contra los pisos
 * declarados en knowledge/klap-standard/references/stack.yml, escaneando
 * repos reales -- no el corpus de knowledge/ contra si mismo (ese chequeo
 * se retiro en la auditoria 2026-08-18: era debil -- no leia tablas
 * Markdown, la mitad de las "versiones unicas" nunca se detectaban).
 * Requiere acceso local a los repos (--repos-dir=<path> o KLAP_REPOS_DIR)
 * -- sin eso se omite, mismo patron que scan-check.
 */

const fs = require('fs');
const path = require('path');
const { findGitRepos } = require('../commands/scan');
const javaScan = require('../lib/stack-scan/java');
const npmScan = require('../lib/stack-scan/npm');
const { loadBaseline, checkComponent } = require('../model/stack-baseline');

function parseArgs(args) {
  const reposDirArg = args.find((a) => a.startsWith('--repos-dir='));
  const reposDir = (reposDirArg && reposDirArg.split('=')[1]) || process.env.KLAP_REPOS_DIR;
  return { reposDir };
}

function scanRepo(repoPath) {
  const java = javaScan.scan(repoPath) || {};
  const npm = npmScan.scan(repoPath) || {};
  const merged = { ...java, ...npm };
  return Object.keys(merged).length ? merged : null;
}

function run(args = []) {
  const { reposDir } = parseArgs(args);
  if (!reposDir || !fs.existsSync(reposDir)) {
    console.log('versions-check: sin acceso local a los repos (--repos-dir=<path> o KLAP_REPOS_DIR) — se omite, no es una falla.');
    return true;
  }

  const baseline = loadBaseline();
  const repos = findGitRepos(reposDir);
  let scanned = 0;
  const allViolations = [];
  const allNotes = [];

  for (const repoPath of repos) {
    const detected = scanRepo(repoPath);
    if (!detected) continue;
    scanned++;
    const { violations, notes } = checkComponent(detected, baseline);
    for (const v of violations) allViolations.push({ repo: path.basename(repoPath), ...v });
    for (const n of notes) allNotes.push({ repo: path.basename(repoPath), ...n });
  }

  console.log(`Repos con stack detectado: ${scanned} / ${repos.length} escaneados`);

  if (allNotes.length) {
    console.log(`\nNOTAS (no bloquean CI) — por debajo del piso recomendado para proyectos nuevos:`);
    for (const n of allNotes) console.log(`  - ${n.repo}: ${n.library} ${n.found} (recomendado ${n.recommended})`);
  }

  if (allViolations.length) {
    console.error(`\nFALLAS: ${allViolations.length} incumplimiento(s) del piso obligatorio:`);
    for (const v of allViolations) console.error(`  - ${v.repo}: ${v.library} ${v.found} (minimo ${v.required})`);
    process.exitCode = 1;
    return false;
  }
  console.log('OK');
  return true;
}

if (require.main === module) run(process.argv.slice(2));
module.exports = { run, scanRepo };
