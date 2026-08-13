'use strict';

const query = require('../model/query');

function format(result) {
  if (result.kind === 'topic') {
    const lines = [`TOPIC ${result.topic}`];
    lines.push(`  Productores (${result.producers.length}):`);
    for (const p of result.producers) lines.push(`    ${p.component}  [${p.products.join(', ') || 'sin producto'}]`);
    lines.push(`  Consumidores (${result.consumers.length}):`);
    for (const c of result.consumers) lines.push(`    ${c.component}  [${c.products.join(', ') || 'sin producto'}]`);
    if (result.dlqHandlers.length) {
      lines.push(`  Manejan su DLQ (${result.dlqHandlers.length}):`);
      for (const d of result.dlqHandlers) lines.push(`    ${d.component}  [${d.products.join(', ') || 'sin producto'}]`);
    }
    const total = result.producers.length + result.consumers.length;
    lines.push(`\n  Blast radius: ${total} componente(s) directamente acoplados a este topic.`);
    return lines.join('\n');
  }
  if (result.kind === 'component') {
    const lines = [`COMPONENTE ${result.component}  [${result.products.join(', ') || 'sin producto'}]`];
    const { topicNeighbors, schemaNeighbors, apiNeighbors } = result.neighbors;
    const total = new Set([...topicNeighbors, ...schemaNeighbors, ...apiNeighbors].map((n) => n.component)).size;
    for (const n of topicNeighbors) lines.push(`  ${n.component}  via topic "${n.via}" (${n.role})`);
    for (const n of schemaNeighbors) lines.push(`  ${n.component}  via schema "${n.via}"`);
    for (const n of apiNeighbors) lines.push(`  ${n.component}  via api "${n.via}"`);
    lines.push(`\n  Blast radius: ${total} componente(s) directamente acoplados.`);
    return lines.join('\n');
  }
  const suggestions = result.suggestions.length ? result.suggestions.join(', ') : '(sin sugerencias)';
  return `No se encontro "${result.id}" ni como topic ni como componente.\n¿Quisiste decir?: ${suggestions}`;
}

function run(args) {
  const id = args[0];
  if (!id) {
    console.error('Uso: klap impact <topic|componente>');
    process.exit(1);
  }
  const result = query.impact(id);
  console.log(format(result));
  return result;
}

module.exports = { run, format };
