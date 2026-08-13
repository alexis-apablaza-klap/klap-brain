'use strict';

const { readJson, writeJson, removeRecursive } = require('../lib/fs-utils');
const paths = require('../lib/paths');

const DEFAULTS = {
  host: 'localhost',
  httpPort: 7474,
  boltPort: 7687,
  user: 'neo4j',
  password: null, // sin default: se exige por env NEO4J_PASSWORD o --password. Ver Fase 4 / docker-compose.
  database: 'neo4j',
};

const FLAG_TO_KEY = {
  '--host': 'host',
  '--http-port': 'httpPort',
  '--bolt-port': 'boltPort',
  '--user': 'user',
  '--password': 'password',
  '--database': 'database',
};

function load() {
  return { ...DEFAULTS, ...(readJson(paths.KLAP_CONFIG) || {}) };
}

function save(config) {
  writeJson(paths.KLAP_CONFIG, config);
}

function run(args) {
  const [sub, ...rest] = args;

  if (sub === 'show' || !sub) {
    const config = load();
    console.log(JSON.stringify({ ...config, password: config.password ? '********' : null }, null, 2));
    return config;
  }

  if (sub === 'set') {
    const config = load();
    for (let i = 0; i < rest.length; i += 2) {
      const key = FLAG_TO_KEY[rest[i]];
      if (!key) {
        console.error(`Flag desconocido: ${rest[i]}. Validos: ${Object.keys(FLAG_TO_KEY).join(', ')}`);
        process.exit(1);
      }
      let value = rest[i + 1];
      if (key === 'httpPort' || key === 'boltPort') value = Number(value);
      config[key] = value;
    }
    save(config);
    console.log(`Config guardada en ${paths.KLAP_CONFIG}`);
    return config;
  }

  if (sub === 'reset') {
    removeRecursive(paths.KLAP_CONFIG);
    console.log('Config reseteada a defaults.');
    return DEFAULTS;
  }

  console.error('Uso: klap config <show|set|reset> [--host X --password Y --http-port N --bolt-port N --user U --database D]');
  process.exit(1);
}

module.exports = { run, load, save, DEFAULTS };
