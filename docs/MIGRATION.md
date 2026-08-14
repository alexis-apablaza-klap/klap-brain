# Migración desde `eco-team-brain`

Clean-slate con migración asistida — no es un reemplazo drop-in. `klap`
(el comando) es distinto, el layout de `~/.claude` es distinto, el modelo de
datos es distinto. Este documento explica qué cambió, por qué, y cómo mover
lo que vale la pena mover.

## Hallazgos que motivaron el rediseño (verificados, no estimados)

| # | Hallazgo | Evidencia |
|---|---|---|
| 1 | El MCP invocado no existe | 12 archivos usan `memory_search`/`memory_create`; el server real (`@knowall-ai/mcp-neo4j-agent-memory`) expone `search_memories`/`create_memory`. 0 archivos usan el nombre real — las 5 búsquedas del arranque fallaban siempre |
| 2 | `skills/` duplicado y no descubrible | 179.052 B, 11 de 14 archivos idénticos byte-a-byte a `commands/`; son `.md` planos sin `SKILL.md` — Claude Code no los indexa |
| 3 | Contradicción de cliente HTTP | `skills/webclient.md` prescribía WebClient/WebFlux; `commands/webclient.md` prescribía RestClient y prohibía WebFlux — ambos instalados a la vez |
| 4 | Drift de versión | Spring Boot 3.5.11 en 7 archivos, 3.5.14 en 1 (el más reciente) — nadie lo comparaba |
| 5 | Standard escrito 5 veces | `brain-update.{ps1,sh,bat}` + `enrich-brain.{sh,bat}`, 121.897 B, cualquier cambio exigía 5 ediciones sincronizadas |
| 6 | Reglas globales repetidas 15-18 veces | JavaDoc, `enable.metrics.push=false`, cobertura 95% — diluye la atención del modelo hasta perder las reglas que importan |
| 7 | `CLAUDE-TEMPLATE.md` nunca se instalaba | Ningún script lo copiaba a `~/.claude/CLAUDE.md` |
| 8 | El grafo no modelaba el dominio real | 29 nodos, 25 generados por script — la memoria real del equipo eran 4 nodos en 4 meses. El ecosistema real de KLAP tiene 218 componentes medidos en el config-server compartido |
| 9 | `klap rollback` no revertía `install` | `commands/`/`workflows/` quedaban huérfanos tras rollback |
| 10 | Password de Neo4j en claro | `neo4j/team-brain-2025` hardcodeado en 13 archivos + bind a `0.0.0.0` |

## Qué NO se migró (y por qué)

- **Skills genéricos** (`design_patterns` 90 KB, `typescript` 57 KB,
  `mastering-typescript` 87 KB, `data-structures` 66 KB, `pgsql` 51 KB,
  `angular` ~351 KB): conocimiento público que el modelo ya tiene y que
  Context7 sirve actualizado. `design_patterns/skill.md` solo costaba ~22.6k
  tokens de lectura obligatoria en cada Fase 2 del SDD.
- **`skills/webclient.md`** (versión WebClient/WebFlux): descartada a favor
  de `commands/webclient.md` (RestClient) — ver hallazgo #3.
- **Artefactos muertos**: `fase_spec_v1.md`, `sdd-impl-spec_v1.js`,
  `simulacion_spec_workflow.md` (130.787 B, log de simulaciones, no protocolo).
- **10 `.bat`, `install-context7.*`, `install-hooks.*`**: inalcanzables desde
  el CLI viejo o rotos (`install-hooks.*` apuntaba a un directorio `hooks/`
  que no existe en el repo).
- **`brain-import-bolt.js`**: usaba `neo4j-driver` sin declararlo en
  `package.json`.
- **Los orquestadores `.js` de SDD** (`sdd-impl-spec.js`,
  `sdd-impl-spec-refactor.js`): quedan pendientes de rediseño — están
  acoplados a la mecánica de invocación de workflows del `eco-team-brain`
  original. El contenido prescriptivo de las 5 fases sí se migró
  (`knowledge/sdd/`); la orquestación ejecutable es trabajo futuro.

## Qué sí se migró

- Los 4 hechos reales de memoria del grafo viejo (`Service`, `Convention`,
  `reference`) — vía `klap migrate --export <ruta-al-export-json>`. Quedan
  en `memory/legacy-*.md` con un `TODO` explícito para asignar
  producto/componentes reales (el export viejo no tenía ese concepto).
- Los templates de código (Kafka, Processor, Repository, HTTP cliente,
  Excepciones, Testing, OpenAPI, Microfrontend) — reorganizados como
  skills reales en `knowledge/`, con las reglas globales deduplicadas hacia
  `knowledge/klap-standard/`.
- El protocolo SDD completo (5 fases, checklists, defectos típicos) — en
  `knowledge/sdd/`, con las tablas de "qué skill leer" actualizadas a las
  rutas nuevas.
- `/auditoria` y `web-artifacts-builder` — en `knowledge/auditoria/` y
  `knowledge/web-artifacts-builder/`, con el pre-flight de CVE apuntando a
  `klap cve-update` (mismo comando, ahora Node puro).
- **`kafka-implement`** (nunca evaluado en la migración inicial, 44 KB) —
  fundido en `knowledge/kafka/` y `knowledge/testing/references/kafka.md`
  sin duplicar lo ya cubierto; sus 7 conflictos de firma con `config.md`/
  `listener.md` se resolvieron a favor de las convenciones ya establecidas
  (base abstracta, `DeadLetterPublishingRecoverer`, DLQ con mensaje
  original). Trajo también el código completo de la clase base
  `KafkaConfig`, antes solo citada y nunca mostrada.
- **`kafka-audit`** — nueva skill en `knowledge/kafka-audit/`, reescrita
  contra el estándar real de este repo (no contra `kafka-implement`, que
  no existe aquí) y con la taxonomía de severidad alineada a
  `auditoria/references/veredicto.md`.
- **`CATI` + `RDC` + `HU Jira`** — nuevo bloque `knowledge/gobierno/`
  (pipeline documental HU→CATI→RDC, distinto de las 5 fases de código de
  `sdd`). De paso se corrigió un bug real en `generate-cati.js`: nunca leía
  `d.diagrams`, así que el placeholder de diagrama se dibujaba siempre
  aunque el JSON trajera una imagen real.
- **`code-review-expert`** — migrado como skill delgada que referencia
  `klap-standard`/`testing` en vez de repetir reglas; el original tenía 4
  contradicciones con decisiones ya resueltas (cobertura 90% vs 95%, ORM
  permitido, Testcontainers/WireMock vs MockWebServer, sugería Redis).
- **`release-publish`** — reescrito para el scope/repo de klap-brain, con
  el patrón HTTPS+token+background documentado como primer punto de
  troubleshooting (Git Credential Manager cuelga `git push`/`fetch` sin
  error en este remoto si no se embebe el token).

## Cómo migrar tu instalación

```bash
# 1. Clonar y enlazar klap-brain (ver README.md)
npm link

# 2. Rescatar la memoria real del grafo viejo (si tenés un export)
klap migrate --export <ruta-a-tu-export.json>
# revisa memory/legacy-*.md, completa product/components, commitea

# 3. Limpiar los artefactos legacy de ~/.claude (dry-run primero)
klap migrate --clean-legacy          # solo lista qué se borraría
klap migrate --clean-legacy --yes    # confirma el borrado
# limpia ~/.claude/skills/*.md sueltos, ~/.claude/commands/ completo
# (klap-brain no instala nada ahi -- es 100% huella del ecosistema anterior)
# y los workflows muertos (_v1, simulacion_*)

# 4. Instalar el contenido nuevo
klap install
klap doctor
```

`klap rollback` de `eco-team-brain` sigue funcionando para desinstalar ESE
paquete — no hace falta correrlo antes; `klap migrate --clean-legacy` cubre
específicamente los archivos huérfanos que un rollback normal no tocaba.
