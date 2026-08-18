---
name: auditoria
description: Audita un entregable KLAP (Spring Boot, Lambda, API, Angular) antes de certificar: predice gates Jenkins y emite veredicto APTO/OBSERVACIONES/NO APTO con informe MD y dashboard HTML. Solo lectura.
disable-model-invocation: true
allowed-tools: Read, Write, Grep, Glob, Bash, TaskCreate, TaskUpdate, TaskList
---

# Auditoria de pre-certificacion — Estandar KLAP + gates de Jenkins

Objetivo: **predecir si el entregable pasara los quality gates del pipeline Jenkins**
(SonarQube, OWASP Dependency-Check, Trivy) y si cumple el estandar KLAP SVA. Cada
desviacion es un hallazgo con severidad, y todo se resuelve en un veredicto unico.

> **Solo lectura.** No se modifica codigo. Se detecta, se ejecutan escaneres cuando
> estan disponibles, se analiza y se reporta. Las correcciones las hace el dev con
> las skills que indique cada hallazgo.

## Flujo

| Paso | Que hace | Detalle |
|---|---|---|
| 0 | Pre-flight de definiciones de CVE (Trivy/NVD) | `references/preflight-cve.md` |
| 1 | Deteccion de stack(s) del entregable | tabla mas abajo |
| 2-3 | Autodeteccion de umbrales + gates de Jenkins (Sonar, OWASP DC, Trivy) | `references/gates.md` |
| 4 | Estandar KLAP por stack detectado | `references/estandar-por-stack.md` |
| 5-6 | Calculo del veredicto + informe Markdown | `references/veredicto.md` |
| 7 | Dashboard HTML | skill `web-artifacts-builder` |

## PASO 0 — Pre-flight de CVE (resumen)

Auditar con una base de CVE vieja produce falsos APTO. Antes de correr los gates:

1. Medir antiguedad: Trivy Vulnerability DB, Trivy Java DB, NVD (Dependency-Check).
2. Vencimiento: Trivy > 24 h · NVD > 7 dias.
3. Si esta vencida, refrescarla con `klap cve-update` (flags `--trivy-only` /
   `--depcheck-only`; sin `NVD_API_KEY` la NVD va throttleada 1-2 h, no la dispares
   sin key — avisa y sigue auditando con la base marcada como vencida).
4. Registrar fuente/fecha/estado de cada base — alimenta el informe (PASO 6) y el
   dashboard (PASO 7).

Comandos exactos para medir cada base, orden de resolucion de la API key y la matriz
completa de decision estan en `references/preflight-cve.md`. Actualizar cachés locales
de herramientas no rompe el "solo lectura": nunca toca el repositorio.

**Efecto en el veredicto:** un gate evaluado con base `vencida` es hallazgo **MEDIO**
y el veredicto no puede ser APTO limpio (minimo *APTO CON OBSERVACIONES*). Por si solo
no degrada a NO APTO.

## PASO 1 — Deteccion de stack

Puede haber mas de un stack (monorepo). Los gates de Jenkins (PASO 2-3) aplican a
**todos** los stacks detectados; el estandar KLAP (PASO 4) aplica solo a los presentes.

| Stack | Marcadores | Checklist en `estandar-por-stack.md` |
|---|---|---|
| Microservicio Spring Boot | `build.gradle`/`pom.xml` + `@SpringBootApplication` | seccion Java |
| AWS Lambda | `template.yaml`/`serverless.yml`/`cdk.json` + handlers | seccion Lambda |
| API REST | controllers REST / `openapi`/`swagger`, no es Lambda | seccion API REST |
| Sitio Angular | `angular.json` + `package.json` con `@angular/core` | seccion Angular |

## PASO 2-3 — Gates de Jenkins

Cada gate en rojo es hallazgo **CRITICO** (bloquea certificacion). Ejecuta lo que
puedas localmente; lo que no, predicelo estaticamente y marcalo "no ejecutado
localmente" — nunca lo silencies. Los tres gates (SonarQube replicado
analiticamente, OWASP Dependency-Check, Trivy fs/image/config), como se
autodetectan los umbrales del repo vs el fallback KLAP, y como se arrastra el
estado de frescura de CVE del PASO 0: `references/gates.md`. Los umbrales
numericos (CVSS de corte, cobertura minima, scanners de Trivy) son los de
`knowledge/klap-standard/references/stack.md` y `seguridad.md` — no se redefinen
aqui.

## PASO 4 — Estandar KLAP por stack

Reutiliza las skills ya instaladas (`code-review-expert`, `../sdd/references/checklist.md`,
`../sdd/references/defectos-tipicos.md`, `kafka-audit` si aplica) — el detalle de que revisar
por stack (Java, Lambda, API REST, Angular) esta en `references/estandar-por-stack.md`.
No se duplican aqui reglas ya cubiertas por `klap-standard`.

## PASO 5 — Veredicto

| Veredicto | Condicion |
|---|---|
| **APTO** | Todos los gates en verde (predicho) **y** 0 hallazgos CRITICO/ALTO |
| **APTO CON OBSERVACIONES** | Gates en verde, solo hallazgos MEDIO/BAJO/SUGERENCIA |
| **NO APTO** | Cualquier gate en rojo, o algun hallazgo CRITICO/ALTO |

Severidades: **CRITICO** (bloquea), **ALTO** (corregir antes de certificar), **MEDIO**
(config subóptima), **BAJO/SUGERENCIA** (calidad). Formula exacta, formato del
informe Markdown y el contrato JSON que alimenta el dashboard: `references/veredicto.md`.

## PASO 6-7 — Informe y dashboard

1. Genera `auditoria-{proyecto}-{YYYY-MM-DD}.md` con el formato de `veredicto.md`.
2. Construye el objeto de datos estructurado (misma referencia, seccion "Datos
   estructurados") — es la unica fuente del dashboard, no reparsees el Markdown.
3. Invoca la skill `web-artifacts-builder` con ese objeto para generar
   `auditoria-{proyecto}-{YYYY-MM-DD}.html` junto al `.md`.
4. Reporta al dev las rutas de ambos archivos. No apliques correcciones: por cada
   bloqueante, indica la skill que corresponde usar para resolverlo.
