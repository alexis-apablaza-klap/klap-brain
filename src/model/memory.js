'use strict';

/**
 * Capa 2 — conocimiento funcional. Un hecho por archivo en memory/*.md con
 * frontmatter:
 *
 *   ---
 *   type: decision | fix | rule | incident | note
 *   product: <productId>          # opcional
 *   components: [id1, id2]        # opcional
 *   tags: [tag1, tag2]             # opcional
 *   date: YYYY-MM-DD
 *   ---
 *   Cuerpo breve del hecho.
 *
 * Este modulo solo indexa lo que ya existe en disco — la escritura la hace
 * el comando `klap remember` (src/commands/remember.js).
 */

const path = require('path');
const { listFiles, readText, writeText } = require('../lib/fs-utils');
const frontmatter = require('../lib/frontmatter');
const paths = require('../lib/paths');

function titleFromBody(content) {
  const line = content.split(/\r?\n/).find((l) => l.trim().length > 0);
  return line ? line.replace(/^#+\s*/, '').trim() : '(sin titulo)';
}

function loadMemoryIndex(memoryDir = paths.MEMORY_DIR) {
  const files = listFiles(memoryDir, { filter: (full) => full.endsWith('.md') && path.basename(full) !== 'INDEX.md' });
  const all = [];
  for (const file of files) {
    const text = readText(file);
    const { data, content } = frontmatter.parse(text);
    all.push({
      slug: path.basename(file, '.md'),
      file,
      type: data.type || 'note',
      product: data.product || null,
      components: Array.isArray(data.components) ? data.components : [],
      tags: Array.isArray(data.tags) ? data.tags : [],
      date: data.date || null,
      title: titleFromBody(content),
    });
  }

  const byProduct = new Map();
  const byComponent = new Map();
  for (const entry of all) {
    if (entry.product) {
      if (!byProduct.has(entry.product)) byProduct.set(entry.product, []);
      byProduct.get(entry.product).push(entry);
    }
    for (const cid of entry.components) {
      if (!byComponent.has(cid)) byComponent.set(cid, []);
      byComponent.get(cid).push(entry);
    }
  }

  return { all, byProduct, byComponent };
}

/** Regenera memory/INDEX.md — nunca se edita a mano, klap remember lo reescribe. */
function writeIndex(memoryIndex, indexPath = paths.MEMORY_INDEX) {
  const sorted = [...memoryIndex.all].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const lines = [
    '# Indice de memoria funcional',
    '',
    '_Generado por `klap remember` — no editar a mano._',
    '',
  ];
  for (const e of sorted) {
    const anchor = [e.product, ...e.components].filter(Boolean).join(', ') || '(sin ancla)';
    lines.push(`- **${e.date || '?'}** [${e.type}] [${e.slug}](${path.basename(e.file)}) — ${e.title} _(${anchor})_`);
  }
  if (!sorted.length) lines.push('_Vacio — usar `klap remember` para el primer hecho._');
  writeText(indexPath, lines.join('\n') + '\n');
}

module.exports = { loadMemoryIndex, writeIndex };
