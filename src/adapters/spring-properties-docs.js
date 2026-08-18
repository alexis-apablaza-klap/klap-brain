'use strict';

/**
 * Adaptador de topologia para microservicios Spring Boot (ms-/mcs-) SVA
 * cuya copia de properties vive en `docs/` DENTRO del propio repo, no en
 * el config-server compartido completo. Decision 2026-08-18: escanear el
 * config-server compartido "a cada rato" traia ruido de ~200+ componentes
 * de otros equipos que cambian a diario -- el config-server sigue siendo
 * obligatorio para que el servicio levante, pero para topologia la fuente
 * pasa a ser esta copia local, acotada al propio repo.
 *
 * Reusa integro el parser/extractor de `spring-config-server.js` (mismo
 * formato de archivo, mismas convenciones de sufijo de ambiente) -- solo
 * cambia el directorio que se lee (`<repo>/docs` en vez del mega-repo) y
 * el `source` declarado en el componente resultante.
 */

const fs = require('fs');
const path = require('path');
const springConfigServer = require('./spring-config-server');

function scan(repoPath) {
  const docsDir = path.join(repoPath, 'docs');
  if (!fs.existsSync(docsDir)) return { components: [], skipped: [] };

  const hasProperties = fs.readdirSync(docsDir).some((f) => f.endsWith('.properties'));
  if (!hasProperties) return { components: [], skipped: [] };

  const result = springConfigServer.scan(docsDir);
  for (const c of result.components) c.source = 'repo-docs-properties';
  return result;
}

module.exports = { scan };
