'use strict';

/**
 * Formas de datos de la Capa 1 (topologia). No hay validacion runtime de
 * tipos aqui a proposito -- son contratos documentales entre adaptadores,
 * model/topology.js y los comandos. Ver src/ci/validate.js para el chequeo
 * de integridad referencial real (memoria <-> topologia).
 *
 * Component:
 *   id: string (unico)
 *   type: string            // ms | mcs | bff | cnsr | srv | monoapp | lbd | mcf
 *   domain: string
 *   source: string          // nombre del adaptador que lo produjo
 *   envs: string[]
 *   topics: { input: string[], output: string[], notification: string[], dlq: string[], other: string[] }
 *   groupId: string|null
 *   database: { hasDatabase: boolean, schema: string|null, engines?: string[], confidence?: string }
 *   externalApis: string[]
 *   externalApisConfidence?: 'declared' | 'heuristic'
 *   securityFindings?: Array<{ type: string, items: any[] }>
 *   notes?: string[]
 *
 * Product (topology/productos.yml, escrito a mano):
 *   id: string
 *   name: string
 *   description: string
 *   phase: string
 *   componentPatterns: string[]   // globs simples: * y ?
 */

const ENTRY_TYPES = ['ms', 'mcs', 'bff', 'cnsr', 'srv', 'monoapp', 'lbd', 'mcf'];

module.exports = { ENTRY_TYPES };
