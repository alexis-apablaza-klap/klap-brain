---
name: sdd
description: Protocolo SDD de 5 fases (Explorar/Analizar, Proponer, Validar, Implementar, Verificar) para microservicios KLAP BYSF. Activar con "sdd:" (nuevo) o "sdd-refactor:" (refactor).
---

# SDD — Spec-Driven Development (KLAP BYSF)

## Qué es

Proceso obligatorio de 5 fases para todo desarrollo de microservicios del equipo. Cada fase tiene un entregable obligatorio; en Fases 1-3 el proceso no avanza sin aprobación explícita del dev. Fases 4-5 corren en un ciclo automático (máx. 5 iteraciones) hasta que el Security Gate y los tests pasan en verde.

| Fase | Nombre | Pausa para aprobación del dev |
|---|---|---|
| 1 | Explorar (nuevo) / Analizar (refactor) | Sí |
| 2 | Proponer | Sí |
| 3 | Validar | Sí |
| 4 | Implementar (TDD) | No |
| 4.5 | Security Gate | No — bloquea el avance si hay CRITICAL/HIGH/MEDIUM |
| 5 | Verificar | No — ciclo hasta 100% verde o 5 iteraciones |

## Agentes por fase (ambos flujos)

| Fase | Agente | Modelo |
|---|---|---|
| 1 | `sdd-requirements-analyst` | opus |
| 2 | `sdd-architecture-designer` | opus |
| 3 | `sdd-task-planner` | sonnet |
| 4 | `tdd-implementer` | sonnet |
| 4.5 | `static-security-auditor` | opus |
| 5 | `sdd-validator` | sonnet |

## Activación — dos variantes de Fases 1-3

| Activación | Cuándo | Reference |
|---|---|---|
| `sdd: [descripción]` | Desarrollo nuevo — microservicio o funcionalidad que no existe aún | `references/fase1-3-nuevo.md` |
| `sdd-refactor: [descripción]` | Modernización/refactor de un proyecto Java/Spring Boot ya existente | `references/fase1-3-refactor.md` |

Si no hay descripción ni fuente de contexto, preguntar de dónde levantar el contexto (issue Jira, sprint, documento, descripción directa) antes de iniciar Fase 1. Ambas variantes convergen en las mismas Fases 4-5.

## Qué reference leer en cada fase

| Fase | Reference |
|---|---|
| 1-2-3, desarrollo nuevo | `references/fase1-3-nuevo.md` |
| 1-2-3, refactor | `references/fase1-3-refactor.md` |
| 2 — patrones de diseño + concurrencia (ambos flujos) | `references/fase2-diseno-concurrencia.md` |
| 3 y 5 — gates de completitud | `references/checklist.md` |
| 1/3 (ambos flujos) y 5 — defectos recurrentes del equipo | `references/defectos-tipicos.md` |
| 4, 4.5, 5 (ambos flujos) | `references/fase4-5-implementar-verificar.md` |

## Skills a leer por componente — tabla consolidada

No repetir esta tabla en cada reference (regla de deduplicación del repo).

| Componente a crear/modificar | Skill |
|---|---|
| `XxxKafkaListener`, `XxxKafkaConfig`, properties Kafka por ambiente | `../kafka/SKILL.md` |
| `XxxProcessor` / `XxxProcessorImpl` (Saga) | `../processor/SKILL.md` |
| `XxxRepository` (JdbcTemplate) | `../persistencia/SKILL.md` |
| `XxxClient` / `XxxClientConfig` (HTTP externo — RestClient) | `../http-cliente/SKILL.md` |
| Jerarquía de excepciones | `../excepciones/SKILL.md` |
| Tests unitarios e integración | `../testing/SKILL.md` |
| `OpenApiConfig` / endpoints REST | `../openapi/SKILL.md` |
| Colecciones en memoria, caches, estructuras concurrentes | skill `data-structures` (independiente de este repo) |
| Catálogo de patrones de diseño GoF | No incluido en este repo por defecto — ver nota en `references/fase2-diseno-concurrencia.md` |
| Arquitectura, naming, DO/DONT, seguridad, versiones del stack | `../klap-standard/SKILL.md` |

## Context7

Al trabajar con APIs del stack usar `use context7` para la doc de la versión exacta instalada. La versión de referencia única del stack es `../klap-standard/references/stack.md` — no la repitas en otro archivo.

## Integración con la memoria del equipo

| Situación | Acción |
|---|---|
| Antes de Fase 1 | `klap ctx <producto-o-componente>` — trae contexto ya registrado y declara huecos explícitos |
| Huecos relevantes para esta tarea | Preguntar al dev antes de continuar, no asumir |
| Hecho nuevo que surge durante el SDD (decisión, regla, incidente) | `klap remember --type <tipo> --product <id> [--components <id,id>] <texto>` — avisar al dev que lo revise y commitee |

## Reglas de iteración (Fases 1-3)

- No se avanza a la fase siguiente sin aprobación explícita del dev.
- El agente pregunta solo si detecta ambigüedad o información faltante — no hay un set fijo de preguntas obligatorias.
- Si el dev pide más detalle de una tarea en Fase 3, se entrega antes de cerrar el proceso.
- Cantidad de rondas de iteración por fase: libre, hasta que el dev quede conforme.

## Archivos de salida

Ambos flujos crean/actualizan `spec/` en la raíz del proyecto (el agente lo crea si no existe). El naming exacto de cada archivo está detallado en `references/fase1-3-nuevo.md` y `references/fase1-3-refactor.md` respectivamente — difieren porque refactor además genera snapshots de contratos en `spec/contracts/`.
