'use strict';

const fs = require('fs');
const { readJson } = require('../lib/fs-utils');
const yamlLite = require('../lib/yaml-lite');
const paths = require('../lib/paths');

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const pattern = escaped.replace(/\*/g, '.*').replace(/\?/g, '.');
  return new RegExp(`^${pattern}$`);
}

function loadTopology(topologyPath = paths.TOPOLOGY_JSON) {
  const data = readJson(topologyPath);
  if (!data) {
    throw new Error(`No existe ${topologyPath} — corre "klap scan" primero.`);
  }
  return data;
}

function loadProducts(productosPath = paths.PRODUCTOS_YML) {
  if (!fs.existsSync(productosPath)) return [];
  const text = fs.readFileSync(productosPath, 'utf8');
  const parsed = yamlLite.parse(text);
  return parsed.products || [];
}

/**
 * Construye el grafo en memoria: indices por topic/schema/producto y
 * resolucion de patrones de producto contra los componentes reales del scan.
 */
function buildGraph(topologyPath, productosPath) {
  const topology = loadTopology(topologyPath);
  const products = loadProducts(productosPath);
  const components = topology.components || [];
  const byId = new Map(components.map((c) => [c.id, c]));

  // producto -> componentIds que matchean sus patrones
  const productComponents = new Map();
  // componentId -> productIds (un componente puede servir a mas de un producto)
  const componentProducts = new Map();
  for (const product of products) {
    const patterns = (product.componentPatterns || []).map(globToRegExp);
    const matched = components
      .filter((c) => patterns.some((re) => re.test(c.id)))
      .map((c) => c.id);
    productComponents.set(product.id, matched);
    for (const cid of matched) {
      if (!componentProducts.has(cid)) componentProducts.set(cid, []);
      componentProducts.get(cid).push(product.id);
    }
  }

  // topic -> { producers: [], consumers: [], dlqHandlers: [] }
  const topicIndex = new Map();
  function addTopicRole(topic, componentId, role) {
    if (!topicIndex.has(topic)) topicIndex.set(topic, { producers: [], consumers: [], dlqHandlers: [] });
    const entry = topicIndex.get(topic);
    if (!entry[role].includes(componentId)) entry[role].push(componentId);
  }
  for (const c of components) {
    const t = c.topics || {};
    for (const topic of [...(t.output || []), ...(t.notification || [])]) addTopicRole(topic, c.id, 'producers');
    for (const topic of t.input || []) addTopicRole(topic, c.id, 'consumers');
    for (const topic of t.dlq || []) addTopicRole(topic, c.id, 'dlqHandlers');
  }

  // schema -> componentIds que lo comparten
  const schemaIndex = new Map();
  for (const c of components) {
    const schema = c.database && c.database.schema;
    if (!schema) continue;
    if (!schemaIndex.has(schema)) schemaIndex.set(schema, []);
    schemaIndex.get(schema).push(c.id);
  }

  // externalApi -> componentIds que la consumen
  const apiIndex = new Map();
  for (const c of components) {
    for (const api of c.externalApis || []) {
      if (!apiIndex.has(api)) apiIndex.set(api, []);
      apiIndex.get(api).push(c.id);
    }
  }

  return {
    topology,
    products,
    byId,
    productComponents,
    componentProducts,
    topicIndex,
    schemaIndex,
    apiIndex,
  };
}

module.exports = { buildGraph, loadTopology, loadProducts, globToRegExp };
