'use strict';

/**
 * Extrae versiones reales de un repo npm (mcf-/lbd-). `package.json` ya es
 * JSON valido -- no hace falta regex. El runtime Node de un Lambda no tiene
 * un campo unico y confiable: se prefiere `engines.node` cuando existe: si
 * no, `@types/node` como proxy (verificado contra
 * ABONO-YA/lbd-sva-trx-summary-anticipo: sin `engines`, con
 * `@types/node: ^20.12.12` y `--target=node20` solo dentro del string del
 * script de esbuild, no parseable con confianza).
 */

const fs = require('fs');
const path = require('path');

function stripRangePrefix(v) {
  return v ? String(v).replace(/^[\^~v]/, '') : v;
}

function scan(repoPath) {
  const pkgPath = path.join(repoPath, 'package.json');
  if (!fs.existsSync(pkgPath)) return null;

  let pkg;
  try {
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  } catch {
    return null;
  }

  const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
  const versions = {};

  if (deps['@angular/core']) versions['Angular'] = stripRangePrefix(deps['@angular/core']);
  if (deps['typescript']) versions['TypeScript'] = stripRangePrefix(deps['typescript']);
  if (deps['@types/node']) versions['Node'] = stripRangePrefix(deps['@types/node']);
  if (pkg.engines && pkg.engines.node) versions['Node'] = stripRangePrefix(pkg.engines.node);

  return versions;
}

module.exports = { scan };
