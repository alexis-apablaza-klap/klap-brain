'use strict';

/**
 * Adaptador de topologia para microfrontends Angular (prefijo `mcf-`).
 * La integracion vive en src/environments/environment.*.ts como un objeto
 * TS/JS literal (no JSON valido: comillas simples, sin comillas en claves).
 * Se extrae con una regex clave:'valor' sobre el texto crudo — no se
 * evalua ni se parsea TypeScript. Limitacion conocida: no distingue
 * codigo comentado de codigo activo.
 *
 * Bonus de la misma pasada: si una clave sugiere secreto (token/secret/
 * apikey/password) y trae un literal no vacio, se reporta SOLO el nombre
 * de la clave y el archivo — nunca el valor — como hallazgo de seguridad.
 */

const fs = require('fs');
const path = require('path');

const ENV_DIR_REL = path.join('src', 'environments');
const KV_RE = /([\w.]+)\s*:\s*(['"])((?:(?!\2).)*)\2/g;
const URL_RE = /^https?:\/\/([a-zA-Z0-9.-]+)/;
const SECRET_KEY_RE = /token|secret|apikey|api_key|password/i;
const IGNORED_HOSTS = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|example\.com)/i;

function findEnvironmentFiles(repoPath) {
  const dir = path.join(repoPath, ENV_DIR_REL);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter((f) => /^environment(\.[\w-]+)?\.ts$/.test(f))
    .map((f) => path.join(dir, f));
}

function envNameOf(filename) {
  const m = /^environment\.([\w-]+)\.ts$/.exec(filename);
  return m ? m[1] : 'default';
}

function scan(repoPath) {
  const files = findEnvironmentFiles(repoPath);
  const componentId = path.basename(repoPath);

  if (!files.length) {
    return { components: [], skipped: [repoPath], reason: 'sin src/environments/environment*.ts' };
  }

  const apisUnion = new Set();
  const secretFindings = [];
  const envs = [];

  for (const file of files) {
    envs.push(envNameOf(path.basename(file)));
    const text = fs.readFileSync(file, 'utf8');
    let match;
    KV_RE.lastIndex = 0;
    while ((match = KV_RE.exec(text))) {
      const [, key, , value] = match;
      const urlMatch = URL_RE.exec(value);
      if (urlMatch && !IGNORED_HOSTS.test(urlMatch[1])) apisUnion.add(urlMatch[1]);
      if (SECRET_KEY_RE.test(key) && value.trim().length > 0) {
        secretFindings.push({ key, file: path.basename(file) });
      }
    }
  }

  return {
    components: [{
      id: componentId,
      type: 'mcf',
      domain: componentId.split('-')[1] || 'unknown',
      source: 'angular-mfe',
      envs: envs.sort(),
      topics: { input: [], output: [], notification: [], dlq: [], other: [] },
      database: { hasDatabase: false, schema: null },
      externalApis: [...apisUnion],
      externalApisConfidence: 'declared',
      securityFindings: secretFindings.length
        ? [{ type: 'hardcoded-secret-literal', items: secretFindings }]
        : [],
    }],
    skipped: [],
  };
}

module.exports = { scan, findEnvironmentFiles };
