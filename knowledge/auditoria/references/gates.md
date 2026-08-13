# PASO 2-3 — Gates de Jenkins (aplican a TODOS los stacks)

Cada gate en rojo es un hallazgo **CRITICO** (bloquea certificacion). Ejecuta lo que
puedas localmente; lo que no puedas ejecutar, predicelo estaticamente y marcalo como
"no ejecutado localmente" — nunca lo silencies.

## PASO 2 — Autodeteccion de umbrales

Antes de evaluar, determina los umbrales **reales** del proyecto. Lee, si existen, y
usa el valor declarado; si no existe, cae al fallback KLAP de
`knowledge/klap-standard/references/stack.md` (cobertura JaCoCo, `failBuildOnCVSS`,
`--scanners vuln` de Trivy). Siempre registra la **fuente** de cada umbral (repo vs
KLAP).

| Fuente en el repo | Que extraer | Si no existe |
|---|---|---|
| `Jenkinsfile` / `Jenkinsfile.*` | etapas y umbrales de Sonar/OWASP/Trivy declarados (`waitForQualityGate`, `failOnCVSS`, `--severity`, `--exit-code`) | usar fallback KLAP de las filas siguientes |
| `sonar-project.properties` / config del quality gate | `sonar.qualitygate`, `sonar.coverage.exclusions`, quality profile | Quality gate `PASSED`; cobertura y duplicaciones = umbral de `stack.md`; 0 bugs; 0 vulnerabilities; hotspots revisados |
| config OWASP Dependency-Check (`dependency-check.*`, `suppressions.xml`, `failBuildOnCVSS` en `build.gradle`/`pom.xml`) | CVSS de corte y suppressions | CVSS de corte = `failBuildOnCVSS` de `stack.md` |
| config Trivy (`.trivyignore`, `trivy.yaml`, args en Jenkins) | severidades que fallan y ignores | 0 vuln CRITICAL/HIGH en imagen, FS e IaC |

## PASO 3.1 — SonarQube quality gate (replicado analiticamente)

No requiere server Sonar. Si existe un reporte previo (`.scannerwork/report-task.txt`,
`build/sonar`, `target/sonar`), usalo; si no, estima desde el codigo y los reportes de
cobertura (`jacocoTestReport`, `coverage/` de Angular). Evalua:

- **Bugs / Reliability rating** — nulls, recursos sin cerrar, comparaciones erroneas.
- **Vulnerabilities / Security rating** — inyeccion, secrets hardcodeados (ver
  `knowledge/klap-standard/references/seguridad.md`), deserializacion insegura.
- **Security hotspots** — deben estar revisados (crypto, SSRF, CORS, permisos).
- **Code smells / Maintainability rating** — complejidad ciclomatica (CC<10),
  duplicacion, metodos largos, dead code.
- **Cobertura y duplicaciones** — contra el umbral del PASO 2. Reporta el % encontrado
  y de donde lo sacaste.

Resultado: `PASSED` / `FAILED` (predicho) + metricas que lo determinan.

## PASO 3.2 — OWASP Dependency-Check (CVEs en dependencias)

- Si `dependency-check` esta instalado: correr sobre `build.gradle`/`pom.xml`/
  `package.json` y leer el reporte.
- Si no: analizar el arbol de dependencias declaradas y reportar CVEs conocidos por
  version.
- Aplicar suppressions del repo si existen. Reportar cada CVE por **CVSS**,
  componente y version.
- **Bloqueante:** cualquier CVE con CVSS por encima del umbral del PASO 2 sin
  supresion justificada.

## PASO 3.3 — Trivy (imagen / filesystem / IaC)

- `trivy fs .` — vulnerabilidades en dependencias y secrets en el arbol.
- `trivy image <img>` — si hay `Dockerfile` o imagen publicada (analizar imagen base
  y capas).
- `trivy config .` — misconfiguraciones de IaC: `Dockerfile`, `template.yaml` (SAM),
  `serverless.yml`, CDK.
- Respetar `.trivyignore`. Reportar por severidad.
- **Bloqueante:** vuln CRITICAL/HIGH o secret detectado sin ignore justificado.

## PASO 3.4 — Frescura de las definiciones de CVE

Ya se resolvio en el PASO 0 (`preflight-cve.md`). Al reportar 3.2 y 3.3, arrastra el
estado de cada base a la tabla del informe: un veredicto APTO con definiciones viejas
no es confiable — ver el efecto en el veredicto en `veredicto.md`.
