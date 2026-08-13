# klap-brain

Ecosistema de contexto compartido para el equipo KLAP BYSF. Rediseño de
`eco-team-brain`: mismo objetivo (memoria de equipo + estándares + skills
sobre Claude Code), arquitectura distinta — pensada para que el costo en
tokens de una sesión de planificación baje ~80% y las contradicciones entre
skills sean detectables por CI, no por accidente.

## Por qué existe

`eco-team-brain` instalaba ~289k tokens de contenido en `~/.claude`, con un
protocolo de arranque que llamaba a tools de un MCP que no existían
(`memory_search`/`memory_create` — el server real expone `search_memories`/
`create_memory`), 179 KB de skills duplicados byte-a-byte entre `skills/` y
`commands/`, dos versiones de cliente HTTP contradictorias instaladas a la
vez (WebClient vs RestClient), y un grafo de memoria de 29 nodos donde 25
los generaba un script — la memoria real escrita por el equipo eran 4 nodos
en 4 meses, mientras el ecosistema real de KLAP tiene más de 200 componentes
sin ningún mapa. Ver `docs/MIGRATION.md` para el detalle completo.

## Arquitectura: 3 capas

```
Capa 1 — Topología      topology/topology.json (derivado, se re-genera con `klap scan`)
                         + topology/productos.yml (el único archivo manual: qué
                           patrones de componente pertenecen a cada producto)

Capa 2 — Memoria         memory/*.md (un hecho por archivo, revisado en PR)
                         funcional                        ↕ ancla a ids de la Capa 1

Capa 3 — Skills          knowledge/<skill>/SKILL.md + references/
                         (protocolos, estándares, templates de código —
                          formato real de Claude Code, con progressive disclosure)
```

Neo4j es una **proyección de solo lectura**, no la verdad — `klap graph build`
la reconstruye desde las capas 1 y 2. Nunca escribas directamente en el
Browser: el próximo build la pisa.

## Instalación

**No se instala desde el registry.** El contenido (`memory/`, `topology/`)
vive en git y se actualiza con `git pull` — instalar una versión fijada del
paquete lo congelaría en el momento del publish. En su lugar:

```bash
git clone <url-de-este-repo>
cd klap-brain
./bootstrap/bootstrap.sh      # o bootstrap\bootstrap.ps1 en Windows — verifica Node/Docker/git
npm link                      # symlink global -> este clon; "git pull" alcanza a "klap" sin reinstalar
klap doctor
```

El registry (`npm publish`, GitHub Packages) es solo para distribuir
actualizaciones del **código** del CLI a quien no quiera clonar.

## Uso diario

```bash
klap scan --config-server <ruta-al-repo-de-properties> --repos-dir <ruta-a-klap-workspace>
klap ctx abono-ya                 # ficha de contexto + huecos de conocimiento
klap impact bysf-liqsvbo-notificacion   # blast radius de un topic o componente
klap remember --type decision --product abono-ya --components ms-xxx "el hecho"
klap review                       # curación periódica: todos los huecos de una vez
klap install                      # skills reales en ~/.claude/skills + CLAUDE.md
```

## Comandos

| Comando | Qué hace |
|---|---|
| `scan` | Deriva `topology/topology.json` desde el config-server + repos locales |
| `ctx <producto\|componente>` | Ficha calculada: componentes, topics, integraciones, memoria, huecos |
| `impact <topic\|componente>` | Blast radius |
| `map` | Regenera `topology/MAP.md` (vista humana) |
| `remember` | Guarda un hecho funcional en `memory/` |
| `review` | Lista todos los huecos y referencias colgadas de una vez |
| `install` / `rollback` | Instala/revierte skills + CLAUDE.md en `~/.claude` (simétrico) |
| `migrate` | Migración asistida desde `eco-team-brain` |
| `doctor` | Chequeo de entorno |
| `graph up\|down\|status\|logs\|browser\|build` | Ciclo de vida de la proyección Neo4j |
| `config show\|set\|reset` | Conexión a Neo4j |
| `trivy` / `depcheck` / `cve-update` | Tooling de seguridad para el skill `auditoria` |

## Desarrollo

```bash
npm test              # node --test
npm run ci            # los 4 gates: budget, validate, dedupe-check, versions-check
```

Los gates de CI son el mecanismo anti-regresión: sin ellos el corpus vuelve a
crecer sin control. `npm run budget` limita tamaño de `SKILL.md`/description;
`npm run validate` exige que toda memoria apunte a un producto/componente que
existe; `npm run dedupe:check` falla si una regla global se repite en más de
un skill; `npm run versions:check` falla si dos skills declaran versiones
distintas de la misma librería.

## Estructura

```
bin/klap.js              CLI, un solo dispatcher, Node puro
bootstrap/                bootstrap.ps1 / bootstrap.sh — solo verifican Node/Docker/git
src/adapters/             extractores de topología por tipo de componente
src/model/                grafo en memoria + queries (ctx/impact) + memoria funcional
src/commands/             un archivo por comando de klap
src/ci/                   los 4 gates
src/neo4j/                proyección HTTP (opcional)
knowledge/                skills — SKILL.md + references/
memory/                   hechos funcionales del equipo (Capa 2)
topology/                 productos.yml (manual) + topology.json + MAP.md (derivados)
templates/CLAUDE.md       se instala en ~/.claude/CLAUDE.md
docker-compose.yml        Neo4j, solo para la proyección
```
