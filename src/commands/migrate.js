'use strict';

/**
 * Migracion asistida desde eco-team-brain (clean-slate, no drop-in).
 *
 * 1) Rescata la memoria funcional REAL del grafo viejo (Decision/Fix/
 *    Pattern/Convention/Developer/Service/Bug/Project/reference) y la
 *    escribe como memory/<slug>.md. Descarta explicitamente los 14
 *    entityTypes de "Standard" (Standard/Stack/Dependencies/Architecture/
 *    Principles/PackageStructure/KafkaConfig/KafkaTopics/Database/
 *    NamingConventions/LoggingConventions/BestPractices/AntiPatterns/
 *    CodeTemplate) mas Organization/Topic — esos pasan a knowledge/ como
 *    skills versionados, no como memoria dinamica.
 *
 * 2) --clean-legacy limpia ~/.claude/skills/*.md sueltos (formato viejo,
 *    no descubrible por Claude Code), ~/.claude/commands/ completo y
 *    ~/.claude/workflows/ completo (klap-brain no instala nada en ninguno de
 *    los dos -- son integramente la huella del ecosistema anterior, que
 *    copiaba commands/+workflows/ recursivamente. Barrer solo _v1/simulacion_*
 *    en workflows/ dejaba vivos sdd-impl-spec.js/sdd-impl-spec-refactor.js:
 *    aparecian como skills invocables con rutas rotas a ~/.claude/commands/,
 *    que install.js nunca puebla).
 *    Dry-run por defecto: solo con --yes borra de verdad, porque toca
 *    ~/.claude compartido por todos los proyectos del dev, no solo este repo.
 */

const fs = require('fs');
const path = require('path');
const { readJson, writeText } = require('../lib/fs-utils');
const paths = require('../lib/paths');
const { loadMemoryIndex, writeIndex } = require('../model/memory');

const STANDARD_ENTITY_TYPES = new Set([
  'Standard', 'Stack', 'Dependencies', 'Architecture', 'Principles', 'PackageStructure',
  'KafkaConfig', 'KafkaTopics', 'Database', 'NamingConventions', 'LoggingConventions',
  'BestPractices', 'AntiPatterns', 'CodeTemplate', 'Organization', 'Topic',
]);

const TYPE_MAP = {
  Decision: 'decision', Fix: 'fix', Bug: 'incident', Convention: 'rule',
  Pattern: 'rule', Service: 'note', Developer: 'note', Project: 'note', reference: 'note', Reference: 'note',
};

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

function findLegacyExport(explicitPath) {
  if (explicitPath) return explicitPath;
  const guess = path.join(paths.REPO_ROOT, '..', 'eco-team-brain', 'teambrain-pre-migrate.json');
  return fs.existsSync(guess) ? guess : null;
}

function migrateMemory(exportPath) {
  const data = readJson(exportPath);
  const entities = data.entities || data.nodes || [];
  const migrated = [];
  const skipped = [];

  for (const raw of entities) {
    const entity = raw.props || raw;
    const entityType = entity.entityType || raw.entityType;
    if (STANDARD_ENTITY_TYPES.has(entityType)) {
      skipped.push({ name: entity.name, entityType });
      continue;
    }
    const type = TYPE_MAP[entityType] || 'note';
    const slug = `legacy-${slugify(entity.name || 'sin-nombre')}`;
    const observations = Array.isArray(entity.observations) ? entity.observations : [];
    const body = [
      observations.length ? observations.map((o) => `- ${o}`).join('\n') : '(sin observaciones en el export original)',
      '',
      `<!-- TODO: asignar product/components reales — migrado desde eco-team-brain sin ese contexto. entityType original: ${entityType} -->`,
    ].join('\n');
    const frontmatterText = [
      '---',
      `type: ${type}`,
      `date: ${entity.createdAt ? String(entity.createdAt).slice(0, 10) : new Date().toISOString().slice(0, 10)}`,
      `tags: [migrado-legacy]`,
      '---',
      body,
      '',
    ].join('\n');
    const file = path.join(paths.MEMORY_DIR, `${slug}.md`);
    writeText(file, frontmatterText);
    migrated.push({ slug, name: entity.name, entityType, type });
  }

  return { migrated, skipped };
}

function findLegacyClaudeArtifacts() {
  const flatSkills = fs.existsSync(paths.CLAUDE_SKILLS)
    ? fs.readdirSync(paths.CLAUDE_SKILLS)
      .filter((f) => f.endsWith('.md'))
      .map((f) => path.join(paths.CLAUDE_SKILLS, f))
    : [];
  // klap-brain nunca escribe en ~/.claude/commands/ (install.js solo toca
  // CLAUDE_SKILLS + CLAUDE_MD) -- todo lo que hay ahi es huella del
  // ecosistema anterior, se limpia completo.
  const legacyCommands = fs.existsSync(paths.CLAUDE_COMMANDS)
    ? fs.readdirSync(paths.CLAUDE_COMMANDS).map((f) => path.join(paths.CLAUDE_COMMANDS, f))
    : [];
  // klap-brain tampoco escribe en ~/.claude/workflows/ -- se limpia completo,
  // no solo los _v1/simulacion_* (ver comentario de cabecera).
  const legacyWorkflows = fs.existsSync(paths.CLAUDE_WORKFLOWS)
    ? fs.readdirSync(paths.CLAUDE_WORKFLOWS).map((f) => path.join(paths.CLAUDE_WORKFLOWS, f))
    : [];
  return [...flatSkills, ...legacyCommands, ...legacyWorkflows];
}

function run(args) {
  const exportFlagIdx = args.indexOf('--export');
  const exportPath = findLegacyExport(exportFlagIdx !== -1 ? args[exportFlagIdx + 1] : null);
  const cleanLegacy = args.includes('--clean-legacy');
  const confirmed = args.includes('--yes');

  if (exportPath) {
    console.log(`Migrando memoria funcional desde ${exportPath} ...`);
    const { migrated, skipped } = migrateMemory(exportPath);
    console.log(`\n${migrated.length} memoria(s) migrada(s):`);
    for (const m of migrated) console.log(`  - ${m.slug}  (${m.entityType} -> type:${m.type})`);
    console.log(`\n${skipped.length} nodo(s) de Standard descartados (pasan a knowledge/, no a memoria):`);
    for (const s of skipped) console.log(`  - ${s.name} (${s.entityType})`);
    if (migrated.length) writeIndex(loadMemoryIndex());
    console.log('\nRevisa cada memory/legacy-*.md y completa product/components — el TODO queda marcado en el cuerpo.');
  } else {
    console.log('Sin export legacy encontrado. Pasa --export <ruta-a-teambrain-pre-migrate.json> si tienes uno.');
  }

  if (cleanLegacy) {
    const artifacts = findLegacyClaudeArtifacts();
    if (!artifacts.length) {
      console.log('\nSin artefactos legacy en ~/.claude/skills, ~/.claude/commands o ~/.claude/workflows.');
    } else if (!confirmed) {
      console.log(`\n[DRY-RUN] ${artifacts.length} archivo(s)/carpeta(s) se eliminarian de ~/.claude (agregar --yes para confirmar):`);
      for (const a of artifacts) console.log(`  - ${a}`);
    } else {
      for (const a of artifacts) {
        fs.rmSync(a, { recursive: true, force: true });
        console.log(`Eliminado: ${a}`);
      }
    }
  }
}

module.exports = { run, migrateMemory, findLegacyClaudeArtifacts, STANDARD_ENTITY_TYPES };
