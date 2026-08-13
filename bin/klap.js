#!/usr/bin/env node
'use strict';

const path = require('path');
const nvd = require('../src/lib/nvd');

const command = process.argv[2];
const args = process.argv.slice(3);

const localPkg = require(path.join(__dirname, '..', 'package.json'));

function printHelp() {
  const nvdStatus = nvd.status();
  console.log('klap-brain — CLI');
  console.log('Uso: klap <comando> [argumentos]\n');
  console.log('Topologia (Capa 1 — derivada):');
  console.log('  scan       Extrae topologia desde config-server/repos --config-server <p> --repo <p> --repos-dir <p> [--fresh]');
  console.log('  ctx        Ficha de contexto de un producto o componente (con reporte de huecos)');
  console.log('  impact     Blast radius de un topic o componente');
  console.log('  map        Regenera topology/MAP.md');
  console.log('\nMemoria (Capa 2 — funcional):');
  console.log('  remember   Guarda un hecho: --type <decision|fix|rule|incident|note> --product <id> --components <id,id> <texto>');
  console.log('  review     Curacion periodica: lista todos los huecos y referencias colgadas de una vez');
  console.log('\nInstalacion:');
  console.log('  install    Instala knowledge/ como skills reales en ~/.claude/skills + CLAUDE.md');
  console.log('  rollback   Revierte install (simetrico) y detiene Neo4j [--keep-data]');
  console.log('  migrate    Migracion asistida desde eco-team-brain --export <path> [--clean-legacy] [--yes]');
  console.log('  doctor     Chequea el entorno');
  console.log('\nProyeccion Neo4j (solo lectura, derivada — nunca es la verdad):');
  console.log('  graph      up | down | restart | status | logs | browser | build');
  console.log('  config     show | set | reset — conexion a Neo4j');
  console.log('\nHerramientas de seguridad (gates de auditoria):');
  console.log('  trivy      Instala Trivy');
  console.log('  depcheck   Instala OWASP Dependency-Check CLI');
  console.log('  cve-update Refresca CVE — Flags: --nvd-api-key <key> | --data <dir> | --trivy-only | --depcheck-only | --help');
  console.log(nvdStatus.found
    ? `             NVD API Key: detectada (${nvdStatus.source})`
    : `             NVD API Key: no detectada — klap cve-update --help para mas info`);
}

async function main() {
  if (!command || command === '--help' || command === '-h') {
    printHelp();
    return;
  }
  if (command === '--version' || command === '-v' || command === 'version') {
    console.log(`klap-brain v${localPkg.version}`);
    return;
  }

  switch (command) {
    case 'scan': return require('../src/commands/scan').run(args);
    case 'ctx': return require('../src/commands/ctx').run(args);
    case 'impact': return require('../src/commands/impact').run(args);
    case 'map': return require('../src/commands/map').run(args);
    case 'remember': return require('../src/commands/remember').run(args);
    case 'review': return require('../src/commands/review').run(args);
    case 'install': return require('../src/commands/install').run(args);
    case 'rollback': return require('../src/commands/rollback').run(args);
    case 'migrate': return require('../src/commands/migrate').run(args);
    case 'doctor': return require('../src/commands/doctor').run(args);
    case 'config': return require('../src/commands/config').run(args);
    case 'graph': return await require('../src/commands/graph').run(args);
    case 'trivy': return require('../src/commands/tools').run(['trivy', ...args]);
    case 'depcheck': return require('../src/commands/tools').run(['depcheck', ...args]);
    case 'cve-update': return require('../src/commands/tools').run(['cve-update', ...args]);
    default:
      console.error(`Comando desconocido: ${command}`);
      process.exit(1);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
