'use strict';

const { buildGraph } = require('../model/topology');
const { loadMemoryIndex } = require('../model/memory');
const { findOrphanedMemoryRefs } = require('../model/integrity');
const { ctx } = require('../model/query');

/**
 * Sesion de curacion periodica: un solo comando que lista TODOS los huecos
 * de conocimiento funcional de una vez, en lugar de descubrirlos uno a uno
 * durante la planificacion. Pensado para correr una vez por sprint.
 */
function run(_args) {
  const graph = buildGraph();
  const memoryIndex = loadMemoryIndex();
  const lines = [];

  lines.push(`Revision de memoria — ${graph.products.length} productos, ${graph.byId.size} componentes, ${memoryIndex.all.length} memorias.`);
  lines.push('');

  for (const product of graph.products) {
    const result = ctx(product.id);
    if (result.kind !== 'product') continue;
    if (!result.gaps.length && result.components.length) continue;
    lines.push(`## ${product.id}`);
    if (!result.components.length) {
      lines.push('  - Sin componentes matcheados en productos.yml.');
    }
    for (const g of result.gaps) lines.push(`  - ${g}`);
    lines.push('');
  }

  const orphans = findOrphanedMemoryRefs(graph, memoryIndex);
  if (orphans.length) {
    lines.push(`## Memorias invalidas (${orphans.length})`);
    lines.push('_Sin ancla (product/components nunca declarado), o ancla a un componente/producto eliminado/renombrado — corregir o borrar._');
    for (const o of orphans) {
      if (o.kind === 'sin-ancla') {
        lines.push(`  - ${o.slug} (${o.file}): sin product/components`);
      } else {
        lines.push(`  - ${o.slug} (${o.file}): ${o.kind} "${o.ref}" no existe en topology.json/productos.yml`);
      }
    }
    lines.push('');
  }

  if (lines.length <= 2) lines.push('Sin huecos detectados. 🎉');

  const output = lines.join('\n');
  console.log(output);
  return { orphans };
}

module.exports = { run };
