'use strict';

const fs = require('fs');
const { spawnSync } = require('child_process');
const paths = require('../lib/paths');

function commandExists(cmd) {
  const probe = process.platform === 'win32' ? 'where' : 'which';
  return spawnSync(probe, [cmd], { stdio: 'ignore' }).status === 0;
}

function run(_args) {
  console.log('klap doctor\n');
  let issues = 0;
  let hardFail = false;

  function check(label, ok, detail, { hard = false } = {}) {
    console.log(`  [${ok ? 'OK' : '!!'}] ${label}${detail ? ` — ${detail}` : ''}`);
    if (!ok) {
      issues++;
      if (hard) hardFail = true;
    }
  }

  check('Node >= 18', Number(process.versions.node.split('.')[0]) >= 18, process.version, { hard: true });
  check('docker', commandExists('docker'), null, { hard: true });
  check('git', commandExists('git'), null, { hard: true });
  check('topology/topology.json', fs.existsSync(paths.TOPOLOGY_JSON), fs.existsSync(paths.TOPOLOGY_JSON) ? null : 'correr "klap scan"');
  check('~/.klap/config.json', fs.existsSync(paths.KLAP_CONFIG), fs.existsSync(paths.KLAP_CONFIG) ? null : 'usando defaults');
  check('~/.claude/CLAUDE.md', fs.existsSync(paths.CLAUDE_MD), fs.existsSync(paths.CLAUDE_MD) ? null : 'correr "klap install"');

  const legacySkills = fs.existsSync(paths.CLAUDE_SKILLS)
    ? fs.readdirSync(paths.CLAUDE_SKILLS).filter((f) => f.endsWith('.md'))
    : [];
  check(
    '~/.claude/skills/ sin archivos legacy',
    legacySkills.length === 0,
    legacySkills.length ? `${legacySkills.length} .md suelto(s) (formato viejo, no descubrible) — correr "klap migrate --clean-legacy"` : null,
  );

  const legacyCommands = fs.existsSync(paths.CLAUDE_COMMANDS)
    ? fs.readdirSync(paths.CLAUDE_COMMANDS)
    : [];
  check(
    '~/.claude/commands/ sin huella del ecosistema anterior',
    legacyCommands.length === 0,
    legacyCommands.length ? `${legacyCommands.length} entrada(s) (klap-brain no instala nada ahi) — correr "klap migrate --clean-legacy"` : null,
  );

  console.log(issues === 0 ? '\nTodo en orden.' : `\n${issues} item(s) pendiente(s) — ver arriba.`);
  return !hardFail;
}

module.exports = { run };
