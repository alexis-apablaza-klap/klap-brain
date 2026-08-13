'use strict';

/**
 * Gate anti-duplicacion: una regla global (JavaDoc obligatorio,
 * enable.metrics.push=false, cobertura 95%...) debe existir en UN solo
 * archivo. El ecosistema anterior repetia estas reglas 15-18 veces, lo que
 * diluye la atencion del modelo hasta que las reglas importantes se pierden
 * en el ruido. Deteccion: lineas de prosa (no tablas/headings/code fences)
 * de 40+ caracteres que aparecen, normalizadas, en mas de un archivo.
 */

const fs = require('fs');
const path = require('path');
const { listFiles } = require('../lib/fs-utils');
const paths = require('../lib/paths');

const MIN_LINE_LEN = 40;

function extractProseLines(text) {
  const lines = text.split(/\r?\n/);
  const out = [];
  let inFence = false;
  for (const line of lines) {
    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const trimmed = line.trim();
    if (trimmed.length < MIN_LINE_LEN) continue;
    if (trimmed.startsWith('#') || trimmed.startsWith('|') || trimmed.startsWith('>')) continue;
    out.push(trimmed.replace(/\s+/g, ' ').toLowerCase());
  }
  return out;
}

function run() {
  const files = listFiles(paths.KNOWLEDGE_DIR, { recursive: true, filter: (f) => f.endsWith('.md') });
  const lineToFiles = new Map();

  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const rel = path.relative(paths.REPO_ROOT, file);
    for (const line of extractProseLines(text)) {
      if (!lineToFiles.has(line)) lineToFiles.set(line, new Set());
      lineToFiles.get(line).add(rel);
    }
  }

  const duplicates = [...lineToFiles.entries()].filter(([, fileSet]) => fileSet.size > 1);

  console.log(`Archivos de knowledge/ inspeccionados: ${files.length}`);
  if (duplicates.length) {
    console.error(`\nFALLAS: ${duplicates.length} linea(s) de prosa repetidas en mas de un archivo:`);
    for (const [line, fileSet] of duplicates) {
      console.error(`  - "${line.slice(0, 80)}${line.length > 80 ? '...' : ''}"`);
      for (const f of fileSet) console.error(`      ${f}`);
    }
    process.exitCode = 1;
    return false;
  }
  console.log('OK');
  return true;
}

if (require.main === module) run();
module.exports = { run, extractProseLines };
