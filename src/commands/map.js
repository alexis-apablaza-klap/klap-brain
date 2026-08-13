'use strict';

const { buildGraph } = require('../model/topology');
const { writeText } = require('../lib/fs-utils');
const paths = require('../lib/paths');

function run(_args) {
  const graph = buildGraph();
  const lines = ['# Mapa de topologia KLAP', '', `_Generado por \`klap map\` — ${graph.topology.generatedAt}_`, ''];

  for (const product of graph.products) {
    const componentIds = graph.productComponents.get(product.id) || [];
    lines.push(`## ${product.name} (\`${product.id}\`) — ${product.phase}`);
    lines.push('');
    lines.push(product.description);
    lines.push('');
    lines.push(`**Componentes (${componentIds.length}):**`);
    lines.push('');
    if (!componentIds.length) {
      lines.push('_Sin componentes matcheados — ver `topology/productos.yml`._');
    } else {
      for (const cid of componentIds) {
        const c = graph.byId.get(cid);
        lines.push(`- \`${cid}\` [${c.type}]`);
      }
    }
    lines.push('');
  }

  const withoutProduct = [...graph.byId.keys()].filter((id) => !(graph.componentProducts.get(id) || []).length);
  lines.push(`## Sin producto asignado (${withoutProduct.length})`);
  lines.push('');
  lines.push('_Componentes del scan que no matchean ningun patron en productos.yml — probablemente transversales o de otros equipos._');
  lines.push('');
  for (const id of withoutProduct.slice(0, 50)) lines.push(`- \`${id}\``);
  if (withoutProduct.length > 50) lines.push(`- _(+${withoutProduct.length - 50} mas)_`);

  const content = lines.join('\n') + '\n';
  writeText(paths.MAP_MD, content);
  console.log(`Mapa escrito en ${paths.MAP_MD}`);
  return content;
}

module.exports = { run };
