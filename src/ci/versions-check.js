'use strict';

/**
 * Gate de version unica: el ecosistema anterior declaraba Spring Boot
 * 3.5.11 en 7 archivos y 3.5.14 en workflows/fase_spec.md — nadie lo notaba
 * porque ninguna herramienta comparaba los archivos entre si. Esto escanea
 * todo el corpus y falla si una misma libreria tiene mas de un valor
 * declarado.
 */

const fs = require('fs');
const path = require('path');
const { listFiles } = require('../lib/fs-utils');
const paths = require('../lib/paths');

const LIBRARIES = ['Spring Boot', 'Spring Cloud', 'Java', 'Gradle', 'springdoc-openapi', 'Resilience4j', 'JUnit'];
const VERSION_RE = new RegExp(`(${LIBRARIES.join('|')})\\s+(v?\\d[\\w.]*)`, 'g');

// Escape hatch: un componente puede correr deliberadamente un sub-stack
// distinto del principal (ej. el BFF de microfrontends en Java 17/Spring
// Boot 3.3.5, mas liviano que el backend en Java 21/3.5.14 — verificado
// contra el skill original, no es drift). Un archivo con este marcador
// (en cualquier parte, HTML comment) se excluye del escaneo — debe ir
// acompañado de una nota visible explicando POR QUE es un sub-stack real.
const EXEMPT_MARKER = /<!--\s*versions-check:ignore\s*-->/;

function scanCorpus() {
  const dirs = [paths.KNOWLEDGE_DIR, path.join(paths.REPO_ROOT, 'templates')];
  const found = new Map(); // libreria -> Map<version, Set<file>>
  const exempted = [];
  for (const dir of dirs) {
    for (const file of listFiles(dir, { recursive: true, filter: (f) => f.endsWith('.md') })) {
      const text = fs.readFileSync(file, 'utf8');
      const rel = path.relative(paths.REPO_ROOT, file);
      if (EXEMPT_MARKER.test(text)) {
        exempted.push(rel);
        continue;
      }
      let match;
      VERSION_RE.lastIndex = 0;
      while ((match = VERSION_RE.exec(text))) {
        const [, lib, version] = match;
        if (!found.has(lib)) found.set(lib, new Map());
        const versions = found.get(lib);
        if (!versions.has(version)) versions.set(version, new Set());
        versions.get(version).add(rel);
      }
    }
  }
  return { found, exempted };
}

function run() {
  const { found, exempted } = scanCorpus();
  const conflicts = [...found.entries()].filter(([, versions]) => versions.size > 1);

  console.log(`Librerias con version declarada: ${found.size}`);
  if (exempted.length) console.log(`Archivos exentos (sub-stack documentado): ${exempted.join(', ')}`);
  if (conflicts.length) {
    console.error(`\nFALLAS: ${conflicts.length} libreria(s) con versiones inconsistentes:`);
    for (const [lib, versions] of conflicts) {
      console.error(`  - ${lib}:`);
      for (const [version, fileSet] of versions) {
        console.error(`      ${version} -> ${[...fileSet].join(', ')}`);
      }
    }
    process.exitCode = 1;
    return false;
  }
  console.log('OK');
  return true;
}

if (require.main === module) run();
module.exports = { run, scanCorpus };
