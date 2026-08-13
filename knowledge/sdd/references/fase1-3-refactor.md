# Fases 1-3 — Refactorización de Proyectos Existentes (SDD)

Cubre Fase 1 (Analizar), Fase 2 (Proponer) y Fase 3 (Validar) para **refactorización de proyectos existentes**: análisis del estado actual, arquitectura objetivo y planificación de la transformación. El resultado es un par de documentos spec que el dev usa como input de `fase4-5-implementar-verificar.md`.

**Aplica a:** proyectos Java/Spring Boot existentes que requieren modernización, migración de versiones, reestructuración arquitectónica o eliminación de deuda técnica. El scope es intencionalmente Java/Spring Boot — los skills de referencia (`processor`, `persistencia`, `http-cliente`, `kafka`) son específicos de este stack.
**Queda fuera:** desarrollos nuevos (usar `fase1-3-nuevo.md`), fixes puntuales, hotfixes y proyectos en otros lenguajes que no usen el stack KLAP BYSF Java.

## Activación

```
sdd-refactor: [descripción opcional]
```

El proyecto a analizar es **siempre el directorio de trabajo actual de la sesión** — el agente lo lee directamente sin preguntar la ruta.

Al activarse, hacer **una sola pregunta de descubrimiento**:

> "¿Además de refactorizar el código existente, hay nuevos requerimientos a implementar en este mismo componente? Si sí: indícame la fuente (issue key de Jira, documento local en el repositorio, o descríbelos aquí directamente). Si no: procedemos directamente con el análisis del proyecto."

Con la respuesta se determinan los ámbitos activos para la sesión.

## Ámbitos del workflow

| Ámbito | Activación | Descripción |
|--------|-----------|-------------|
| **Ámbito 1 — Refactorización** | Siempre activo | Analizar el código existente, identificar deuda técnica y proponer la arquitectura objetivo alineada al estándar KLAP BYSF |
| **Ámbito 2 — Nuevos requerimientos** | Solo si el dev lo confirma | Incorporar requerimientos funcionales nuevos para el mismo componente sobre la arquitectura objetivo |

Ambos ámbitos se procesan en las mismas tres fases. Los entregables marcados `[Ámbito 2]` se generan únicamente si el dev confirmó que hay nuevos requerimientos.

### Fuentes de contexto para Ámbito 2

| Fuente | Mecanismo |
|--------|-----------|
| Issue key de Jira | MCP Atlassian |
| Sprint / filtro de proyecto Jira | MCP Atlassian — listar historias, el dev selecciona |
| Documento local en el repositorio | El dev indica la ruta relativa al proyecto |
| Descripción directa | El dev describe los requerimientos nuevos en el chat |

Si se cargan múltiples issues o documentos, preguntar si se analizan juntos (spec consolidado) o por separado.

---

## Fase 1 — Analizar

**Objetivo:** construir un mapa completo del estado actual — qué hace el proyecto, cómo está estructurado, qué tecnologías usa, qué deuda técnica acumula y qué riesgos presenta la refactorización. Si Ámbito 2 está activo, incorporar también el análisis de los nuevos requerimientos.

### Lectura del código existente

Antes de generar el entregable, leer al menos:

| Artefacto | Propósito |
|-----------|-----------|
| `pom.xml` / `build.gradle` | Versiones de dependencias, plugins, Java target |
| `application.properties` / `application.yml` | Configuración actual (datasource, kafka, clients) |
| Estructura de paquetes (`src/main/java`) | Arquitectura y separación de capas actual |
| Clases principales (controllers, services, repositories) | Patrones usados, naming, responsabilidades |
| Clases de configuración (`@Configuration`) | Beans, clientes HTTP, Kafka config |
| Tests existentes (`src/test`) | Cobertura y calidad del suite actual |
| `Dockerfile` / `docker-compose.yml` | Infraestructura de ejecución |
| Métodos `@Scheduled` | Detectar jobs batch sin lock distribuido en entornos multi-réplica |
| Loops sobre colecciones de BD (`for` + query) | Detectar N+1 queries y operaciones CPU-bound en memoria |
| Colecciones e iteraciones sobre datos en memoria | Detectar búsquedas O(n) donde un `Map` haría O(1), loops anidados, colecciones no thread-safe en contextos concurrentes — apoyarse en el skill `data-structures` |

### Inventario de contratos de entrada/salida

Antes de analizar la deuda técnica, capturar **todos los contratos del componente** — toda forma en que recibe datos y produce resultados, sin asumir que es un microservicio REST/Kafka. Este inventario es el "before" contra el que se valida el resultado del refactor. Los artefactos se guardan en `spec/contracts/`.

**Entradas a inventariar:**

| Tipo | Qué capturar |
|------|--------------|
| Mensajes entrantes (Kafka, SQS, RabbitMQ, etc.) | Topic/queue, schema completo (campo → tipo → nullable), key structure, headers |
| HTTP / REST requests | Método, path, headers requeridos, body schema con tipos y ejemplo |
| Archivos leídos (CSV, TXT, JSON, XML, Excel, binario) | Ruta/patrón de nombre, formato, encoding, delimitador, orden de columnas, ejemplo real |
| Triggers de schedule (batch/cron) | Expresión cron, parámetros de entrada si los hay |
| Argumentos de CLI | Nombre, tipo, obligatorio/opcional, ejemplo |
| Variables de entorno que modifican comportamiento | Nombre, valores posibles, efecto en el flujo |
| Reads de caché (Redis u otro) | Key pattern, estructura del value, ejemplo |

**Salidas a inventariar:**

| Tipo | Qué capturar |
|------|--------------|
| Archivos escritos (CSV, TXT, JSON, XML, Excel, PDF, binario) | Ruta/naming convention, formato, encoding, delimitador, orden de columnas, campos obligatorios vs opcionales, **ejemplo real** |
| Documentos JSON o XML producidos | Estructura completa: campos, tipos, nesting, nullability, arrays vs objetos, **ejemplo real** |
| Mensajes publicados (Kafka u otro broker) | Topic, key structure, schema completo, headers, **ejemplo real** |
| HTTP responses | Status codes posibles, body schema completo con tipos, headers en respuesta, **ejemplos por caso** |
| Escrituras a BD | Tabla, columnas escritas, tipos de dato, valores derivados vs recibidos |
| Emails / notificaciones | Destinatario (patrón), subject (patrón), body template, adjuntos posibles |
| FTP / SFTP uploads | Ruta destino, naming convention, formato, encoding |
| Webhooks disparados | URL pattern, método, body schema, headers, ejemplo |
| Entradas de caché escritas | Key pattern, estructura del value, TTL |
| Llamadas a APIs externas (efectos de salida) | Endpoint, método, body enviado, respuesta esperada |

Para cada salida: capturar un **ejemplo real** del artefacto producido y guardarlo en `spec/contracts/[tipo]-[nombre-descriptivo].[ext]`. Si el entorno no permite captura en tiempo real, construir el ejemplo desde el código fuente.

### Preguntas sugeridas al desarrollador

Solo si la información no es derivable del código:

- ¿Hay servicios en producción que consumen este componente y que podrían verse afectados por la refactorización?
- ¿Existe algún contrato externo (API, topic, esquema de BD) que deba preservarse exactamente?
- ¿Hay restricciones de versión impuestas por la plataforma o el equipo de infraestructura?
- ¿Se conocen SLAs o expectativas de rendimiento que la nueva versión deba cumplir?
- ¿Con cuántas réplicas corre el servicio en producción? _(relevante para calibrar urgencia real de race conditions y scheduler sin lock)_
- `[Ámbito 2]` ¿Los nuevos requerimientos reemplazan o complementan funcionalidades existentes?

### Entregable obligatorio — Ámbito 1 (Refactorización)

- [ ] **Estado actual del proyecto**: versión de Java y Spring Boot en uso, dependencias principales con versiones, estructura de paquetes actual (árbol simplificado), patrón arquitectónico actual (MVC clásico, hexagonal, sin capas, monolítico, etc.)
- [ ] **Inventario de componentes existentes**: controllers/listeners con sus rutas/topics, services/processors con su lógica de negocio, repositories/DAOs y tecnología de acceso a datos, clientes HTTP externos, configuraciones relevantes
- [ ] **Deuda técnica identificada**, clasificada por categoría: versiones obsoletas (Java < 17, Spring Boot < 3.x, dependencias con CVE); antipatrones (God classes, lógica de negocio en controllers, SQL embebido en services); ausencia de resiliencia (sin circuit breaker, retry, timeout); acoplamiento alto; cobertura de tests insuficiente o frágil; configuración/credenciales hardcodeadas; logging insuficiente (sin MDC, sin correlation ID)
- [ ] **Comportamiento actual documentado**: flujos de negocio principales, integraciones externas activas, SLAs conocidos, inventario de entradas (una fila por entrada: tipo, schema/formato, ejemplo), inventario de salidas (una fila por salida: tipo, schema/formato, ejemplo, consumidores), snapshots de contratos guardados en `spec/contracts/`
- [ ] **Alcance de la refactorización**: qué se mantiene sin cambios, qué se modifica, qué se elimina, qué se agrega
- [ ] **Riesgos de la refactorización**: breaking changes potenciales, dependencias de datos en BD (migraciones necesarias), compatibilidad entre versiones, servicios consumidores en producción
- [ ] **Señales de Builder identificadas** en el código existente — constructores/métodos con 4+ parámetros donde al menos 2 son opcionales (o 6+ aunque todos requeridos), DTOs con muchos campos de construcción variable, queries armadas con cláusulas opcionales (`if` + concatenación). Si no hay ninguna: registrar "no aplica"
- [ ] **Operaciones I/O-bound identificadas** — buscar específicamente: llamadas HTTP externas síncronas dentro de métodos de negocio (`RestTemplate`, `Feign`), queries a BD dentro de loops o en secuencia sin paralelismo, lecturas de archivos o mensajería bloqueantes en el hilo principal. Para cada una: documentar si actualmente es bloqueante y si puede paralelizarse. Si no hay ninguna: registrar "no aplica"
- [ ] **Operaciones CPU-bound identificadas** — transformaciones de datos en volumen, mapeos masivos, cálculos intensivos en memoria. Si no hay ninguna: registrar explícitamente "no aplica — no se identificaron operaciones CPU-bound"
- [ ] **Escenarios TOCTOU identificados** — pares no atómicos: verificar disponibilidad → insertar; leer estado → actualizar estado; comprobar existencia → crear. Para cada par: documentar qué pasaría si dos instancias del servicio ejecutan simultáneamente
- [ ] **Patrones async sin control de thread pool** — `CompletableFuture` / `@Async` sin `ThreadPoolTaskExecutor` explícito configurado. Si no hay async: registrar "no aplica"
- [ ] **`@Scheduled` sin lock distribuido** en un servicio que corre con N > 1 réplicas — si existe, documentar qué ocurre si N réplicas ejecutan simultáneamente (trabajo duplicado, conflictos de escritura, llamadas triplicadas a APIs externas). Si no hay `@Scheduled`: registrar "no aplica"
- [ ] **Escala horizontal asumida siempre**: toda race condition identificada es real y frecuente en producción — el servicio corre con N réplicas
- [ ] **Casos límite documentados como `CL-XX`** — incluir los defectos típicos del equipo consultando `defectos-tipicos.md`
- [ ] **Requisitos funcionales de refactorización (RF) con criterios de aceptación (`CA-XX`)** derivados del comportamiento actual que debe preservarse
- [ ] **Requisitos no funcionales (RNF)** — rendimiento, seguridad, observabilidad objetivo post-refactorización
- [ ] Registrar el estado actual con `klap remember --type note --product <id> ...` si el proyecto no tenía conocimiento funcional previo — ver `../SKILL.md`

### Entregable obligatorio — Ámbito 2 (Nuevos requerimientos, solo si está activo)

- [ ] **Fuente de los nuevos requerimientos** identificada y cargada
- [ ] **Nuevos requisitos funcionales (RF-N-XX)** con criterios de aceptación (`CA-N-XX`) — prefijo `N` para distinguirlos de los RF de refactorización
- [ ] **Nuevos casos límite (`CL-N-XX`)** derivados de los requerimientos nuevos
- [ ] **Análisis de impacto**: ¿requieren nuevas tablas/columnas en BD? ¿nuevos topics o cambios de esquema? ¿modifican contratos de API existentes?
- [ ] **Nuevos componentes identificados** — listado de clases/interfaces que no existen aún y deben crearse

---

## Fase 2 — Proponer

Antes de proponer la arquitectura objetivo, leer los skills de los componentes que serán creados o modificados según Fase 1 — tabla consolidada en `../SKILL.md`.

Identificación de patrones de diseño y análisis de concurrencia: metodología completa en `fase2-diseno-concurrencia.md`.

### Estrategia de migración

Antes de proponer la arquitectura objetivo, definir la estrategia de transición:

| Estrategia | Cuándo aplicar |
|------------|---------------|
| **Big Bang** | Proyecto pequeño, sin consumidores en producción, deuda severa que hace inviable lo incremental |
| **Strangler Fig** | Proyecto grande en producción activa — reemplazar módulo por módulo manteniendo la interfaz externa estable |
| **Branch by Abstraction** | Cambios internos de patrones sin alterar interfaces — introducir interfaz, migrar implementación, eliminar legado |
| **Expand-Contract (Parallel Change)** | Cambios en contratos de BD o API — agregar nuevo campo/endpoint, migrar consumidores, eliminar el viejo |

### Preguntas sugeridas al desarrollador

Solo si la información no es derivable del análisis de Fase 1:

- ¿Hay preferencia entre Big Bang e incremental dado el contexto del equipo y los plazos?
- ¿Existe alguna dependencia de versión de plataforma que limite la versión de Java o Spring Boot objetivo?
- ¿Hay patrones de resiliencia ya estandarizados en el equipo que deban aplicarse?
- ¿Hay Redis u otra herramienta de coordinación distribuida disponible? _(preguntar solo si no se respondió en Fase 1 y hay `@Scheduled` o race conditions que requieren lock distribuido)_
- `[Ámbito 2]` ¿Los nuevos componentes deben integrarse en el mismo paquete de dominio o en uno nuevo?

### Entregable obligatorio — Ámbito 1 (Refactorización)

- [ ] **Arquitectura objetivo**: capas global/dominio con estructura de paquetes completa (`cl.klap.bysf.{modulo}.{aplicacion}` + `dominio/{nombre_dominio}/` — ver `../../klap-standard/references/arquitectura.md`), versión de Java y Spring Boot objetivo, dependencias a actualizar/agregar/eliminar
- [ ] Skills relevantes leídos y aplicados — listar cuáles se consultaron
- [ ] **Estrategia de migración** elegida y justificada
- [ ] **Mapa de transformación** — tabla comparativa estado actual → estado objetivo por componente:

  | Componente actual | Patrón actual | Componente objetivo | Patrón objetivo | Acción |
  |-------------------|---------------|---------------------|-----------------|--------|
  | `XxxService.java` | God class | `XxxProcessor`, `XxxRepository` | Saga + Repository | Dividir |
  | `RestTemplate` bean | Sin resiliencia | `XxxClient` con `RestClient` | Circuit breaker | Reemplazar |
  | Sin tests | — | Suite JUnit 5 + Mockito | TDD | Agregar |

- [ ] **Plan de compatibilidad** — para cada salida del inventario de Fase 1, verificar explícitamente si se preserva el formato exacto, la estructura del documento, el naming convention y el comportamiento de error; si hay cambio, confirmar estrategia Expand-Contract y migración de consumidores antes de eliminar el formato viejo:

  | Salida | Tipo | ¿Se preserva? | Estrategia si cambia |
  |--------|------|--------------|---------------------|
  | `reporte_diario.csv` | Archivo CSV | Sí / No | — / Expand-Contract |
  | Topic `pagos.procesados` | Kafka | Sí / No | — / Expand-Contract |
  | `GET /api/pagos/{id}` response | REST | Sí / No | — / Versionar endpoint |
  | Tabla `pagos` (columnas escritas) | BD | Sí / No | — / Migración Flyway |

- [ ] **Contratos de interfaces** con package correcto en cada firma
- [ ] **Decisiones técnicas** con justificación
- [ ] **Alineación con estándar KLAP BYSF** confirmada
- [ ] **Desviaciones del estándar** explícitamente señaladas (con justificación si aplica al contexto legacy)
- [ ] **Archivos `application-{ambiente}.properties`** diseñados para los 4 ambientes (local/develop/qa/master) — si el microservicio incluye Kafka o cambia configuración significativamente
- [ ] **Plan de rollback** — cómo revertir si la migración falla en producción
- [ ] Checklist de `fase2-diseno-concurrencia.md` cerrado para la arquitectura objetivo

### Entregable obligatorio — Ámbito 2 (Nuevos requerimientos, solo si está activo)

- [ ] **Nuevos componentes a crear** — con package, nombre de clase y patrón KLAP BYSF aplicado
- [ ] **Contratos de interfaces nuevas** con firma completa
- [ ] **Integración con la arquitectura objetivo** — cómo los nuevos componentes se conectan con los refactorizados (no duplicar capas, reutilizar repositories/clients ya propuestos)
- [ ] **Cambios en BD** requeridos (nuevas tablas, columnas, índices, script Flyway)
- [ ] **Cambios en contratos externos** requeridos (nuevos endpoints, nuevos topics, nuevos campos en esquemas existentes)

---

## Fase 3 — Validar

### Characterization tests — siempre obligatorios

En proyectos de refactorización, los **characterization tests son siempre obligatorios**: capturan el comportamiento actual como contrato ejecutable antes de modificar una sola línea de código. No son opcionales aunque el proyecto ya tenga tests — los existentes validan la implementación interna, los characterization tests validan el contrato externo observable.

Debe existir al menos un characterization test por cada tipo de salida del inventario de Fase 1:

| Tipo de salida | Qué debe verificar el characterization test |
|---------------|---------------------------------------------|
| Archivo CSV / TXT | Mismo encoding, delimitador, orden de columnas, naming convention del archivo |
| Documento JSON / XML | Mismo schema: campos, tipos, nullability, nesting |
| Mensaje Kafka / broker | Mismo topic, misma estructura de key, mismo schema de value |
| HTTP response | Mismo status code, mismo body schema, mismos headers relevantes |
| Escritura a BD | Mismas columnas, mismos valores derivados, misma lógica de transformación |
| Email / webhook | Mismo destinatario/URL pattern, mismo body schema |
| Archivo FTP / SFTP | Mismo naming convention, mismo formato, mismo encoding |

### Preguntas sugeridas al desarrollador

Solo si hay decisiones de priorización o secuencia que el dev debe tomar:

- ¿Se implementan primero las tareas de refactorización y luego los nuevos requerimientos, o en paralelo?
- ¿Hay alguna tarea de alto riesgo que el dev quiera revisar antes de incluirla en el sprint?
- ¿El orden de despliegue entre servicios dependientes está acordado con el equipo?

### Entregable obligatorio

- [ ] **Reporte ✅/❌** por cada regla DO/DON'T del equipo — ver `checklist.md`
- [ ] **Verificación de naming conventions**
- [ ] **Tabla de tareas atómicas** con orden de dependencias, columna **Ámbito** y columna **Riesgo** — los characterization tests van SIEMPRE como primeras tareas, antes de cualquier tarea de refactorización:

  | Tipo | Cuándo usar |
  |------|-------------|
  | `Refact.` | Tarea ejecutada por el dev en esta refactorización |
  | `Nuevo req.` | Tarea de Ámbito 2 — nuevo requerimiento |
  | `[EXT]` | Dependencia externa — ejecutada por otro equipo. Bloquea tareas posteriores pero no la ejecuta el dev. Documentar quién la ejecuta y cómo confirmar que está lista |

  | # | Tipo | Tarea | Depende de | Tamaño | Riesgo | CA/CL | Tests |
  |---|------|-------|-----------|--------|--------|-------|-------|
  | T1 | Refact. | Escribir characterization tests del comportamiento actual | — | M | Bajo | RF-01..N | Integración |
  | T2 | [EXT] | Infraestructura provisiona recurso externo | T1 | — | Alto | — | Confirmación del equipo de infra |
  | T3 | Refact. | Actualizar `pom.xml`/`build.gradle`: Java 21 + Spring Boot 3.5.x | T2 | S | Medio | — | Build verde |
  | T4 | Refact. | Crear `XxxRepository` con `JdbcTemplate` | T3 | M | Bajo | CA-03, CL-02 | Unitario + Integración |
  | T5 | Nuevo req. | Crear `XxxProcessor` para RF-N-01 | T4 | M | Bajo | CA-N-01, CL-N-01 | Unitario + Integración |

- [ ] **Estimación de tamaño por tarea** (S/M/L)
- [ ] **Trazabilidad**: cada tarea referencia sus `CA-XX`/`CA-N-XX` y `CL-XX`/`CL-N-XX`
- [ ] **Nivel de riesgo por tarea** (Bajo/Medio/Alto) con justificación
- [ ] **Plan de tests por tarea**: characterization tests del comportamiento actual (obligatorios siempre, uno por tipo de salida, ejecutados ANTES del refactor como baseline reutilizable), tests unitarios de la nueva implementación, tests de integración por componente con infraestructura externa, y **tests de no-regresión de contratos** (la misma suite de characterization tests ejecutada sobre el código refactorizado; deben pasar en verde antes de cerrar la fase)
- [ ] **Plan de tests incluye escenarios de concurrencia** para componentes I/O-bound
- [ ] **Race conditions cubiertas con tests**: acceso concurrente e idempotencia
- [ ] `defectos-tipicos.md` consultado: las 6 categorías verificadas en el plan
- [ ] **Orden de despliegue** definido si hay múltiples módulos o servicios dependientes

---

## Archivos de salida

Directorio `spec/` (ver `../SKILL.md`), con naming distinto al flujo nuevo por el sufijo `-refactor-*` y el directorio adicional de contratos:

| Archivo / Directorio | Contenido | Naming |
|---------------------|-----------|--------|
| `spec/[nombre-proyecto]-refactor-spec.md` | Análisis + diseño: output de Fases 1 y 2. Si Ámbito 2 está activo, incluye sección separada con los nuevos requerimientos y su arquitectura | Nombre del proyecto en kebab-case + `-refactor-spec` |
| `spec/[nombre-proyecto]-refactor-plan.md` | Plan de trabajo: output de Fase 3 (tabla de tareas unificada con columna Ámbito, tests, trazabilidad, rollback) | Nombre del proyecto en kebab-case + `-refactor-plan` |
| `spec/contracts/` | Snapshots de los contratos actuales — un archivo por cada tipo de salida del inventario de Fase 1. Son el "before" contra el que corren los characterization tests post-refactor | `[tipo]-[nombre-descriptivo].[ext]` — ej: `csv-reporte-diario.csv`, `json-response-pago.json`, `kafka-schema-pagos-procesados.json` |

Para el proyecto `tarifa-service`, este flujo produce:
```
spec/tarifa-service-refactor-spec.md   ← secciones: [Ámbito 1] Refactorización / [Ámbito 2] Nuevos requerimientos
spec/tarifa-service-refactor-plan.md   ← tabla unificada con columna Ámbito por tarea
```
