'use strict';

/**
 * Proyeccion de solo lectura: Neo4j nunca es la verdad, topology.json +
 * memory/ lo son. Cada "klap graph build" hace DETACH DELETE de todo el
 * grafo y lo reconstruye desde cero -- es deliberadamente destructivo y
 * deliberadamente barato de reconstruir. Nunca escribir a mano en el
 * Browser: el proximo build lo pisa.
 */

async function runCypher(config, statements) {
  const url = `http://${config.host}:${config.httpPort}/db/${config.database}/tx/commit`;
  const auth = Buffer.from(`${config.user}:${config.password}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify({ statements }),
  });
  if (!res.ok) {
    throw new Error(`Neo4j HTTP ${res.status}: ${await res.text()}`);
  }
  const json = await res.json();
  if (json.errors && json.errors.length) {
    throw new Error(`Neo4j Cypher error: ${JSON.stringify(json.errors)}`);
  }
  return json.results;
}

function buildStatements(graph, memoryIndex) {
  const statements = [{ statement: 'MATCH (n) DETACH DELETE n' }];

  for (const product of graph.products) {
    statements.push({
      statement: 'MERGE (p:Product {id: $id}) SET p.name=$name, p.description=$description, p.phase=$phase',
      parameters: { id: product.id, name: product.name, description: product.description, phase: product.phase },
    });
  }

  for (const [, comp] of graph.byId) {
    statements.push({
      statement: 'MERGE (c:Component {id: $id}) SET c.type=$type, c.domain=$domain, c.source=$source',
      parameters: { id: comp.id, type: comp.type, domain: comp.domain, source: comp.source },
    });
  }

  for (const [productId, componentIds] of graph.productComponents) {
    for (const cid of componentIds) {
      statements.push({
        statement: 'MATCH (p:Product {id:$pid}), (c:Component {id:$cid}) MERGE (p)-[:INCLUYE]->(c)',
        parameters: { pid: productId, cid },
      });
    }
  }

  for (const [topic, roles] of graph.topicIndex) {
    statements.push({ statement: 'MERGE (t:Topic {name: $topic})', parameters: { topic } });
    for (const cid of roles.producers) {
      statements.push({
        statement: 'MATCH (c:Component {id:$cid}), (t:Topic {name:$topic}) MERGE (c)-[:PRODUCE]->(t)',
        parameters: { cid, topic },
      });
    }
    for (const cid of roles.consumers) {
      statements.push({
        statement: 'MATCH (c:Component {id:$cid}), (t:Topic {name:$topic}) MERGE (c)-[:CONSUME]->(t)',
        parameters: { cid, topic },
      });
    }
    for (const cid of roles.dlqHandlers) {
      statements.push({
        statement: 'MATCH (c:Component {id:$cid}), (t:Topic {name:$topic}) MERGE (c)-[:ENVIA_A_DLQ]->(t)',
        parameters: { cid, topic },
      });
    }
  }

  for (const [schema, componentIds] of graph.schemaIndex) {
    statements.push({ statement: 'MERGE (s:Schema {name: $schema})', parameters: { schema } });
    for (const cid of componentIds) {
      statements.push({
        statement: 'MATCH (c:Component {id:$cid}), (s:Schema {name:$schema}) MERGE (c)-[:USA_BD]->(s)',
        parameters: { cid, schema },
      });
    }
  }

  for (const entry of memoryIndex.all) {
    statements.push({
      statement: 'MERGE (m:Memory {slug: $slug}) SET m.type=$type, m.title=$title, m.date=$date',
      parameters: { slug: entry.slug, type: entry.type, title: entry.title, date: entry.date },
    });
    if (entry.product) {
      statements.push({
        statement: 'MATCH (m:Memory {slug:$slug}), (p:Product {id:$pid}) MERGE (m)-[:SOBRE]->(p)',
        parameters: { slug: entry.slug, pid: entry.product },
      });
    }
    for (const cid of entry.components) {
      statements.push({
        statement: 'MATCH (m:Memory {slug:$slug}), (c:Component {id:$cid}) MERGE (m)-[:SOBRE]->(c)',
        parameters: { slug: entry.slug, cid },
      });
    }
  }

  return statements;
}

/** Neo4j HTTP API limita el tamano de una transaccion; se envia en lotes. */
async function build(config, graph, memoryIndex, { batchSize = 200, log = () => {} } = {}) {
  const statements = buildStatements(graph, memoryIndex);
  log(`Proyectando ${statements.length} statements en lotes de ${batchSize}...`);
  for (let i = 0; i < statements.length; i += batchSize) {
    await runCypher(config, statements.slice(i, i + batchSize));
  }
  log('Proyeccion completa.');
  return { statementCount: statements.length };
}

module.exports = { runCypher, buildStatements, build };
