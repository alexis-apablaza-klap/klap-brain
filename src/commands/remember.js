'use strict';

const path = require('path');
const fs = require('fs');
const { writeText } = require('../lib/fs-utils');
const frontmatter = require('../lib/frontmatter');
const paths = require('../lib/paths');
const { loadMemoryIndex, writeIndex } = require('../model/memory');

const VALID_TYPES = ['decision', 'fix', 'rule', 'incident', 'note'];

function parseArgs(args) {
  const out = { components: [], tags: [], body: [] };
  let i = 0;
  while (i < args.length) {
    const a = args[i];
    if (a === '--type') out.type = args[++i];
    else if (a === '--product') out.product = args[++i];
    else if (a === '--components') out.components = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--tags') out.tags = args[++i].split(',').map((s) => s.trim()).filter(Boolean);
    else if (a === '--slug') out.slug = args[++i];
    else if (a === '--date') out.date = args[++i];
    else out.body.push(a);
    i++;
  }
  return out;
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function run(args) {
  const opts = parseArgs(args);
  const body = opts.body.join(' ').trim();

  if (!opts.type || !VALID_TYPES.includes(opts.type)) {
    console.error(`Uso: klap remember --type <${VALID_TYPES.join('|')}> [--product <id>] [--components <id1,id2>] [--tags <t1,t2>] <cuerpo del hecho>`);
    process.exit(1);
  }
  if (!body) {
    console.error('El cuerpo del hecho no puede estar vacio.');
    process.exit(1);
  }
  if (!opts.product && !opts.components.length) {
    console.error('Se requiere al menos --product o --components — una memoria sin ancla a topologia no es recuperable por klap ctx.');
    process.exit(1);
  }

  const date = opts.date || new Date().toISOString().slice(0, 10);
  const slug = opts.slug || `${date}-${opts.type}-${slugify(body.split(/\s+/).slice(0, 6).join(' '))}`;
  const file = path.join(paths.MEMORY_DIR, `${slug}.md`);

  if (fs.existsSync(file)) {
    console.error(`Ya existe ${file} — usa --slug para elegir otro nombre.`);
    process.exit(1);
  }

  const data = { type: opts.type, date };
  if (opts.product) data.product = opts.product;
  if (opts.components.length) data.components = opts.components;
  if (opts.tags.length) data.tags = opts.tags;

  const text = frontmatter.stringify(data, `${body}\n`);
  writeText(file, text);
  writeIndex(loadMemoryIndex());
  console.log(`Guardado: ${file}`);
  console.log('Revisa el archivo y commitea — la memoria funcional se valida en PR, no en el momento de escribirla.');
  return { file, slug };
}

module.exports = { run, slugify, VALID_TYPES };
