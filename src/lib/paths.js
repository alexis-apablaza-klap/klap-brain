'use strict';

const os = require('os');
const path = require('path');

const REPO_ROOT = path.join(__dirname, '..', '..');
const HOME = os.homedir();
const CLAUDE_DIR = path.join(HOME, '.claude');
const KLAP_DIR = path.join(HOME, '.klap');

module.exports = {
  REPO_ROOT,
  HOME,
  CLAUDE_DIR,
  KLAP_DIR,
  CLAUDE_MD: path.join(CLAUDE_DIR, 'CLAUDE.md'),
  CLAUDE_SKILLS: path.join(CLAUDE_DIR, 'skills'),
  CLAUDE_COMMANDS: path.join(CLAUDE_DIR, 'commands'),
  CLAUDE_WORKFLOWS: path.join(CLAUDE_DIR, 'workflows'),
  KLAP_CONFIG: path.join(KLAP_DIR, 'config.json'),
  NVD_KEY_FILE: path.join(KLAP_DIR, 'nvd-api-key.txt'),
  TOOLS_DIR: path.join(KLAP_DIR, 'tools'),
  TOPOLOGY_JSON: path.join(REPO_ROOT, 'topology', 'topology.json'),
  PRODUCTOS_YML: path.join(REPO_ROOT, 'topology', 'productos.yml'),
  MAP_MD: path.join(REPO_ROOT, 'topology', 'MAP.md'),
  MEMORY_DIR: path.join(REPO_ROOT, 'memory'),
  MEMORY_INDEX: path.join(REPO_ROOT, 'memory', 'INDEX.md'),
  KNOWLEDGE_DIR: path.join(REPO_ROOT, 'knowledge'),
  STACK_YML: path.join(REPO_ROOT, 'knowledge', 'klap-standard', 'references', 'stack.yml'),
};
