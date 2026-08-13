'use strict';

const { buildGraph } = require('./topology');
const { loadMemoryIndex } = require('./memory');

function dedup(arr) {
  return [...new Set(arr)];
}

function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function suggest(id, candidates, limit = 5) {
  return candidates
    .map((c) => ({ id: c, dist: levenshtein(id, c) }))
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit)
    .map((x) => x.id);
}

function neighborsOfComponent(graph, componentId) {
  const comp = graph.byId.get(componentId);
  if (!comp) return { topicNeighbors: [], schemaNeighbors: [], apiNeighbors: [] };

  const topicNeighbors = [];
  const topics = comp.topics || {};
  for (const topic of [...(topics.input || []), ...(topics.output || []), ...(topics.notification || []), ...(topics.dlq || [])]) {
    const entry = graph.topicIndex.get(topic);
    if (!entry) continue;
    for (const role of ['producers', 'consumers', 'dlqHandlers']) {
      for (const other of entry[role]) {
        if (other !== componentId) topicNeighbors.push({ via: topic, role, component: other });
      }
    }
  }

  const schemaNeighbors = [];
  const schema = comp.database && comp.database.schema;
  if (schema && graph.schemaIndex.has(schema)) {
    for (const other of graph.schemaIndex.get(schema)) {
      if (other !== componentId) schemaNeighbors.push({ via: schema, component: other });
    }
  }

  const apiNeighbors = [];
  for (const api of comp.externalApis || []) {
    const users = graph.apiIndex.get(api) || [];
    for (const other of users) {
      if (other !== componentId) apiNeighbors.push({ via: api, component: other });
    }
  }

  return { topicNeighbors, schemaNeighbors, apiNeighbors };
}

function componentGaps(graph, memoryIndex, componentId) {
  const gaps = [];
  const comp = graph.byId.get(componentId);
  if (!comp) return gaps;
  const hasMemory = (memoryIndex.byComponent.get(componentId) || []).length > 0;
  if (!hasMemory) gaps.push(`Sin conocimiento funcional registrado para ${componentId}`);
  if (comp.database && comp.database.confidence === 'heuristic') {
    gaps.push(`${componentId}: dependencia de BD detectada por heuristica de codigo, no declarada — confirmar`);
  }
  if (comp.externalApisConfidence === 'heuristic' && comp.externalApis.length) {
    gaps.push(`${componentId}: APIs externas detectadas por heuristica, no declaradas — confirmar`);
  }
  if (comp.notes && comp.notes.length) {
    for (const note of comp.notes) gaps.push(`${componentId}: ${note}`);
  }
  return gaps;
}

/**
 * Ficha de contexto para un producto o un componente. Es la funcion que
 * reemplaza las 5 busquedas MCP fallidas del ecosistema anterior: calculada,
 * no buscada, y declara explicitamente que no sabe.
 */
function ctx(id, { topologyPath, productosPath, memoryDir } = {}) {
  const graph = buildGraph(topologyPath, productosPath);
  const memoryIndex = loadMemoryIndex(memoryDir);

  const product = graph.products.find((p) => p.id === id);
  if (product) {
    const componentIds = graph.productComponents.get(id) || [];
    const components = componentIds.map((cid) => graph.byId.get(cid)).filter(Boolean);

    const integrations = new Map(); // otherProductId -> Set(topic)
    const looseIntegrations = new Map(); // otherComponentId (sin producto) -> Set(topic)
    for (const cid of componentIds) {
      const { topicNeighbors } = neighborsOfComponent(graph, cid);
      for (const n of topicNeighbors) {
        if (componentIds.includes(n.component)) continue;
        const otherProducts = graph.componentProducts.get(n.component) || [];
        if (otherProducts.length) {
          for (const op of otherProducts) {
            if (op === id) continue;
            if (!integrations.has(op)) integrations.set(op, new Set());
            integrations.get(op).add(n.via);
          }
        } else {
          if (!looseIntegrations.has(n.component)) looseIntegrations.set(n.component, new Set());
          looseIntegrations.get(n.component).add(n.via);
        }
      }
    }

    const memoryEntries = dedup([
      ...(memoryIndex.byProduct.get(id) || []),
      ...componentIds.flatMap((cid) => memoryIndex.byComponent.get(cid) || []),
    ]);

    const gaps = componentIds.flatMap((cid) => componentGaps(graph, memoryIndex, cid));
    if (!components.length) {
      gaps.unshift(`Ningun componente del scan matchea los patrones de "${id}" en productos.yml`);
    }

    return {
      kind: 'product',
      product,
      components,
      integrations: [...integrations.entries()].map(([p, topics]) => ({ product: p, topics: [...topics] })),
      looseIntegrations: [...looseIntegrations.entries()].map(([c, topics]) => ({ component: c, topics: [...topics] })),
      memory: memoryEntries,
      gaps,
    };
  }

  const component = graph.byId.get(id);
  if (component) {
    const productIds = graph.componentProducts.get(id) || [];
    const neighbors = neighborsOfComponent(graph, id);
    const memoryEntries = memoryIndex.byComponent.get(id) || [];
    const gaps = componentGaps(graph, memoryIndex, id);
    return { kind: 'component', component, products: productIds, neighbors, memory: memoryEntries, gaps };
  }

  const candidates = [...graph.products.map((p) => p.id), ...graph.byId.keys()];
  return { kind: 'not-found', id, suggestions: suggest(id, candidates) };
}

/**
 * Blast radius de un topic o componente: quien lo produce, quien lo consume,
 * y a que productos pertenecen.
 */
function impact(id, { topologyPath, productosPath } = {}) {
  const graph = buildGraph(topologyPath, productosPath);

  if (graph.topicIndex.has(id)) {
    const entry = graph.topicIndex.get(id);
    const resolve = (cid) => ({ component: cid, products: graph.componentProducts.get(cid) || [] });
    return {
      kind: 'topic',
      topic: id,
      producers: entry.producers.map(resolve),
      consumers: entry.consumers.map(resolve),
      dlqHandlers: entry.dlqHandlers.map(resolve),
    };
  }

  if (graph.byId.has(id)) {
    const neighbors = neighborsOfComponent(graph, id);
    const productIds = graph.componentProducts.get(id) || [];
    return { kind: 'component', component: id, products: productIds, neighbors };
  }

  const candidates = [...graph.topicIndex.keys(), ...graph.byId.keys()];
  return { kind: 'not-found', id, suggestions: suggest(id, candidates) };
}

module.exports = { ctx, impact, neighborsOfComponent, suggest };
