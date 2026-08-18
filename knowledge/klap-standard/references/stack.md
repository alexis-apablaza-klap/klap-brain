# Stack tecnologico — indice por ecosistema

Fuente humana de la politica de versiones, separada por ecosistema (antes
todo vivia mezclado en un solo archivo, sin distinguir Java de npm, sin
rangos — auditoria 2026-08-18). La fuente que de verdad se valida es
[`stack.yml`](stack.yml) (machine-readable) — este archivo es su espejo
legible, no lo edites sin actualizar también `stack.yml`.

`npm run versions:check` escanea repos reales (`build.gradle`/`package.json`)
y falla si alguno esta por debajo del piso `required`. Requiere acceso local
a los repos (`--repos-dir=<path>` o `KLAP_REPOS_DIR`) — sin eso se omite,
igual que `scan:check`. Ya no compara el corpus de `knowledge/` contra si
mismo (ese chequeo era debil: no leia versiones declaradas en tablas
Markdown, la mitad de las "versiones unicas" nunca se detectaban).

**Como leer los pisos:** `required` es obligatorio — un repo por debajo
rompe CI. `recommended` es el piso para **proyectos nuevos** — no bloquea,
solo se reporta como nota. Un repo existente entre `required` y
`recommended` esta en cumplimiento (no hace falta subirlo de inmediato).

## Java — detalle en [`stack-java.md`](stack-java.md)

| Libreria | Piso obligatorio | Piso recomendado (proyecto nuevo) |
|---|---|---|
| Java | 21+ | — |
| Spring Boot | 3.5.16+ | 4.1.0+ |
| Gradle | 9.3+ | — |
| Resilience4j | 2.4.0+ | — |
| springdoc-openapi | 2.9.0+ (si Spring Boot 3.x) / 3.1.0+ (si Spring Boot 4.x+) | — |

Spring Boot 3.5.16 (ultima version de la linea 3.x) sigue permitido en
proyectos **existentes** — todo proyecto **nuevo** debe crearse directo en
4.1.x+.

## npm — Angular y Lambda, detalle en [`stack-npm.md`](stack-npm.md)

| Libreria | Piso obligatorio | Piso recomendado (proyecto nuevo) |
|---|---|---|
| Angular (`mcf-*`) | 21.0.0+ | 22.0.0+ |
| TypeScript | 5.9.0+ | — |
| Node runtime (`lbd-*`) | 24.0.0+ | — |

## Otros ecosistemas

Hoy el equipo SVA solo gobierna Java (`ms-`/`mcs-`) y npm (`mcf-`/`lbd-`).
Si en el futuro se suma Bash/Python/otro lenguaje a algun componente,
agregar una seccion nueva aca + un scanner nuevo en `src/lib/stack-scan/`
— el diseño de `stack.yml`/`versions-check.js` ya es generico por
`ecosystem`, no hace falta rediseñar nada.
