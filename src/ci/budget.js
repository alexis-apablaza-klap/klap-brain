'use strict';

/**
 * Gate de presupuesto de tokens. Sin este check el corpus vuelve a crecer
 * silenciosamente hasta parecerse al eco-team-brain original (289k tokens
 * instalados). Los limites son deliberadamente estrictos: forzar progressive
 * disclosure real (SKILL.md corto + references/ bajo demanda) en vez de
 * volcar todo el conocimiento en un solo archivo.
 */

const fs = require('fs');
const path = require('path');
const { listFiles } = require('../lib/fs-utils');
const frontmatter = require('../lib/frontmatter');
const paths = require('../lib/paths');

const MAX_DESCRIPTION_CHARS = 200;
const MAX_SKILL_LINES = 200;
const CORPUS_CEILING_BYTES = 400 * 1024; // ~100k tokens, objetivo del plan: 270-300 KB

function checkSkillFiles() {
  const errors = [];
  const skillFiles = listFiles(paths.KNOWLEDGE_DIR, {
    recursive: true,
    filter: (full) => path.basename(full) === 'SKILL.md',
  });
  for (const file of skillFiles) {
    const text = fs.readFileSync(file, 'utf8');
    const { data, content } = frontmatter.parse(text);
    const rel = path.relative(paths.REPO_ROOT, file);
    const lineCount = content.split(/\r?\n/).length;
    if (lineCount > MAX_SKILL_LINES) {
      errors.push(`${rel}: ${lineCount} lineas (> ${MAX_SKILL_LINES}) — mover detalle a references/`);
    }
    if (data.description && data.description.length > MAX_DESCRIPTION_CHARS) {
      errors.push(`${rel}: description de ${data.description.length} chars (> ${MAX_DESCRIPTION_CHARS})`);
    }
    if (!data.name || !data.description) {
      errors.push(`${rel}: falta frontmatter name/description — Claude Code no puede descubrirlo como skill`);
    }
  }
  return { errors, skillCount: skillFiles.length };
}

function corpusSize() {
  const dirs = [paths.KNOWLEDGE_DIR, paths.MEMORY_DIR, path.join(paths.REPO_ROOT, 'templates')];
  let total = 0;
  for (const dir of dirs) {
    for (const file of listFiles(dir, { recursive: true })) {
      total += fs.statSync(file).size;
    }
  }
  return total;
}

function run() {
  const { errors, skillCount } = checkSkillFiles();
  const size = corpusSize();
  const sizeKb = (size / 1024).toFixed(1);
  const ceilingKb = (CORPUS_CEILING_BYTES / 1024).toFixed(0);

  console.log(`Skills: ${skillCount}`);
  console.log(`Corpus (knowledge/ + memory/ + templates/): ${sizeKb} KB / ${ceilingKb} KB`);

  if (size > CORPUS_CEILING_BYTES) {
    errors.push(`Corpus de ${sizeKb} KB excede el techo de ${ceilingKb} KB`);
  }

  if (errors.length) {
    console.error('\nFALLAS:');
    for (const e of errors) console.error(`  - ${e}`);
    process.exitCode = 1;
    return false;
  }
  console.log('OK');
  return true;
}

if (require.main === module) run();
module.exports = { run, checkSkillFiles, corpusSize };
