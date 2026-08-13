'use strict';

/**
 * Instala knowledge/<skill>/ como skills reales de Claude Code en
 * ~/.claude/skills/<skill>/ (con su SKILL.md + references/, formato que el
 * loader SI descubre -- a diferencia de los .md planos del ecosistema
 * anterior). Copia templates/CLAUDE.md a ~/.claude/CLAUDE.md solo si no
 * existe uno distinto (nunca pisa silenciosamente el CLAUDE.md del dev).
 *
 * Registra cada ruta instalada en un manifest para que `klap rollback`
 * pueda revertir exactamente lo que este comando puso — el ecosistema
 * anterior no lo hacia y dejaba huerfanos commands/workflows tras rollback.
 */

const fs = require('fs');
const path = require('path');
const { listFiles, copyRecursive, writeJson, readJson } = require('../lib/fs-utils');
const paths = require('../lib/paths');

const MANIFEST_PATH = path.join(paths.KLAP_DIR, 'install-manifest.json');

function installSkills(manifest) {
  if (!fs.existsSync(paths.KNOWLEDGE_DIR)) return 0;
  const skillDirs = fs.readdirSync(paths.KNOWLEDGE_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);

  for (const skill of skillDirs) {
    const src = path.join(paths.KNOWLEDGE_DIR, skill);
    const dest = path.join(paths.CLAUDE_SKILLS, skill);
    if (!fs.existsSync(path.join(src, 'SKILL.md'))) continue;
    copyRecursive(src, dest);
    manifest.paths.push(dest);
  }
  return skillDirs.length;
}

function installClaudeMd(manifest) {
  const templatePath = path.join(paths.REPO_ROOT, 'templates', 'CLAUDE.md');
  if (!fs.existsSync(templatePath)) return false;
  if (fs.existsSync(paths.CLAUDE_MD)) {
    console.log(`${paths.CLAUDE_MD} ya existe — no se sobreescribe. Compara manualmente contra ${templatePath}.`);
    return false;
  }
  fs.mkdirSync(paths.CLAUDE_DIR, { recursive: true });
  fs.copyFileSync(templatePath, paths.CLAUDE_MD);
  manifest.paths.push(paths.CLAUDE_MD);
  return true;
}

function run(_args) {
  const manifest = readJson(MANIFEST_PATH, { paths: [] });
  manifest.paths = manifest.paths || [];

  const skillCount = installSkills(manifest);
  const claudeMdInstalled = installClaudeMd(manifest);

  writeJson(MANIFEST_PATH, manifest);

  console.log(`${skillCount} skill(s) instalado(s) en ${paths.CLAUDE_SKILLS}`);
  console.log(claudeMdInstalled ? `CLAUDE.md instalado en ${paths.CLAUDE_MD}` : 'CLAUDE.md no modificado');
  console.log(`Manifest de instalacion: ${MANIFEST_PATH}`);
  return manifest;
}

module.exports = { run, MANIFEST_PATH };
