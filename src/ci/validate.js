'use strict';

/**
 * Gate de integridad referencial: toda memoria funcional debe declarar un
 * ancla (product y/o components) que EXISTA en la topologia actual -- una
 * memoria sin ancla es tan invalida como una que apunta a un id borrado.
 * Sin este check, el drift que ya se materializo en el ecosistema anterior
 * (nodos de Neo4j apuntando a servicios renombrados o eliminados, y hechos
 * sin ancla que nadie volvia a mirar) vuelve a pasar sin que nadie lo note
 * hasta que `klap ctx` devuelve resultados vacios.
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
    console.error(`\nFALLAS: ${orphans.length} referencia(s) invalida(s):`);
    for (const o of orphans) {
      if (o.kind === 'sin-ancla') {
        console.error(`  - ${o.slug}: sin product/components -- toda memoria debe anclar a algo real`);
      } else {
        console.error(`  - ${o.slug}: ${o.kind} "${o.ref}" no existe`);
      }
    }
    process.exitCode = 1;
    return false;
  }
  console.log('OK');
  return true;
}

if (require.main === module) run();
module.exports = { run };
