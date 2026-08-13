'use strict';

/**
 * Resolucion de la NVD API Key. Unica fuente de verdad -- en el ecosistema
 * anterior este mismo orden (env > archivo local) estaba reimplementado 4
 * veces (klap.js + cve-update.ps1 + cve-update.sh + cve-update.bat).
 */

const fs = require('fs');
const paths = require('./paths');

const NVD_URL = 'https://nvd.nist.gov/developers/request-an-api-key';

function status() {
  if (process.env.NVD_API_KEY) return { found: true, source: 'variable NVD_API_KEY' };
  if (fs.existsSync(paths.NVD_KEY_FILE)) return { found: true, source: paths.NVD_KEY_FILE };
  return { found: false };
}

function resolve(cliKey) {
  if (cliKey) return cliKey;
  if (process.env.NVD_API_KEY) return process.env.NVD_API_KEY;
  if (fs.existsSync(paths.NVD_KEY_FILE)) return fs.readFileSync(paths.NVD_KEY_FILE, 'utf8').trim();
  return null;
}

function persist(key) {
  fs.mkdirSync(paths.KLAP_DIR, { recursive: true });
  fs.writeFileSync(paths.NVD_KEY_FILE, key, 'utf8');
  try { fs.chmodSync(paths.NVD_KEY_FILE, 0o600); } catch { /* no-op en Windows */ }
}

module.exports = { NVD_URL, status, resolve, persist };
