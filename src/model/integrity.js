'use strict';

/**
 * Integridad referencial entre Capa 2 (memoria) y Capa 1 (topologia).
 * Compartido por `klap review` (uso interactivo) y `npm run validate`
 * (gate de CI) para que la regla de "sin referencias colgadas" se defina
 * una sola vez.
 */
function findOrphanedMemoryRefs(graph, memoryIndex) {
  const productIds = new Set(graph.products.map((p) => p.id));
  const orphans = [];
  for (const entry of memoryIndex.all) {
    if (entry.product && !productIds.has(entry.product)) {
      orphans.push({ file: entry.file, slug: entry.slug, kind: 'product', ref: entry.product });
    }
    for (const cid of entry.components) {
      if (!graph.byId.has(cid)) {
        orphans.push({ file: entry.file, slug: entry.slug, kind: 'component', ref: cid });
      }
    }
  }
  return orphans;
}

module.exports = { findOrphanedMemoryRefs };
