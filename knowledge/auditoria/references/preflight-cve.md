# PASO 0 — Pre-flight de definiciones de CVE (detalle)

Garantiza que los escaneres evaluaran con definiciones frescas antes de auditar.
Actualizar las definiciones no rompe el "solo lectura" del skill `auditoria`: toca
caches locales de las herramientas (`~/.klap/tools`, cache de Trivy), nunca el
repositorio.

## Como medir la antiguedad de cada base

| Base | Como medirla |
|---|---|
| Trivy Vulnerability DB | `trivy --version` → campo `UpdatedAt` del bloque *Vulnerability DB* |
| Trivy Java DB | `trivy --version` → campo `UpdatedAt` del bloque *Java DB* |
| NVD (Dependency-Check) | Fecha de modificacion de la base en el `data/` de la instalacion: `~/.klap/tools/dependency-check/data` si la instalo `klap depcheck`; si `dependency-check` esta en el PATH, el `data/` junto al binario |

Si una herramienta **no esta instalada**, no es un hallazgo de este paso: registralo
como `no disponible` y su gate queda "no ejecutado localmente" (ver `gates.md`).

## Umbrales de vencimiento

- **Trivy** — vencida si tiene mas de 24 h (la DB se publica cada 6 h).
- **NVD** — vencida si tiene mas de 7 dias.

## Deteccion de la NVD API Key

Mismo orden que usa `klap cve-update`: variable de entorno `NVD_API_KEY` →
`~/.klap/nvd-api-key.txt`. Registra **solo la fuente**, nunca el valor de la key.

## Matriz de decision

Los flags de `klap cve-update` son identicos en Windows y Linux/mac (ver
`bin/klap.js` / `src/commands/tools.js`: `--nvd-api-key <key>`, `--data <dir>`,
`--trivy-only`, `--depcheck-only`, `--help`), asi que no hay variantes por SO.

| Estado | Accion |
|---|---|
| Todo fresco | Registra las fechas y continua al PASO 1 |
| Trivy vencida | `klap cve-update --trivy-only` |
| NVD vencida **con** key | `klap cve-update --depcheck-only` |
| NVD vencida **sin** key | No la actualices (sin key va throttleada y tarda 1-2 h). Avisa al dev que solicite la key en https://nvd.nist.gov/developers/request-an-api-key y la registre con `klap cve-update --nvd-api-key <tu-key>`. Continua la auditoria con la base marcada como vencida |
| Ambas vencidas y hay key | Un solo `klap cve-update` |

Si una actualizacion falla, no abortes la auditoria: registra el error y sigue con
la base vencida marcada como tal.

## Tabla de registro

Alimenta el informe (PASO 6) y el dashboard (PASO 7) del skill `auditoria`:

| Base | Fecha | Estado |
|---|---|---|
| Trivy Vulnerability DB | {fecha} | fresca / actualizada ahora / vencida / no disponible |
| Trivy Java DB | {fecha} | ... |
| NVD (Dependency-Check) | {fecha} | ... |

**NVD API Key:** detectada (`{fuente}`) / no detectada.

## Efecto en el veredicto

Todo gate evaluado con definiciones en estado `vencida` genera un hallazgo **MEDIO**
("gate evaluado con definiciones de CVE desactualizadas") y el veredicto no puede
ser APTO limpio: como minimo *APTO CON OBSERVACIONES*. Por si solo no degrada a NO
APTO — ver la formula completa en `veredicto.md`.
