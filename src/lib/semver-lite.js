'use strict';

/**
 * Parser y comparador minimo de versiones contra pisos ("floor").
 * Toda spec de la politica de stack es un piso abierto: "21", "21.x",
 * "21+", "21.x+", "3.5.16+" significan lo mismo, "version >= la parte
 * numerica dada, sin techo" -- no hay rangos acotados por decision del
 * equipo (auditoria 2026-08-18: se descarto modelar bandas cerradas por
 * simplicidad).
 */

function parseVersion(raw) {
  if (raw === null || raw === undefined) return null;
  const cleaned = String(raw).replace(/^[\^~v=\s]+/i, '').trim();
  const match = /^(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(cleaned);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: match[2] !== undefined ? Number(match[2]) : 0,
    patch: match[3] !== undefined ? Number(match[3]) : 0,
  };
}

function compare(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

/** "21.x+" / "3.5.16+" / "21" -> {major,minor,patch} (el "+"/".x" se ignoran, el piso es siempre abierto). */
function parseFloorSpec(spec) {
  const cleaned = String(spec).replace(/\.x/gi, '').replace(/\+\s*$/, '').trim();
  return parseVersion(cleaned);
}

/** true/false si version cumple el piso; null si alguno de los dos no se pudo interpretar. */
function meetsFloor(versionStr, spec) {
  const v = parseVersion(versionStr);
  const floor = parseFloorSpec(spec);
  if (!v || !floor) return null;
  return compare(v, floor) >= 0;
}

module.exports = { parseVersion, compare, parseFloorSpec, meetsFloor };
