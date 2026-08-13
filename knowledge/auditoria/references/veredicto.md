# PASO 5-7 — Veredicto, informe Markdown y dashboard

## PASO 5 — Como se calcula el veredicto

| Veredicto | Condicion |
|---|---|
| **APTO** | Sonar quality gate `PASSED` (predicho) **y** 0 CVE por encima del umbral (OWASP DC) **y** 0 Trivy CRITICAL/HIGH **y** cobertura/duplicacion dentro del umbral **y** 0 hallazgos CRITICO/ALTO del estandar KLAP |
| **APTO CON OBSERVACIONES** | Todos los gates en verde y solo hallazgos MEDIO / BAJO / SUGERENCIA (incluye el MEDIO automatico de CVE vencida del PASO 0) |
| **NO APTO** | Cualquier gate en rojo, o cualquier hallazgo CRITICO/ALTO |

Severidades de hallazgos (alineadas a `code-review-expert` / `kafka-audit`):

- **CRITICO** — bloquea certificacion (gate rojo, perdida de datos, vuln CRITICAL,
  secret expuesto).
- **ALTO** — corregir antes de certificar (vuln HIGH, cobertura bajo umbral, bug de
  seguridad).
- **MEDIO** — configuracion suboptima / inconsistencia.
- **BAJO / SUGERENCIA** — calidad, naming, mejoras.

## PASO 6 — Informe Markdown

Genera el archivo `auditoria-{nombre-proyecto}-{YYYY-MM-DD}.md` con este formato:

```markdown
# Informe de Auditoria de Certificacion — {NOMBRE_PROYECTO}

**Fecha:** {FECHA}
**Stack(s) detectado(s):** {Spring Boot / Lambda / API REST / Angular}
**Veredicto:** APTO / APTO CON OBSERVACIONES / NO APTO

## Frescura de definiciones de CVE

| Base | Fecha | Estado |
|------|-------|--------|
| Trivy Vulnerability DB | {fecha} | fresca / actualizada / vencida / no disponible |
| Trivy Java DB | {fecha} | ... |
| NVD (Dependency-Check) | {fecha} | ... |

**NVD API Key:** detectada / no detectada

## Resumen de gates de Jenkins

| Gate | Estado | Umbral usado | Fuente umbral | Ejecutado |
|------|--------|--------------|---------------|-----------|
| SonarQube quality gate | PASSED/FAILED | cobertura>=X%, 0 bugs... | repo / KLAP | analitico |
| OWASP Dependency-Check | OK/FAIL | CVSS>=X | repo / KLAP | trivy? dc? / estatico |
| Trivy (image/fs/config) | OK/FAIL | CRITICAL/HIGH | repo / KLAP | ejecutado / no ejecutado |

## Resumen de hallazgos

| Severidad | Cantidad |
|-----------|----------|
| CRITICO | X |
| ALTO | X |
| MEDIO | X |
| BAJO | X |
| SUGERENCIA | X |

## Hallazgos (por severidad)

### [CRITICO-001] {Titulo}
**Gate/Dimension:** Sonar / OWASP DC / Trivy / KLAP-{stack}
**Archivo:** `{ruta}:{linea}`
**Descripcion:** {que y por que bloquea certificacion}
**Accion requerida:** {como resolverlo — que skill usar}

(... resto de severidades con la misma estructura ...)

## Bloqueantes para certificar
- [ ] [CRITICO-00X] {breve}
- [ ] [ALTO-00X] {breve}
```

No apliques correcciones. Si el dev pide arreglar, indicale la skill correspondiente
(`code-review-expert`, `kafka-audit`, `sdd-microservice`, etc.) por cada bloqueante.

### Datos estructurados (fuente del dashboard)

Ademas del Markdown, construye en memoria un objeto de datos con **exactamente** esta
forma. Es la **unica fuente** del dashboard HTML (PASO 7): no reparsees el Markdown
para graficar.

```json
{
  "project": "{nombre-proyecto}",
  "date": "{YYYY-MM-DD}",
  "stacks": ["Spring Boot", "Angular"],
  "verdict": "APTO | APTO CON OBSERVACIONES | NO APTO",
  "gates": [
    { "name": "SonarQube", "status": "PASSED|FAILED", "threshold": "cobertura>=X%, 0 bugs...", "source": "repo|KLAP", "executed": "analitico" },
    { "name": "OWASP Dependency-Check", "status": "OK|FAIL", "threshold": "CVSS>=X", "source": "repo|KLAP", "executed": "ejecutado|estatico" },
    { "name": "Trivy", "status": "OK|FAIL", "threshold": "CRITICAL/HIGH", "source": "repo|KLAP", "executed": "ejecutado|no ejecutado" }
  ],
  "cveDefinitions": {
    "trivyVulnDb": { "updatedAt": "YYYY-MM-DDTHH:mmZ", "state": "fresca|actualizada|vencida|no disponible" },
    "trivyJavaDb": { "updatedAt": "YYYY-MM-DDTHH:mmZ", "state": "fresca|actualizada|vencida|no disponible" },
    "nvd":         { "updatedAt": "YYYY-MM-DDTHH:mmZ", "state": "fresca|actualizada|vencida|no disponible", "apiKey": "detectada|no detectada" }
  },
  "metrics": { "coverage": 87.5, "coverageThreshold": 95, "duplication": 4.1, "duplicationThreshold": 3 },
  "findingsBySeverity": { "CRITICO": 0, "ALTO": 0, "MEDIO": 0, "BAJO": 0, "SUGERENCIA": 0 },
  "findings": [
    { "id": "CRITICO-001", "severity": "CRITICO", "gate": "Trivy", "location": "Dockerfile:3", "description": "...", "remediation": "Como solucionarlo para la proxima iteracion (que skill usar)" }
  ],
  "blockers": ["[CRITICO-001] breve", "[ALTO-001] breve"]
}
```

Reglas: `metrics.coverage`/`duplication` son numeros (`null` si no se pudo medir).
`findingsBySeverity` son conteos. Cada `finding.remediation` debe decir **como
solucionar** la incidencia para pasar en la siguiente iteracion. `blockers` lista
solo CRITICO/ALTO. En `cveDefinitions`, `updatedAt` va en `null` cuando la
herramienta no esta instalada; los datos salen de la tabla del PASO 0
(`preflight-cve.md`).

## PASO 7 — Dashboard HTML

Invoca la skill **`web-artifacts-builder`** pasandole el objeto JSON de la seccion
anterior para generar el archivo `auditoria-{nombre-proyecto}-{YYYY-MM-DD}.html` en
la raiz del proyecto, junto al informe `.md`.

El dashboard debe tener:

- **Arriba (graficos):** banner de veredicto, estado por gate (Sonar/OWASP/Trivy),
  dona/barras de hallazgos por severidad, y gauges de cobertura y duplicacion vs
  umbral.
- **Frescura de CVE:** badges junto al estado de los gates, uno por base de
  `cveDefinitions` (rojo si `vencida`, gris si `no disponible`), con la fecha de la
  base.
- **Abajo (detalle):** tabla de hallazgos con severidad, gate, `archivo:linea`,
  descripcion y **como solucionar** (columna de remediacion), mas el checklist de
  bloqueantes.

El HTML es autocontenido (sin CDNs, CSP-safe) — reglas completas en la skill
`web-artifacts-builder`. Reporta al dev la ruta del `.md` y del `.html` generados.
