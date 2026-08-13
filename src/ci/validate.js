'use strict';

/**
 * Gate de integridad referencial: toda memoria funcional debe apuntar a un
 * producto/componente que EXISTE en la topologia actual. Sin este check,
 * el drift que ya se materializo en el ecosistema anterior (nodos de Neo4j
 * apuntando a servicios renombrados o eliminados) vuelve a pasar sin que
 * nadie lo note hasta que `klap ctx` devuelve resultados vacios.
 */

const fs = require('fs');
const { buildGraph } = require('../model/topology');
const { loadMemoryIndex } = require('../model/memory');
const { findOrphanedMemoryRefs } = require('../model/integrity');
const paths = require('../lib/paths');

function run() {
  if (!fs.existsSync(paths.TOPOLOGY_JSON)) {
    console.log(`Sin ${paths.TOPOLOGY_JSON} todavia — nada que validar (correr "klap scan" primero).`);
    return true;
  }

  const graph = buildGraph();
  const memoryIndex = loadMemoryIndex();
  const orphans = findOrphanedMemoryRefs(graph, memoryIndex);

  console.log(`Memorias: ${memoryIndex.all.length}  ·  Productos: ${graph.products.length}  ·  Componentes: ${graph.byId.size}`);

  if (orphans.length) {
    console.error(`\nFALLAS: ${orphans.length} referencia(s) colgada(s):`);
    for (const o of orphans) console.error(`  - ${o.slug}: ${o.kind} "${o.ref}" no existe`);
    process.exitCode = 1;
    return false;
  }
  console.log('OK');
  return true;
}

if (require.main === module) run();
module.exports = { run };
