'use strict';

/**
 * Instaladores de las herramientas de seguridad usadas por el skill de
 * auditoria (Trivy + OWASP Dependency-Check) y el refresco de sus bases de
 * CVE. Puerto a Node puro del par install-trivy/install-depcheck/cve-update
 * .ps1+.sh+.bat del ecosistema anterior -- una sola implementacion en vez
 * de 3 por herramienta, con un solo branch por process.platform en lugar de
 * un archivo completo por SO.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const paths = require('../lib/paths');
const nvd = require('../lib/nvd');

const DEPCHECK_VERSION = '12.2.0';
const DEPCHECK_DIR = path.join(paths.TOOLS_DIR, 'dependency-check');

function commandExists(cmd) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [cmd], { stdio: 'ignore' }).status === 0;
}

function sh(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  return result.status ?? 1;
}

function installTrivy() {
  if (commandExists('trivy')) {
    console.log('Trivy ya esta instalado.');
    return 0;
  }
  if (process.platform === 'win32') {
    if (commandExists('winget')) return sh('winget', ['install', '-e', '--id', 'AquaSecurity.trivy']);
    if (commandExists('choco')) return sh('choco', ['install', 'trivy', '-y']);
  } else {
    if (commandExists('brew')) return sh('brew', ['install', 'trivy']);
    if (commandExists('apt-get')) return sh('sudo', ['apt-get', 'install', '-y', 'trivy']);
  }
  console.error('No se encontro winget/choco/brew/apt-get. Instala Trivy manualmente: https://aquasecurity.github.io/trivy');
  return 1;
}

function installDepcheck() {
  if (commandExists('dependency-check') || commandExists('dependency-check.sh') || commandExists('dependency-check.bat')) {
    console.log('OWASP Dependency-Check ya esta instalado.');
    return 0;
  }
  if (process.platform === 'win32' && commandExists('choco')) {
    return sh('choco', ['install', 'dependency-check', '-y']);
  }

  const zipName = `dependency-check-${DEPCHECK_VERSION}-release.zip`;
  const url = `https://github.com/dependency-check/DependencyCheck/releases/download/v${DEPCHECK_VERSION}/${zipName}`;
  fs.mkdirSync(paths.TOOLS_DIR, { recursive: true });
  const zipPath = path.join(os.tmpdir(), zipName);
  console.log(`Descargando ${url} ...`);
  const dl = process.platform === 'win32'
    ? sh('powershell.exe', ['-NoProfile', '-Command', `Invoke-WebRequest -Uri '${url}' -OutFile '${zipPath}'`])
    : sh('curl', ['-L', '-o', zipPath, url]);
  if (dl !== 0) return dl;

  fs.rmSync(DEPCHECK_DIR, { recursive: true, force: true });
  const extract = process.platform === 'win32'
    ? sh('powershell.exe', ['-NoProfile', '-Command', `Expand-Archive -Path '${zipPath}' -DestinationPath '${paths.TOOLS_DIR}' -Force`])
    : sh('unzip', ['-q', '-o', zipPath, '-d', paths.TOOLS_DIR]);
  if (extract !== 0) return extract;

  const bin = process.platform === 'win32' ? path.join(DEPCHECK_DIR, 'bin') : path.join(DEPCHECK_DIR, 'bin');
  console.log(`Instalado en ${DEPCHECK_DIR}. Agrega ${bin} al PATH para usar "dependency-check" directamente.`);
  return 0;
}

function parseCveArgs(args) {
  const out = { trivyOnly: false, depcheckOnly: false, help: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--trivy-only') out.trivyOnly = true;
    else if (a === '--depcheck-only') out.depcheckOnly = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--nvd-api-key') out.nvdApiKey = args[++i];
    else if (a === '--data') out.data = args[++i];
  }
  return out;
}

function cveUpdateHelp() {
  const status = nvd.status();
  console.log('Uso: klap cve-update [--nvd-api-key <key>] [--data <dir>] [--trivy-only] [--depcheck-only] [--help]');
  console.log(status.found
    ? `NVD API Key: detectada (${status.source})`
    : `NVD API Key: no detectada — sin key la base NVD tarda 1-2 h. Solicitala en ${nvd.NVD_URL}`);
}

function cveUpdate(args) {
  const opts = parseCveArgs(args);
  if (opts.help) return cveUpdateHelp();
  if (opts.nvdApiKey) nvd.persist(opts.nvdApiKey);

  let code = 0;
  if (!opts.depcheckOnly) {
    code |= sh('trivy', ['image', '--download-db-only']);
    code |= sh('trivy', ['image', '--download-java-db-only']);
    code |= sh('trivy', ['clean', '--checks-bundle']);
  }
  if (!opts.trivyOnly) {
    const key = nvd.resolve(opts.nvdApiKey);
    const dcArgs = ['--updateonly'];
    if (key) dcArgs.push('--nvdApiKey', key);
    if (opts.data) dcArgs.push('--data', opts.data);
    const bin = process.platform === 'win32' ? 'dependency-check.bat' : 'dependency-check.sh';
    code |= sh(commandExists(bin) ? bin : bin.replace(/\.(bat|sh)$/, ''), dcArgs);
  }
  process.exitCode = code ? 1 : 0;
}

function run(args) {
  const [tool, ...rest] = args;
  if (tool === 'trivy') { process.exitCode = installTrivy(); return; }
  if (tool === 'depcheck') { process.exitCode = installDepcheck(); return; }
  if (tool === 'cve-update') { cveUpdate(rest); return; }
  console.error('Uso: klap <trivy|depcheck|cve-update> [...args]');
  process.exitCode = 1;
}

module.exports = { run, installTrivy, installDepcheck, cveUpdate };
