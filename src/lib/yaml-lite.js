'use strict';

/**
 * Parser YAML minimo (subset) para topology/productos.yml.
 * Soporta: mapas anidados por indentacion, listas de escalares,
 * listas de mapas ("- key: value" seguido de claves hermanas indentadas),
 * escalares string/number/bool/null, comillas simples y dobles.
 * No soporta: flow style ({}/[]), anchors, multilinea, tabs.
 */
/** Divide "a, 'b, c', d" respetando comillas -> ["a", "'b, c'", "d"]. */
function splitFlowItems(inner) {
  const items = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  for (const c of inner) {
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    if (c === ',' && !inSingle && !inDouble) {
      items.push(current);
      current = '';
    } else {
      current += c;
    }
  }
  items.push(current);
  return items.map((s) => s.trim()).filter((s) => s !== '');
}

/** Corta un comentario final "# ..." fuera de comillas. Ej: `x: 1 # nota` -> `x: 1`. */
function stripInlineComment(line) {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === "'" && !inDouble) inSingle = !inSingle;
    else if (c === '"' && !inSingle) inDouble = !inDouble;
    else if (c === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i).replace(/\s+$/, '');
    }
  }
  return line;
}

function parse(text) {
  const rawLines = text.split(/\r?\n/);
  const lines = [];
  for (const raw of rawLines) {
    if (/^\s*#/.test(raw)) continue;
    if (raw.includes('\t')) {
      throw new Error(`yaml-lite: tabs no soportados: "${raw}"`);
    }
    const stripped = stripInlineComment(raw);
    if (stripped.trim() === '') continue;
    const indent = stripped.match(/^(\s*)/)[1].length;
    lines.push({ indent, content: stripped.slice(indent) });
  }

  let idx = 0;

  function parseScalar(v) {
    v = v.trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      return v.slice(1, -1);
    }
    if (v === '[]') return [];
    if (v === '{}') return {};
    if (v.startsWith('[') && v.endsWith(']')) {
      return splitFlowItems(v.slice(1, -1)).map(parseScalar);
    }
    if (v === 'true') return true;
    if (v === 'false') return false;
    if (v === 'null' || v === '~' || v === '') return null;
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    return v;
  }

  function splitKeyValue(content) {
    const colonIdx = content.indexOf(':');
    if (colonIdx === -1) return [content.trim(), ''];
    return [content.slice(0, colonIdx).trim(), content.slice(colonIdx + 1).trim()];
  }

  function parseBlock(indent) {
    if (idx >= lines.length || lines[idx].indent < indent) return null;
    if (lines[idx].content.startsWith('- ') || lines[idx].content === '-') {
      return parseList(indent);
    }
    return parseMap(indent);
  }

  function parseList(indent) {
    const arr = [];
    while (idx < lines.length && lines[idx].indent === indent &&
      (lines[idx].content.startsWith('- ') || lines[idx].content === '-')) {
      const line = lines[idx];
      const rest = line.content === '-' ? '' : line.content.slice(2);
      idx++;
      if (rest === '') {
        arr.push(parseBlock(indent + 2));
        continue;
      }
      if (rest.includes(':')) {
        const map = {};
        const [k, v] = splitKeyValue(rest);
        map[k] = v === '' ? parseBlock(indent + 4) : parseScalar(v);
        while (idx < lines.length && lines[idx].indent === indent + 2) {
          const [k2, v2] = splitKeyValue(lines[idx].content);
          idx++;
          map[k2] = v2 === '' ? parseBlock(indent + 4) : parseScalar(v2);
        }
        arr.push(map);
      } else {
        arr.push(parseScalar(rest));
      }
    }
    return arr;
  }

  function parseMap(indent) {
    const map = {};
    while (idx < lines.length && lines[idx].indent === indent && !lines[idx].content.startsWith('- ')) {
      const [k, v] = splitKeyValue(lines[idx].content);
      idx++;
      map[k] = v === '' ? parseBlock(indent + 2) : parseScalar(v);
    }
    return map;
  }

  return parseBlock(0) || {};
}

/** Aplana un objeto anidado a notacion de puntos: {a:{b:1}} -> {"a.b": 1}. */
function flatten(obj, prefix = '', out = {}) {
  if (obj === null || obj === undefined) return out;
  if (Array.isArray(obj)) {
    out[prefix] = obj.join(',');
    return out;
  }
  if (typeof obj === 'object') {
    for (const [k, v] of Object.entries(obj)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out);
    }
    return out;
  }
  out[prefix] = String(obj);
  return out;
}

module.exports = { parse, flatten };
