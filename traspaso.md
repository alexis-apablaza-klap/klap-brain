# Traspaso de sesión — klap-brain

## 0. Sesión de auditoría (2026-08-18, posterior al cierre original)

Auditoría del entorno instalado contra lo que este documento afirmaba. Dos
hallazgos reales, ambos cerrados en esta sesión — detalle en §3/§4.2 (huella
de `eco-team-brain` en `~/.claude/workflows/`) y acá abajo (cuarto ecosistema
en `C:\klap-workspace\.claude\`).

### Cuarto ecosistema: `C:\klap-workspace\.claude\` — auditado y absorbido

Nunca evaluado por la migración original (que solo miró `eco-team-brain` y
`~/.claude`). Contenía `agents/` (10, funcionales), `commands/` (9,
funcionales) y `skills/` (9 `.md` planos, **no descubribles** — mismo
hallazgo #2 de `MIGRATION.md`, repetido en otro directorio).

**Dos contradicciones activas encontradas** — las mismas que `MIGRATION.md`
dice haber cerrado al migrar `code-review-expert`, vivas de nuevo acá:
1. Cobertura **90%** (`skills/sonarcloud-klap.md`, `agents/especialista-qa.md`,
   `commands/realizar-qa.md`, `commands/trabajar-hu.md`) vs el **95%** real
   (`klap-standard/references/stack.md`).
2. **Redis** como mecanismo de deduplicación (`skills/confluent-klap.md`) —
   klap-brain nunca lo prescribe para idempotencia.

**Absorbido a `knowledge/`:**
- `knowledge/persistencia/references/migraciones-dbmate.md` (nuevo) — hueco
  real, Dbmate nunca estaba cubierto.
- `knowledge/kafka/references/listener.md` — sección de deduplicación por
  `event_id`/constraint `UNIQUE`, rechazando Redis explícitamente.
- `knowledge/microfrontend/references/angular-reactividad.md` (nuevo) +
  entrada en el router — reactividad general Angular (RxJS/Signals),
  distinta del bootstrap single-spa que ya cubría `angular-single-spa.md`.
- **`knowledge/lambda/`** (skill nueva, 17ª) — hueco real: klap-brain tenía
  el adaptador de topología para `lbd-*` pero ningún skill de cómo
  implementar el handler.
- `knowledge/gobierno/references/hu-jira.md` — fila nueva de salida para
  `requerimientos-del-negocio.md` (convención local que `jira-klap` tenía y
  `gobierno` no).
- `knowledge/auditoria/references/gates.md` — nota sobre preferir el MCP
  `sonarqube` en vivo por sobre la predicción analítica cuando esté disponible.

**Retirado sin fold** (superado por versión real ya existente, sin contenido
único): `jira-klap`, `confluence-klap` (→ `gobierno`, con cloudId/spaceId/
Jenkins reales) · `spring-boot-klap`, `security-klap` (→ `klap-standard`).

**`commands/`+`agents/` actualizados** (no movidos — no son parte del
paradigma de klap-brain, que solo instala skills) para referenciar los
nombres reales de klap-brain en vez de los 9 skills planos, y corregir
90%→95% donde aparecía.

**Los 9 `.md` originales no se borraron** — sin red de `git` en
`klap-workspace` (no es un repo), se renombró la carpeta a
`skills.absorbido-klap-brain-2026-08-18/` como respaldo no destructivo.

**Verificado:** `npm run ci` (5 gates) + `npm test` (27) en verde, corpus
359.1/400 KB, `klap install` corrido (17 skills en `~/.claude/skills/`,
incluye `lambda`), `klap doctor` sin pendientes salvo `~/.klap/config.json`.


> Generado para continuar esta sesión abriendo Claude Code directamente en
> `C:\klap-workspace\klap-brain`. Contiene: (1) resumen de lo hecho hasta
> ahora, (2) estado actual verificable, (3) pendientes explícitos con su
> impacto, (4) copia completa del plan original que originó el repo.

## 1. Qué es este repo y por qué existe

`klap-brain` es el rediseño de `eco-team-brain` (repo hermano en
`C:\klap-workspace\eco-team-brain`, que queda intacto en disco pero
desenlazado — ver sección 3). Mismo objetivo — memoria compartida del
equipo KLAP BYSF sobre Claude Code — arquitectura distinta en 3 capas:

1. **Topología derivada** (`topology/topology.json`, `productos.yml`) — se
   regenera con `klap scan`, nunca se edita a mano salvo `productos.yml`.
2. **Memoria funcional** (`memory/*.md`) — un hecho por archivo, escrito
   cuando `klap ctx` prueba un hueco real.
3. **Skills** (`knowledge/<skill>/SKILL.md` + `references/`) — protocolos,
   estándares y templates de código, con progressive disclosure real.

El detalle completo de motivación, hallazgos verificados y decisiones de
diseño está en la **sección 4** de este documento (plan original) y en
`docs/MIGRATION.md` del repo.

## 2. Resumen de lo realizado en esta sesión

### Fase 0-4 (sesión anterior, ya cerrada antes de este traspaso)
Repo `klap-brain` construido desde cero: adaptadores de topología (219→225
componentes reales escaneados del config-server + repos locales), CLI Node
puro (`klap scan/ctx/impact/remember/review/install/rollback/migrate/doctor/
graph/config/trivy/depcheck/cve-update`), 12 skills iniciales migradas
(klap-standard, kafka, persistencia, http-cliente, excepciones, testing,
openapi, processor, microfrontend, auditoria, web-artifacts-builder, sdd),
25 tests, 4 gates de CI, commit inicial `5669a8d`.

### Esta sesión: independencia de `eco-team-brain` + 4 bloques de contenido nuevos

**Fase A — Identidad y repo remoto**
- Paquete renombrado `@rodriguezyanez/klap-brain` → `@alexis-apablaza-klap/klap-brain`.
- Repo creado en GitHub: **privado**, `github.com/alexis-apablaza-klap/klap-brain`.
- Fix: `bootstrap.ps1`/`bootstrap.sh` decían `npm install -g .` (copia) mientras
  README documentaba `npm link` (symlink) — unificado a `npm link`, que es lo
  que realmente permite que `git pull` llegue a `klap` sin reinstalar.

**Fase B — Desenlace real de `eco-team-brain`**
- `npm unlink` del paquete viejo (quitó los shims `klap`/`klap-init`/`klap-sync`/`klap-rollback`) → `npm link` de klap-brain. `klap` ahora es klap-brain.
- Bug real encontrado y corregido: `readJson` no despojaba el BOM (`\uFEFF`)
  del export de Neo4j real en Windows — `JSON.parse` fallaba siempre contra
  el archivo real (`require()` sí lo hace automático, `fs.readFileSync`+
  `JSON.parse` no). Test de regresión agregado (`test/fs-utils.test.js`).
- `klap migrate --export` rescató los 4 hechos reales del grafo viejo
  (`memory/legacy-*.md`) — 2 de ellos (`mcs-bysf-itau-tef`, `mcs-bysf-itau-
  tef-admin`) son candidatos a componentes de **vouchering-itau** una vez
  tenga repos.
- Extendido `migrate.js --clean-legacy` para barrer también
  `~/.claude/commands/` completo (798 KB / 35 entradas que ningún mecanismo
  anterior limpiaba — klap-brain nunca instala ahí).
- Ejecutado de verdad: `~/.claude` limpio de la huella vieja, `klap install`
  corrido (16 skills + `CLAUDE.md` instalado por primera vez — nunca ocurrió
  con el repo viejo), `klap doctor` en verde salvo `~/.klap/config.json`
  (usa defaults, no es un problema).

**Fase C — 4 bloques de contenido nuevo** (nunca evaluados en la migración inicial)
1. **Kafka fundido** (`kafka-implement`, 44 KB, nunca migrado): clase base
   `KafkaConfig` completa (antes solo citada) en
   `knowledge/kafka/references/kafka-config-base.md`, `client.id`+hostname
   para distinguir réplicas ECS, tests de listener/producer en
   `knowledge/testing/references/kafka.md`. Resueltos 7 conflictos de firma
   a favor de las convenciones ya establecidas (base abstracta,
   `DeadLetterPublishingRecoverer`, DLQ con mensaje original no JSON
   envuelto). Bug real corregido: `properties.md` declaraba una property
   key distinta a la que `config.md`/`listener.md` leían por `@Value` —
   nunca habría resuelto.
2. **`kafka-audit`** — nueva skill (`knowledge/kafka-audit/`), reescrita
   contra el estándar real de este repo (no contra `kafka-implement`, que
   no existe aquí), severidad alineada a `auditoria/references/veredicto.md`.
3. **`gobierno`** — nuevo bloque (`knowledge/gobierno/`) con HU (Jira/
   Confluence), CATI (comité de arquitectura) y RDC (despliegue QA/PROD).
   Pipeline documental distinto del `sdd` de código — el router lo deja
   explícito para no confundir terminología compartida (HU, Spec). Bug real
   corregido en `generate-cati.js`: nunca leía `d.diagrams`, el placeholder
   de diagrama se dibujaba siempre aunque el JSON trajera una imagen real.
4. **`code-review-expert`** — migrado como skill delgada que referencia
   `klap-standard`/`testing` en vez de repetir reglas (evita el gate
   `dedupe-check`). El original tenía 4 contradicciones con decisiones ya
   resueltas: cobertura 90% vs 95%, permitía ORM, Testcontainers/WireMock
   vs MockWebServer, sugería Redis.
5. **`release-publish`** — reescrito para el scope/repo de klap-brain, con
   el patrón HTTPS+token+background documentado como primer punto de
   troubleshooting (ver sección 3, "quirk operativo real").

**Fase D — Cierre de precisión**
- Barrido completo de punteros colgantes a nombres de skills del layout
  viejo (`sdd-checklist`, `defectos-tipicos-checklist`, `sdd-microservice`,
  `webclient`, `spring-properties`) — 0 referencias a skills inexistentes
  en todo `knowledge/` al cierre (verificado con grep exhaustivo).
- Inconsistencia cerrada en 3 archivos (`kafka/listener.md`,
  `processor/SKILL.md`, `processor/references/saga.md`): clasificaban
  errores deterministas con `IllegalArgumentException`/`IllegalStateException`,
  contradiciendo `reglas-do.md` #19 y `excepciones/jerarquia.md`, que ya
  prescriben `NonRetryableClientDataException` para exactamente ese caso.
- `.npmrc` agregado a `.gitignore` (no se creó el archivo real — requiere
  un token `write:packages` que es decisión tuya generar).

**Fase E — Verificación final**
- `npm run ci` (4 gates) + `npm test` (27 tests) en verde. Corpus:
  349.5 KB / 400 KB de techo.
- `npm pack --dry-run` confirmó el scope nuevo en el tarball.
- `.github/workflows/ci.yml` agregado (antes vacío pese a que el README ya
  documentaba `npm run ci` como mecanismo anti-regresión).
- `docs/MIGRATION.md` actualizado con los 5 bloques nuevos en "Qué sí se migró".
- Todo commiteado y pusheado — **HEAD actual: `a968f25`, sincronizado con
  `origin/master`**.

## 3. Estado actual verificable

```bash
cd C:\klap-workspace\klap-brain
git log --oneline -1        # a968f25 (docs: actualizar MIGRATION.md...)
git status -sb              # master...origin/master (sin divergencia)
klap doctor                 # todo OK salvo ~/.klap/config.json (defaults, no bloquea)
npm run ci && npm test      # 5 gates + 27 tests en verde
```

> `npm run ci` pasó de 4 a **5 gates** (2026-08-18): `scan:check` estaba
> declarado en `package.json` pero nunca encadenado — un gate fantasma que
> nadie corría. Ya se auto-omite sin fallar cuando no hay acceso local al
> config-server (`KLAP_CONFIG_SERVER`/`--source`), así que encadenarlo no
> puede romper CI remoto.

- **Repo remoto:** privado, `github.com/alexis-apablaza-klap/klap-brain`.
- **`eco-team-brain`** (repo hermano): fuente intacta en disco, pero
  desenlazado (`npm unlink`) y sin huella en `~/.claude`. `klap` en esta
  máquina apunta 100% a klap-brain.
  ⚠️ **Corrección (sesión siguiente, 2026-08-18):** esta afirmación era
  incorrecta — `~/.claude/workflows/` conservaba 137 KB / 6 archivos de
  `eco-team-brain` (`fase_spec*.md`, `sdd-impl-spec*.js`,
  `sdd-workflow.md`), y dos de ellos (`sdd-impl-spec`, `sdd-impl-spec-refactor`)
  se ofrecían como **skills invocables** con rutas rotas a
  `~/.claude/commands/` (vacío desde esta misma sesión). Causa: `migrate.js
  --clean-legacy` solo barría `_v1`/`simulacion_*` de `workflows/`, y
  `doctor.js` nunca chequeaba ese directorio. Ya corregido — ver §4.2.
- **16 skills instaladas** en `~/.claude/skills/` (14 auto-descubribles +
  `auditoria`/`kafka-audit` con `disable-model-invocation: true`, invocación
  explícita — por diseño, igual que en el repo original).
- **Quirk operativo real descubierto y documentado** (en
  `knowledge/release-publish/SKILL.md`): `git push`/`git fetch` normales
  contra este remoto pueden colgarse indefinidamente sin error — es Git
  Credential Manager intentando un flujo interactivo que no completa en un
  shell no interactivo. Workaround ya probado: embeber el token en la URL
  y correr el comando en background (patrón completo en esa skill).

## 4. Pendientes explícitos (decisión tuya, no bloquean nada)

### 4.1 Publicar a GitHub Packages
**Qué es:** `npm publish` sube una versión congelada del **código del CLI**
(no `memory/`/`topology.json`, excluidos por `.npmignore`) a
`npm.pkg.github.com`, habilitando `npm install -g @alexis-apablaza-klap/
klap-brain` desde una máquina que no clonó el repo.

**Por qué no está hecho:** requiere un `.npmrc` local (gitignoreado) con un
token `write:packages` — no lo generé por ser una acción con secreto de por
medio que no me pediste explícitamente.

**Impacto de dejarlo sin hacer:** ninguno en el uso actual. La vía primaria
(`npm link` desde el clon) ya funciona y es la recomendada por el propio
README. Solo bloquea instalar sin clonar, algo que hoy no necesitás.

**Para cerrarlo:** generar un PAT con `write:packages`, armar el `.npmrc`,
seguir `knowledge/release-publish/SKILL.md`.

### 4.2 Orquestadores `.js` de SDD (Fase 4-5 automatizada)

> **Actualización 2026-08-18 — huella legacy real, ya cerrada.** Lo que este
> apartado describía como "no migrado, sin impacto" en realidad seguía
> **instalado y activo** en `~/.claude/workflows/`: `sdd-impl-spec.js` y
> `sdd-impl-spec-refactor.js` aparecían como skills invocables en cualquier
> sesión nueva, con sus tablas de rutas apuntando a `~/.claude/commands/`
> (vacío) y citando `design_patterns`/`webclient.md`/`spring-properties.md`
> (skills descartadas o inexistentes en este repo). Se verificó además que
> el motivo original — "usaban `IllegalArgumentException`" — era **incorrecto**:
> ambos archivos tienen 0 ocurrencias de `IllegalArgumentException`/
> `IllegalStateException`. La razón real para no portarlos tal cual son las
> rutas muertas, no la excepción.
>
> **Cerrado:** `doctor.js` ahora chequea `~/.claude/workflows/`; `migrate.js
> --clean-legacy` barre ese directorio completo (antes solo `_v1`/
> `simulacion_*`); los 6 archivos fueron eliminados con `--yes` tras
> confirmación explícita. `klap doctor` en verde en ese ítem.
>
> Lo que sigue pendiente (la automatización ejecutable en sí, ver debajo) no
> cambia — sigue sin existir un reemplazo `Workflow` para Fase 4-5.

**Qué se migró vs qué no:** el protocolo prescriptivo completo de Fase 4
(Implementar) y Fase 5 (Verificar) está en
`knowledge/sdd/references/fase4-5-implementar-verificar.md` — un Claude
disciplinado puede seguirlo manualmente. Lo que **no** se migró es la
**automatización ejecutable**: dos scripts `Workflow` en
`eco-team-brain/workflows/` (`sdd-impl-spec.js`, `sdd-impl-spec-refactor.js`)
que:
- Parseaban `spec/*-plan.md`, agrupaban tareas por nivel de dependencia y
  lanzaban **un subagente en paralelo por tarea** del mismo nivel.
- Corrían el ciclo Security Gate → Verificar con un `while (iteracion < 5)`
  real en código (no una instrucción a seguir), generando el informe de
  bloqueo automáticamente al agotar las iteraciones.
- La variante de refactor sumaba characterization tests como fase previa,
  bloqueo de niveles por tareas `[EXT]` sin confirmar, y verificación de
  no-regresión de contratos post-refactor.

**Por qué no se migraron tal cual:** apuntaban a `~/.claude/commands/`
(ruta que ya no existe), referenciaban `design_patterns` (deliberadamente
no migrado) y usaban `IllegalArgumentException` en vez de
`NonRetryableClientDataException` (la inconsistencia que ya cerramos en
Fase D) — portarlos sin ajustar habría reintroducido exactamente lo que
arreglamos.

**Impacto real de dejarlo sin hacer:** Fases 1-3 sin cambio (siempre fueron
conversacionales). En Fase 4-5, hoy la sesión de Claude sigue el protocolo
a mano en el mismo hilo: sin paralelismo real entre tareas, sin loop de
control programático (depende de que la sesión lleve la cuenta bien), y
consume más contexto de la conversación principal en vez de aislar cada
tarea en un subagente. No está roto — es más lento y manual.

**Para cerrarlo:** reescribir ambos como scripts `Workflow` nuevos,
actualizando rutas a `~/.claude/skills/`, sacando `design_patterns`, y
alineando a `NonRetryableClientDataException`. Es trabajo de desarrollo
real, no una migración de contenido.

---

## 5. Plan original completo (referencia histórica)

> Copiado tal cual de `C:\Users\alexis.apablaza\.claude\plans\analiza-el-repositorio-actual-mossy-yeti.md`
> al momento de este traspaso. Documenta el análisis y las decisiones que
> originaron el repo — varias cifras (219 componentes, 12 skills, 4 bloques)
> ya evolucionaron durante la ejecución (ver secciones 2-3 arriba para el
> estado real).

# Plan — `klap-brain`: rediseño de `eco-team-brain`

## Context

`eco-team-brain` instala el ecosistema de contexto compartido de KLAP BYSF sobre Claude Code: Neo4j en Docker + MCP de memoria + 73 archivos markdown de conocimiento + un CLI de 19 comandos sobre ~5.300 líneas de shell. Entrega valor real (SDD de 5 fases, `/auditoria` que predice los gates de Jenkins, templates del estándar KLAP), pero la implementación tiene tres fallas estructurales medidas:

**1. Costo en tokens desproporcionado.** `1.156.628 B ≈ 289k tokens` instalados en `~/.claude`. `/fase-spec` Fase 2 obliga a leer `design_patterns/skill.md` (90.560 B ≈ 22,6k tokens) *siempre*, más 6-12 skills de su tabla → **~56-62k tokens antes de proponer una sola clase**. Cero progressive disclosure: un `SKILL.md` de 2.333 líneas se lee completo para responder sobre un patrón.

**2. Rotura de precisión.** El tool MCP invocado no existe: el repo usa `memory_search`/`memory_create` en 12 archivos; el server expone `search_memories`/`create_memory` — **0 archivos usan el nombre real**, así que las 5 búsquedas obligatorias del arranque fallan siempre. `skills/webclient.md` prescribe WebClient/WebFlux mientras `commands/webclient.md` prescribe `RestClient` y prohíbe WebFlux; ambos instalados. Spring Boot `3.5.11` en 7 archivos vs `3.5.14` en `workflows/fase_spec.md:294`. `CLAUDE-TEMPLATE.md` nunca se instala (`~/.claude/CLAUDE.md` no existe). Cuatro índices de skills divergentes apuntando a tres rutas.

**3. Duplicación estructural.** `skills/` (179.052 B) es duplicado byte-a-byte de `commands/` y Claude Code **no lo descubre** (son `.md` planos; el loader exige `<name>/SKILL.md`). El Standard KLAP está escrito **5 veces** (121.897 B). La regla de JavaDoc aparece en ~16 lugares, `enable.metrics.push=false` en 15, cobertura 95% en 18 → dilución: se leen 60k tokens y las 10 reglas que importan se pierden.

**Y el modelo de datos no representa el dominio.** El grafo tiene 29 nodos, de los cuales 25 los genera un script; la memoria real escrita por devs son **4 nodos**. Mientras tanto la realidad verificada del ecosistema Klap es de **219 componentes** en el config-server, **111 con topics Kafka**, **64 topics distintos**, 541 referencias a `datasource` y 386 a URLs externas. El conocimiento que se quiere capturar es de **producto** — un producto tiene N componentes (uno por repo), un componente puede servir a varios productos, y los productos se integran entre sí. Eso no cabe en ningún repositorio y no es viable mantenerlo repo por repo.

**Resultado buscado:** repo nuevo, clean-slate con migración asistida, que separe topología derivada / conocimiento funcional / protocolos, baje el costo de una sesión de planificación en ~80%, y haga imposible por CI la regresión a la duplicación actual.

---

## Decisiones tomadas

| Decisión | Elección | Por qué |
|---|---|---|
| Compatibilidad | **Clean-slate + `klap migrate`** | Permite rediseñar esquema, borrar los 3 bins redundantes y las rutas mal puestas |
| Arquitectura de datos | **3 capas: topología derivada / memoria funcional / skills** | Los procesos y estándares no son memoria — separarlos elimina la duplicación grafo↔archivos |
| Neo4j | **Se mantiene como proyección derivada de solo lectura** | A ~400 nodos aporta exploración humana y Cypher ad-hoc; como sistema de registro corrompe el dato derivado |
| Acceso del agente | **CLI (`klap ctx`, `klap impact`), sin MCP** | Costo permanente de contexto = 0. Reemplaza las 5 búsquedas fallidas por una ficha calculada |
| Implementación | **Node 18+ único + bootstrap mínimo por SO** | Elimina ~5.300 líneas y la clase de bugs por divergencia Win/Linux |
| Contenido migrado | Skills KLAP de ingeniería · SDD · Arquitectura+seguridad · `/auditoria`+tooling | Es el conocimiento propietario. Lo genérico sale (ver Supuestos) |

### Supuestos que requieren tu confirmación o corrección

1. **Skills genéricos fuera.** `design_patterns` (90 KB), `typescript` (57 KB), `mastering-typescript` (87 KB), `pgsql` (51 KB), `data-structures` (66 KB), `angular` (~351 KB = 30% del total) no se migran: son conocimiento público que el modelo ya tiene y Context7 sirve actualizado. Si querés conservar `design_patterns`, entra como skill con router + `references/` por categoría: su costo por consulta baja de 22,6k a ~2k tokens.
2. **Alcance de la topología.** Se derivan **todos** los componentes que cada adaptador alcance (empezando por los 219 del config-server); la profundidad funcional (Capa 2) se llena solo para los productos del equipo. El resto queda como nodos-frontera cuando comparte topic, BD o API.
3. **`productos.yml` es el único archivo de topología escrito a mano** — usa patrones (`"*-anticipo-*"`), así que agregar un componente a un producto existente no requiere editarlo.

---

## Arquitectura de las 3 capas

| Capa | Contenido | Mantenimiento | Costo en tokens |
|---|---|---|---|
| **1 — Topología técnica** | 219+ componentes, productos, topics, BDs, APIs externas, aristas N:M | **Derivada** por `klap scan` con un adaptador por tipo de componente. `topology.json` se commitea; el **diff** es lo que se revisa en PR | 0 — nunca se carga completa |
| **2 — Conocimiento funcional** | Qué hace el producto, reglas de negocio, decisiones y su por qué, incidentes | **A mano**, 1 hecho por archivo, frontmatter con ids de Capa 1. Se escribe **en planificación, cuando el reporte de huecos prueba que falta** | ~200-600 tokens por hecho leído |
| **3 — Protocolos y estándares** | Arquitectura de referencia, seguridad, SDD, naming, DO/DONT, templates | **Skills** con progressive disclosure real | 0 hasta invocación |

### Adaptadores de topología (el config-server cubre solo un tipo)

| Tipo | Fuente | Estado |
|---|---|---|
| MS Spring Boot on-prem | `PROPERTIES/ms-central-config-server-repo/*.properties` | 219 componentes, automático |
| Spring Boot en ECS Fargate | `application*.yml` del repo + task definition / env | Adaptador propio |
| Lambda (`lbd-`) | template SAM/CDK/serverless + env vars del repo | Adaptador propio |
| Angular / MFE (`mcf-`) | `environment*.ts` + proxy/BFF config | Adaptador propio |

Claves ya verificadas como extraíbles: `kafka.topic.input|output|notification|dlq` (estándar KLAP), `spring.datasource.*`, `*.url` / `*.uri` / `*.host`.

---

## Estructura del repo nuevo

```
klap-brain/
├─ package.json                    # bin: klap · node>=18 · 0 dependencias runtime
├─ bin/klap.js                     # ~60 L: argv → src/commands/*  (un solo bin, no 4)
├─ bootstrap/{bootstrap.ps1,bootstrap.sh}   # ~40 L c/u: verifica Node/Docker/PATH
├─ src/
│  ├─ commands/                    # scan · ctx · impact · remember · review · install
│  │                               # graph · migrate · doctor · tools (trivy/depcheck/cve)
│  ├─ adapters/                    # spring-config-server · spring-ecs · lambda · angular-mfe
│  ├─ model/                       # schema.js · topology.js · query.js  (in-memory, sin DB)
│  └─ neo4j/project.js             # proyección opcional vía fetch nativo
├─ knowledge/                      # ← Capa 3
│  ├─ klap-standard/SKILL.md + references/{capas,paquetes,naming,do-dont,seguridad,logging}.md
│  ├─ kafka/SKILL.md + references/{config,listener,topics,properties}.md
│  ├─ persistencia/SKILL.md + references/{repository,queries,paginacion}.md
│  ├─ http-cliente/SKILL.md        # RestClient — contradicción resuelta
│  ├─ excepciones/ testing/ openapi/ microfrontend/
│  ├─ sdd/SKILL.md + references/{fase1..fase5,checklists,defectos-tipicos}.md
│  └─ auditoria/SKILL.md + references/ + scripts/
├─ memory/{INDEX.md, <slug>.md}    # ← Capa 2 (INDEX generado)
├─ topology/{topology.json, productos.yml, MAP.md}   # solo productos.yml a mano
├─ templates/CLAUDE.md             # ~60 L — se instala de verdad en ~/.claude/CLAUDE.md
└─ .github/workflows/ci.yml
```

### `klap ctx` — el corazón del ahorro

Se ejecuta al inicio de la planificación. Devuelve una ficha **calculada** (~400-800 tokens), no una búsqueda:

```
PRODUCTO abono-ya — Pago adelantado al comercio (fase 1, producción)
  Componentes (8):
    ms-central-sva-anticipo-calculos  [ms]  in=… out=… dlq=…  bd=contable
    lbd-sva-trx-summary-anticipo      [lbd] (sin topología derivada)
  Integra con: impulso-klap (topic X) · cuota-comercio (tabla Y)
  Conocimiento funcional (3): abono-ya-calculo-t0.md · …
  ⚠ HUECOS — preguntar al dev antes de implementar:
    - Sin reglas de negocio para: anticipo-limites, anticipo-pago
    - Sin decisiones registradas sobre: idempotencia de reintentos
```

**La sección de huecos es el mecanismo de escritura de Capa 2**: el agente pregunta solo lo que está probado que falta, y la respuesta del dev se captura con `klap remember` vinculada a los ids de topología. `klap impact <componente|topic>` calcula blast radius sobre el mismo modelo en memoria.

---

## Presupuesto de tokens

| Métrica | Hoy (verificado) | Objetivo | Δ |
|---|---|---|---|
| Corpus instalado | 1.156.628 B ≈ **289k tokens** | ~270-300 KB ≈ **68-75k** | **−75%** |
| Siempre activo | ~1.400 (CLAUDE.md ni se instala) | ~960 (12 skills + CLAUDE.md real) | — |
| `/fase-spec` Fases 1-2 | **~56-62k tokens** | **~10-11k** | **−82%** |
| Llamadas MCP al arranque | 5, todas fallan | 0 | — |

Fuentes del ahorro: eliminar `skills/` duplicado (179.052 B), `simulacion_spec_workflow.md` (130.787 B), `_v1` muertos, genéricos (~351 KB), Standard ×5 (121.897 B), y enunciar cada regla **una vez** en lugar de 15-18.

---

## Archivos críticos y qué reusar

**Contenido a extraer (no reescribir):**
- `scripts/windows/brain-update.ps1:1-249` — es la fuente de datos del estándar: reglas DO `r1..r21`, DONT `r1..r13`, naming, estructura de paquetes, capas, principios. Extraer el **dato** a `knowledge/klap-standard/references/`, borrar las 5 copias.
- `workflows/fase_spec.md` (319 L), `fase_implementacion.md` (318 L), `fase_spec_refactor.md` (549 L) → `knowledge/sdd/references/`, deduplicando las 4 tablas de skills repetidas y la definición de las 5 fases (hoy en 7 lugares).
- `commands/auditoria.md` (304 L) y `commands/web-artifacts-builder.md` — **ya tienen frontmatter válido**; migran casi tal cual, solo se parten en `SKILL.md` + `references/`.
- `commands/{kafka-config,kafka-listener,processor,repository,exceptions,testing,openapi,spring-properties,crear-microfrontend}.md` → skills de `knowledge/`. **`commands/webclient.md` (RestClient) es la versión correcta**; descartar `skills/webclient.md`.
- `commands/{fase-spec,sdd-impl-spec,sdd-refactor,sdd-impl-spec-refactor,fase-spec-refactor}.md` (3-45 L) — **este es el patrón correcto** y solo lo siguen 5 de 50 archivos: comando fino que delega. Conservar como capa de invocación.

**Código a reusar:**
- `bin/klap.js:11-20` (`nvdKeyStatus`) — el orden de resolución de la NVD key (env → `~/.klap/nvd-api-key.txt`) ya es correcto; hoy está duplicado en 4 lugares (JS + ps1 + sh + bat) → una sola función.
- `scripts/windows/cve-update.ps1` · `install-trivy.ps1` · `install-depcheck.ps1` — portar la lógica a `src/commands/tools.js`.
- `docker-compose.yml` — reusar para la proyección, corrigiendo tres cosas: auth por variable de entorno (hoy `neo4j/team-brain-2025` en claro en 13 archivos), bind a `127.0.0.1` en vez de `0.0.0.0`, y quitar APOC sin restricciones.

**Se descarta:** los 10 `.bat` (1.099 L, inalcanzables desde el CLI), `install-context7.*` (234 L, duplica `brain.* mcp`), `install-hooks.*` (apunta a `hooks/` inexistente → siempre falla), `brain-import-bolt.js` (usa `neo4j-driver` no declarado), `enrich-brain.*`, `teambrain-pre-migrate.json` (46 KB con nombres de devs y topics reales, hoy publicado al registry), `scripts/windows/vault/` (27 `.md` generados y commiteados), los 3 bins redundantes que pierden argv y exit code.

---

## Gates de CI — el anti-regresión

Sin esto el repo vuelve a 1,1 MB en dos trimestres.

| Gate | Falla si |
|---|---|
| `npm run budget` | `description` > 200 chars · `SKILL.md` > 200 L · corpus total sobre el techo |
| `npm run validate` | Referencia colgada: `memory/*.md` que apunta a un componente inexistente en `topology.json` |
| `npm run scan:check` | `topology.json` desfasado del config-server (drift) |
| `npm run dedupe:check` | Una regla global (JavaDoc, `enable.metrics.push`, cobertura 95%) aparece en más de un cuerpo de skill |
| `npm run versions:check` | Una versión del stack declarada en dos lugares con valores distintos (hoy: 3.5.11 vs 3.5.14) |

---

## Fases de ejecución

**Fase 0 — Andamiaje.** Repo, `package.json` (0 deps), `bin/klap.js`, bootstrap por SO, los 5 gates de CI **antes** de migrar contenido, `klap doctor`.

**Fase 1 — Topología (mayor valor nuevo).** `adapters/spring-config-server.js` → `topology.json`; `productos.yml` con patrones; `model/query.js`; `klap scan`, `klap ctx`, `klap impact`, `topology/MAP.md`. Luego los adaptadores de ECS, lambda y MFE.

**Fase 2 — Capa 3 (skills).** Migrar los 4 bloques confirmados partiendo cada uno en `SKILL.md` router + `references/`. Resolver las 3 contradicciones (RestClient, versión de Spring Boot, índice único de skills). Enunciar las reglas globales una sola vez. `templates/CLAUDE.md` (~60 L) e instalarlo de verdad.

**Fase 3 — Capa 2 (memoria).** Formato de `memory/<slug>.md`, `INDEX.md` generado, reporte de huecos en `klap ctx`, `klap remember`, `klap review`. Integrar el gancho de huecos en `knowledge/sdd/references/fase1.md`.

**Fase 4 — Proyección y migración.** `klap graph build` (read-only, desde `topology.json` + `memory/`), `docker-compose.yml` endurecido, `klap migrate` (rescata los 4 nodos reales de memoria, descarta los 25 del Standard, desinstala el paquete viejo, limpia los 14 `.md` huérfanos de `~/.claude/skills/` y los `_v1`/`simulacion_*` de `~/.claude/workflows/`), README y guía de migración.

---

## Verificación

**Topología — contra los números medidos hoy, que sirven de test de aceptación:**
```bash
klap scan --source ../PROPERTIES/ms-central-config-server-repo
# esperado: 219 componentes · 111 con topics · 64 topics distintos
klap ctx abono-ya          # los 8 repos de ABONO-YA + sección de huecos
klap impact bysf-liqsvbo-notificacion   # productores y consumidores del topic
klap validate              # 0 referencias colgadas
```

**Presupuesto de tokens — medición real, no estimación:**
```bash
npm run budget             # siempre-activo < 1.000 tokens
```
Correr un `/fase-spec` completo sobre un caso real y comparar el consumo contra la línea base de ~56-62k tokens.

**Precisión — los tres defectos verificados deben quedar cerrados:**
- `grep -rn "memory_search" knowledge/` → 0 resultados (el nombre real es `search_memories`, y en el diseño nuevo no se usa MCP).
- Una sola prescripción de cliente HTTP (`RestClient`) en todo el corpus.
- `npm run versions:check` en verde.

**Migración:** correr `klap migrate` en una máquina con la instalación vieja; verificar que los 4 nodos de memoria real aparecen en `memory/`, que `~/.claude/CLAUDE.md` **existe** (hoy no), y que `~/.claude/skills/` queda sin los 14 `.md` huérfanos.

**Ciclo de vida:** `klap install` → `klap doctor` → `klap graph build` → abrir el Browser y comprobar que el grafo refleja `topology.json`. `klap rollback` debe revertir *todo* lo que `install` puso, incluidos `commands/` y `workflows/` (hoy no lo hace).
