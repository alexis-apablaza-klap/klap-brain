# Fases 1-3 — Desarrollo Nuevo (SDD)

Cubre Fase 1 (Explorar), Fase 2 (Proponer) y Fase 3 (Validar) para desarrollos nuevos: microservicios o funcionalidades que no existen aún. El resultado es un par de documentos spec que el dev usa como input de `fase4-5-implementar-verificar.md`.

**Aplica a:** desarrollos nuevos. **Queda fuera:** fixes, hotfixes y mantenciones de sistemas ya desarrollados — para eso usar `fase1-3-refactor.md`.

## Activación

```
sdd: [descripción opcional]
```

Si no se incluye descripción ni fuente de contexto, preguntar al inicio:

> "¿Desde dónde levantamos el contexto? Puedes indicarme: un issue key de Jira (ej. `KLAP-123`), un sprint o filtro de proyecto en Jira, un documento o archivo de contexto, o una descripción directa aquí."

| Fuente | Mecanismo |
|--------|-----------|
| Issue key de Jira | MCP Atlassian |
| Sprint / filtro de proyecto Jira | MCP Atlassian — listar historias, el dev selecciona |
| Documento externo | El dev indica la ruta o pega el contenido |
| Descripción directa | El dev describe el feature en el chat |

Si se cargan múltiples historias de Jira, preguntar si se analizan juntas (spec consolidado) o por separado (un spec por historia).

---

## Fase 1 — Explorar

### Entregable obligatorio

- [ ] Responsabilidad del microservicio en el dominio
- [ ] Mecanismos de integración asíncrona identificados (topics/queues de entrada, salida, DLQ) — si la arquitectura incluye mensajería
- [ ] Tablas PostgreSQL que gestiona
- [ ] Servicios externos que consume (HTTP, gRPC, mensajería saliente, SDK externo, etc.)
- [ ] Componentes a crear y sus dependencias
- [ ] **Candidatos a Builder identificados en los requerimientos** — al analizar CAs y RFs, documentar:
  - Objetos de dominio con 4+ campos donde al menos 2 son opcionales según los CAs
  - Queries de búsqueda con 3+ filtros opcionales descritos en los requerimientos
  → Documentar para que Fase 2 los diseñe con Builder desde el inicio. Si no hay ninguno: registrar "no aplica"
- [ ] Requisitos funcionales (RF) con criterios de aceptación (`CA-XX`)
- [ ] Requisitos no funcionales (RNF)
- [ ] **Operaciones I/O-bound identificadas en el diseño propuesto:**
  - Llamadas HTTP a servicios externos
  - Queries a BD en secuencia que podrían paralelizarse
  - Lecturas de mensajería o archivos en el hilo principal
  → Para cada una: documentar si debe ser async o síncrona y por qué. Si no hay ninguna: registrar "no aplica"
- [ ] **Operaciones CPU-bound identificadas en el diseño propuesto:**
  - Transformaciones de datos en volumen, cálculos intensivos, generación de archivos (PDF, imágenes)
  → Si no hay ninguna: registrar explícitamente "no aplica"
- [ ] **Escenarios TOCTOU (check-then-act) potenciales en el diseño:**
  - ¿Hay pares verificar→crear o leer→actualizar que podrían ejecutarse simultáneamente en N réplicas?
  - ¿Hay recursos compartidos que múltiples instancias podrían modificar en paralelo?
  → Para cada par: documentar qué ocurriría si dos instancias ejecutan simultáneamente
- [ ] **Si el diseño incluye `@Scheduled`:** documentar réplicas previstas y requerimiento de lock distribuido desde el inicio. Si no hay `@Scheduled`: registrar "no aplica"
- [ ] **Escala horizontal asumida siempre:** el nuevo servicio correrá con N réplicas — diseñar concurrencia en consecuencia
- [ ] Casos límite documentados como `CL-XX` (formatos incorrectos, nulos, rangos fuera de límite, caracteres especiales)
- [ ] Defectos típicos del equipo cubiertos como `CL-XX` — consultar `defectos-tipicos.md` y verificar que las 6 categorías están representadas
- [ ] Si el producto/servicio es nuevo: registrar con `klap remember --type note --product <id> ...` al completar la fase — ver `../SKILL.md`

### Preguntas sugeridas al desarrollador

Solo si la información no es derivable del contexto:

- ¿Con cuántas réplicas correrá el servicio en producción? _(relevante para calibrar urgencia real de concurrencia y scheduler sin lock; la pregunta sobre Redis/coordinación distribuida se hace en Fase 2 solo si aplica — ver `fase2-diseno-concurrencia.md`)_

---

## Fase 2 — Proponer

Antes de proponer la arquitectura, leer los skills de los componentes identificados en Fase 1 — tabla consolidada en `../SKILL.md` (no repetida aquí). La estructura de paquetes, naming y patrones deben derivarse de esos archivos, no de conocimiento general.

Identificación de patrones de diseño y análisis de concurrencia: metodología completa en `fase2-diseno-concurrencia.md` — incluye el cruce con hallazgos de Fase 1 (Builder, TOCTOU, `@Scheduled`), la evaluación por categoría GoF, y el análisis I/O-bound / CPU-bound / TOCTOU / `@Scheduled` con sus tablas de estrategias.

### Entregable obligatorio

- [ ] Arquitectura en capas con separación **global / dominio** y estructura de paquetes completa (`cl.klap.bysf.{modulo}.{aplicacion}` + `dominio/{nombre_dominio}/`) — ver `../../klap-standard/references/arquitectura.md`
- [ ] Contratos de interfaces con package correcto en cada firma
- [ ] Decisiones técnicas con justificación
- [ ] **Columnas que almacenan respuestas de APIs externas** (error bodies, provider responses) — declarar como `text`, nunca `json`/`jsonb`; ver la justificación completa en `../../klap-standard/references/seguridad.md`
- [ ] Alineación con estándar KLAP BYSF confirmada
- [ ] Desviaciones del estándar explícitamente señaladas
- [ ] Archivos `application-{ambiente}.properties` diseñados para los 4 ambientes (local/develop/qa/master) — si el microservicio incluye Kafka
- [ ] Entregable de `fase2-diseno-concurrencia.md` completo (patrones, concurrencia, race conditions, seguridad)

---

## Fase 3 — Validar

### Entregable obligatorio

- [ ] Reporte ✅/❌ por cada regla DO/DON'T del equipo — ver `checklist.md`
- [ ] Verificación de naming conventions
- [ ] **Tabla de tareas atómicas** con orden de dependencias y columna **Tipo**:

  | Tipo | Cuándo usar |
  |------|-------------|
  | `Nuevo` | Tarea ejecutada por el dev — nueva funcionalidad |
  | `[EXT]` | Dependencia externa — ejecutada por otro equipo (infra, DevOps, seguridad). Bloquea tareas posteriores pero no la ejecuta el dev. Documentar quién la ejecuta y cómo confirmar que está lista |

- [ ] Estimación de tamaño por tarea (S/M/L)
- [ ] Trazabilidad: cada tarea referencia sus `CA-XX` y `CL-XX`
- [ ] Plan de tests por tarea (unitarios e integración distinguidos explícitamente)
- [ ] Al menos un test de integración por cada componente que interactúe con infraestructura externa (broker de mensajes, BD, API HTTP, sistema de archivos, u otro recurso externo identificado en Fase 1)
- [ ] `defectos-tipicos.md` consultado: las 6 categorías verificadas en el plan — si alguna no está cubierta, consultar al dev con las preguntas sugeridas antes de cerrar el plan
- [ ] Plan de tests incluye escenarios de concurrencia para componentes I/O-bound (ejecución paralela, orden de resolución, timeout handling)
- [ ] Race conditions cubiertas con tests: acceso concurrente al mismo recurso e idempotencia verificada si el componente puede recibir la misma operación más de una vez

---

## Archivos de salida

Naming (directorio `spec/` — ver `../SKILL.md`):

| Archivo | Contenido | Naming |
|---------|-----------|--------|
| `spec/[nombre-proyecto]-spec.md` | Diseño: output de Fases 1 y 2 (requerimientos + arquitectura) | Nombre del proyecto en kebab-case + `-spec` |
| `spec/[nombre-proyecto]-plan.md` | Plan de trabajo: output de Fase 3 (tabla de tareas, tests, trazabilidad) | Nombre del proyecto en kebab-case + `-plan` |

**Ejemplo:** para el proyecto `tarifa-service`:
```
spec/tarifa-service-spec.md
spec/tarifa-service-plan.md
```
