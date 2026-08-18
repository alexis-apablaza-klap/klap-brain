'use strict';

/**
 * Integridad referencial entre Capa 2 (memoria) y Capa 1 (topologia).
 * Compartido por `klap review` (uso interactivo) y `npm run validate`
 * (gate de CI) para que la regla de "toda memoria debe anclar a algo real"
 * se defina una sola vez. Ancla obligatoria desde la auditoria 2026-08-18:
 * un hecho sin `product` ni `components` es tan invalido como uno que
 * apunta a un id que no existe -- ambos casos vuelven memoria funcional
 * invisible para `klap ctx`/`klap impact` sin que nada lo señale.
 */
function findOrphanedMemoryRefs(graph, memoryIndex) {
  const productIds = new Set(graph.products.map((p) => p.id));
  const orphans = [];
  for (const entry of memoryIndex.all) {
    if (!entry.product && !entry.components.length) {
      orphans.push({ file: entry.file, slug: entry.slug, kind: 'sin-ancla', ref: null });
      continue;
    }
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
