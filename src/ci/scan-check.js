'use strict';

/**
 * Gate de drift: compara topology/topology.json contra un re-scan en vivo
 * del config-server. Requiere acceso local al repo de properties (privado,
 * no vendoreado en klap-brain) -- si no esta disponible (tipicamente en CI
 * remoto) el check se salta explicitamente en vez de fallar en falso.
 */

const fs = require('fs');
const paths = require('../lib/paths');
const springConfigServer = require('../adapters/spring-config-server');

function run(args = []) {
  const sourceArg = args.find((a) => a.startsWith('--source='));
  const source = (sourceArg && sourceArg.split('=')[1]) || process.env.KLAP_CONFIG_SERVER;

  if (!source || !fs.existsSync(source)) {
    console.log('scan-check: sin acceso local al config-server (--source=<path> o KLAP_CONFIG_SERVER) — se omite, no es una falla.');
    return true;
  }
  if (!fs.existsSync(paths.TOPOLOGY_JSON)) {
    console.log(`Sin ${paths.TOPOLOGY_JSON} todavia — nada que comparar.`);
    return true;
  }

  const committed = JSON.parse(fs.readFileSync(paths.TOPOLOGY_JSON, 'utf8'));
  const committedFromSource = (committed.components || []).filter((c) => c.source === 'spring-config-server');
  const { components: fresh } = springConfigServer.scan(source);

  const committedIds = new Set(committedFromSource.map((c) => c.id));
  const freshIds = new Set(fresh.map((c) => c.id));
  const missing = [...freshIds].filter((id) => !committedIds.has(id));
  const stale = [...committedIds].filter((id) => !freshIds.has(id));

  console.log(`Componentes en topology.json (source=spring-config-server): ${committedIds.size}`);
  console.log(`Componentes en el config-server real: ${freshIds.size}`);

  if (missing.length || stale.length) {
    console.error('\nFALLAS: topology.json esta desfasado — correr "klap scan" de nuevo.');
    if (missing.length) console.error(`  Faltan (nuevos en el config-server): ${missing.slice(0, 10).join(', ')}${missing.length > 10 ? ` (+${missing.length - 10})` : ''}`);
    if (stale.length) console.error(`  Sobran (ya no existen en el config-server): ${stale.slice(0, 10).join(', ')}${stale.length > 10 ? ` (+${stale.length - 10})` : ''}`);
    process.exitCode = 1;
    return false;
  }
  console.log('OK');
  return true;
}

if (require.main === module) run(process.argv.slice(2));
module.exports = { run };
