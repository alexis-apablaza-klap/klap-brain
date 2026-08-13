# Fase 2 — Patrones de diseño y análisis de concurrencia

Contenido compartido por `fase1-3-nuevo.md` y `fase1-3-refactor.md`: la metodología de esta sección es idéntica en ambos flujos — solo cambia si los hallazgos vienen del diseño propuesto (nuevo) o del código existente (refactor), lo cual ya quedó resuelto en la Fase 1 de cada uno. Se factoriza aquí una sola vez para no repetirla.

## Catálogo de patrones GoF — nota

Este repo no incluye un catálogo de patrones de diseño GoF (Builder, Strategy, State, etc.) por defecto, para no inflar el costo de tokens de cada Fase 2. Si el equipo decide adoptar uno, agregarlo como skill propio (`knowledge/design-patterns/`) y enlazarlo desde aquí y desde la tabla consolidada de `../SKILL.md`. Mientras no exista, la evaluación de patrones se hace igual —con el criterio del agente apoyado en las preguntas de esta sección— sin catálogo de referencia.

## Cruce obligatorio con hallazgos de Fase 1

Antes de evaluar por categoría, cruzar explícitamente los hallazgos de Fase 1 con estas señales:

- **Candidatos o señales de Builder detectados en Fase 1** → evaluar siempre en Creacionales, incluso si parecen menores. Builder debe aparecer en la tabla de aplicados o descartados de la Fase 2.
- **TOCTOU identificados en Fase 1** → evaluar Strategy/State según el tipo de recurso compartido y la frecuencia del acceso concurrente.
- **`@Scheduled` (con o sin lock) presente en el diseño o el código** → evaluar lock distribuido (Redisson, ShedLock, `pg_try_advisory_lock`) como parte del diseño de concurrencia.

## Evaluación por categoría

- **Creacionales** — ¿La creación de objetos de dominio varía según el tipo de mensaje o contexto? ¿Existen entidades que deben replicarse desde una plantilla base?
- **Estructurales** — ¿Hay subsistemas externos (APIs, Kafka, BD) que el resto del código debería consumir sin conocer su complejidad? ¿Se necesita adaptar contratos de interfaces incompatibles?
- **Comportamiento** — ¿La lógica de procesamiento cambia según el estado actual de la entidad o el tipo de evento recibido? ¿Varios componentes necesitan reaccionar ante un mismo cambio? ¿Se requiere registrar, revertir o auditar cambios de estado? ¿Existe una secuencia de pasos con variantes por tipo?

## Análisis de concurrencia y paralelismo

Para cada hallazgo de Fase 1, documentar la decisión tomada con justificación. **No omitir ningún hallazgo** — la ausencia silenciosa no se acepta.

**I/O-bound** — para cada operación identificada en Fase 1:
- ¿Debe ser async? Si **sí**: proponer `CompletableFuture.supplyAsync(...)` envolviendo la llamada bloqueante a `RestClient` (ver `../../http-cliente/SKILL.md`) sobre un `ThreadPoolTaskExecutor` dedicado especificando `corePoolSize`, `maxPoolSize`, `queueCapacity`, timeout máximo del Future y política de rechazo si el pool se agota.
- Si **no**: justificar por qué síncrono es aceptable (operación rápida, consistencia transaccional requerida, etc.)

Para I/O bloqueante (HTTP, JDBC) evaluar primero Virtual Threads antes de un `ThreadPoolTaskExecutor` tradicional sobre-dimensionado — ver `../../klap-standard/references/seguridad.md`.

**CPU-bound** — para cada operación identificada en Fase 1:
- Evaluar `@Async` + `ThreadPoolTaskExecutor` para aislar del hilo principal.
- Si no hay operaciones CPU-bound: confirmar explícitamente "no aplica" y no proponer `ThreadPoolTaskExecutor` innecesario.

**TOCTOU (check-then-act)** — para cada par identificado en Fase 1, documentar las estrategias evaluadas y la elegida:

| Estrategia | Evaluada | Decisión | Justificación |
|------------|----------|----------|---------------|
| `UNIQUE` constraint en BD | Sí | _Elegida / Descartada_ | _Razón_ |
| `SELECT FOR UPDATE` | Sí | _Elegida / Descartada_ | _Razón_ |
| Lock distribuido (Redis) | Sí | _Elegida / Descartada_ | _Razón_ |
| Clave de idempotencia | Sí | _Elegida / Descartada_ | _Razón_ |

**`@Scheduled` sin lock distribuido** — para cada caso identificado, documentar estrategia elegida y alternativas descartadas:

| Estrategia | Evaluada | Decisión | Justificación |
|------------|----------|----------|---------------|
| `Redisson RLock.tryLock()` | Sí | _Elegida / Descartada_ | _Razón_ |
| `ShedLock` (tabla en BD) | Sí | _Elegida / Descartada_ | _Razón_ |
| `pg_try_advisory_lock` | Sí | _Elegida / Descartada_ | _Razón_ |
| Reducir réplicas a 1 solo para el scheduler | Sí | _Elegida / Descartada_ | _Razón_ |

**Si Fase 1 no identificó ningún escenario de concurrencia**, documentar explícitamente: *"No se identificaron race conditions, TOCTOU, `@Scheduled` sin lock ni operaciones paralelizables. El servicio es stateless y no comparte recursos mutables entre hilos."* Esta justificación es **obligatoria** — la sección no puede quedar vacía ni omitirse.

## Entregable obligatorio de esta sección (Fase 2)

- [ ] Skills relevantes leídos y aplicados — listar cuáles se consultaron (tabla consolidada en `../SKILL.md`)
- [ ] **Patrones de diseño aplicados** — nombre + componente + justificación basada en hallazgos de Fase 1
- [ ] **Patrones evaluados y descartados** — tabla obligatoria para cada patrón considerado y no aplicado, con columna Justificación. Ningún patrón cruzado en la sección anterior puede omitirse en silencio
- [ ] **Modelo de concurrencia** — para cada hallazgo de Fase 1: decisión async/sync + herramienta propuesta, con `ThreadPoolTaskExecutor` dimensionado (`corePoolSize` / `maxPoolSize` / `queueCapacity` / timeout / política de rechazo) si aplica
- [ ] **Race conditions** — para cada TOCTOU identificado: tabla de estrategias evaluadas + elegida + descartadas con justificación explícita
- [ ] **Justificación de ausencia de concurrencia** — si no hay operaciones concurrentes ni race conditions: declaración explícita de por qué no aplica. Campo obligatorio, no puede quedar vacío
- [ ] Análisis de seguridad ejecutado (OWASP Top 10 + amenazas de stack + NIST SP 800-53 + MITRE ATT&CK por módulo) — checklist completo en `../../klap-standard/references/seguridad.md`, no repetido aquí
