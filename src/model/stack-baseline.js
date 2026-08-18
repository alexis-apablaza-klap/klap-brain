'use strict';

/**
 * Capa de politica de stack: lee knowledge/klap-standard/references/stack.yml
 * (piso "required" bloqueante + piso "recommended" informativo, ambos pisos
 * abiertos -- ver src/lib/semver-lite.js) y lo compara contra las versiones
 * reales detectadas en un repo (src/lib/stack-scan/*). Una libreria de la
 * base ausente en el repo, o viceversa, no es una falla -- solo se compara
 * la interseccion (decision 2026-08-18).
 */

const fs = require('fs');
const yamlLite = require('../lib/yaml-lite');
const semver = require('./../lib/semver-lite');
const paths = require('../lib/paths');

function loadBaseline(stackYmlPath = paths.STACK_YML) {
  if (!fs.existsSync(stackYmlPath)) return { libraries: [] };
  const parsed = yamlLite.parse(fs.readFileSync(stackYmlPath, 'utf8'));
  return { libraries: parsed.libraries || [] };
}

/** Para libraries con `conditional`, elige la primera entrada cuyo `when` aplique (o la que no tiene `when`, como default). */
function resolveRule(lib, detectedVersions) {
  if (!lib.conditional) return lib;
  for (const entry of lib.conditional) {
    if (!entry.when) return entry;
    const refVersion = detectedVersions[entry.when.library];
    if (!refVersion) continue;
    const parsed = semver.parseVersion(refVersion);
    if (parsed && parsed.major >= entry.when.majorAtLeast) return entry;
  }
  return null;
}

function checkComponent(detectedVersions, baseline) {
  const violations = [];
  const notes = [];

  for (const lib of baseline.libraries) {
    const found = detectedVersions[lib.name];
    if (!found) continue; // el repo no usa esta libreria -- ok

    const rule = resolveRule(lib, detectedVersions);
    if (!rule) continue; // ninguna condicion del `conditional` aplico a este repo

    if (rule.required) {
      const ok = semver.meetsFloor(found, rule.required);
      if (ok === false) violations.push({ library: lib.name, found, required: rule.required });
    }
    if (rule.recommended) {
      const ok = semver.meetsFloor(found, rule.recommended);
      if (ok === false) notes.push({ library: lib.name, found, recommended: rule.recommended });
    }
  }

  return { violations, notes };
}

module.exports = { loadBaseline, resolveRule, checkComponent };
