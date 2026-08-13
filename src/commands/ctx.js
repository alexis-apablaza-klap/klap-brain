'use strict';

const query = require('../model/query');

function fmtTopics(topics) {
  const parts = [];
  for (const bucket of ['input', 'output', 'notification', 'dlq', 'other']) {
    if (topics[bucket] && topics[bucket].length) parts.push(`${bucket}=${topics[bucket].join(',')}`);
  }
  return parts.length ? parts.join('  ') : '(sin topics)';
}

function fmtComponentLine(c) {
  const db = c.database && c.database.hasDatabase ? `bd=${c.database.schema || '?'}` : 'bd=-';
  const apis = c.externalApis && c.externalApis.length ? `apis=${c.externalApis.length}` : 'apis=0';
  return `    ${c.id}  [${c.type}]  ${fmtTopics(c.topics)}  ${db}  ${apis}`;
}

function formatProduct(result) {
  const lines = [];
  const p = result.product;
  lines.push(`PRODUCTO ${p.id} — ${p.description} (${p.phase})`);
  lines.push(`  Componentes (${result.components.length}):`);
  if (!result.components.length) {
    lines.push('    (ninguno matcheado por productos.yml — revisar componentPatterns o correr klap scan)');
  }
  for (const c of result.components) lines.push(fmtComponentLine(c));

  if (result.integrations.length) {
    lines.push('  Integra con:');
    for (const i of result.integrations) lines.push(`    ${i.product}  (via topic: ${i.topics.join(', ')})`);
  }
  if (result.looseIntegrations.length) {
    lines.push('  Integra con componentes sin producto asignado:');
    for (const i of result.looseIntegrations) lines.push(`    ${i.component}  (via topic: ${i.topics.join(', ')})`);
  }

  lines.push(`  Conocimiento funcional (${result.memory.length}):`);
  for (const m of result.memory) lines.push(`    ${m.slug} — ${m.title}`);
  if (!result.memory.length) lines.push('    (ninguno — usar "klap remember" al resolver huecos)');

  if (result.gaps.length) {
    lines.push('  ⚠ HUECOS — preguntar al dev antes de implementar:');
    for (const g of result.gaps) lines.push(`    - ${g}`);
  }
  return lines.join('\n');
}

function formatComponent(result) {
  const lines = [];
  const c = result.component;
  lines.push(`COMPONENTE ${c.id}  [${c.type}/${c.domain}]  source=${c.source}`);
  if (result.products.length) lines.push(`  Productos: ${result.products.join(', ')}`);
  lines.push(`  Topics: ${fmtTopics(c.topics)}`);
  if (c.database && c.database.hasDatabase) {
    lines.push(`  BD: schema=${c.database.schema || '?'}${c.database.confidence ? ` (${c.database.confidence})` : ''}`);
  }
  if (c.externalApis && c.externalApis.length) {
    lines.push(`  APIs externas: ${c.externalApis.join(', ')}${c.externalApisConfidence ? ` (${c.externalApisConfidence})` : ''}`);
  }
  if (c.securityFindings && c.securityFindings.length) {
    lines.push('  ⚠ Hallazgos de seguridad:');
    for (const f of c.securityFindings) {
      for (const item of f.items) lines.push(`    - ${f.type}: clave "${item.key}" en ${item.file}`);
    }
  }

  const { topicNeighbors, schemaNeighbors, apiNeighbors } = result.neighbors;
  if (topicNeighbors.length) {
    lines.push(`  Vecinos por topic (${topicNeighbors.length}):`);
    for (const n of topicNeighbors) lines.push(`    ${n.component}  via "${n.via}" (${n.role})`);
  }
  if (schemaNeighbors.length) {
    lines.push(`  Vecinos por BD compartida (${schemaNeighbors.length}):`);
    for (const n of schemaNeighbors) lines.push(`    ${n.component}  via schema "${n.via}"`);
  }
  if (apiNeighbors.length) {
    lines.push(`  Otros componentes que llaman la misma API (${apiNeighbors.length}):`);
    for (const n of apiNeighbors) lines.push(`    ${n.component}  via "${n.via}"`);
  }

  lines.push(`  Conocimiento funcional (${result.memory.length}):`);
  for (const m of result.memory) lines.push(`    ${m.slug} — ${m.title}`);
  if (!result.memory.length) lines.push('    (ninguno — usar "klap remember" al resolver huecos)');

  if (result.gaps.length) {
    lines.push('  ⚠ HUECOS:');
    for (const g of result.gaps) lines.push(`    - ${g}`);
  }
  return lines.join('\n');
}

function format(result) {
  if (result.kind === 'product') return formatProduct(result);
  if (result.kind === 'component') return formatComponent(result);
  const suggestions = result.suggestions.length ? result.suggestions.join(', ') : '(sin sugerencias)';
  return `No se encontro "${result.id}" ni como producto ni como componente.\n¿Quisiste decir?: ${suggestions}`;
}

function run(args) {
  const id = args[0];
  if (!id) {
    console.error('Uso: klap ctx <producto|componente>');
    process.exit(1);
  }
  const result = query.ctx(id);
  console.log(format(result));
  return result;
}

module.exports = { run, format };
