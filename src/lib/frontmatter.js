'use strict';

const yamlLite = require('./yaml-lite');

const FM_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

function parse(text) {
  const match = FM_RE.exec(text);
  if (!match) return { data: {}, content: text };
  const data = yamlLite.parse(match[1]) || {};
  return { data, content: match[2] };
}

function scalarToYaml(v) {
  if (Array.isArray(v)) return `[${v.map((x) => JSON.stringify(x)).join(', ')}]`;
  if (typeof v === 'string') return v;
  return String(v);
}

function stringify(data, content) {
  const lines = Object.entries(data).map(([k, v]) => `${k}: ${scalarToYaml(v)}`);
  return `---\n${lines.join('\n')}\n---\n${content}`;
}

module.exports = { parse, stringify };
