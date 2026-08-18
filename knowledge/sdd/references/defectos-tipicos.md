# Defectos típicos del equipo — 6 categorías

Defectos recurrentes detectados en desarrollos del equipo KLAP SVA. Los
agentes del SDD deben consultar esta lista para asegurar que el plan los
aborda explícitamente.

## Cuándo usar

| Fase | Acción |
|---|---|
| Fase 1/Fase 3 (Validar) | Verificar que el plan de tareas cubre cada categoría. Si algún criterio no está explícito, **consultar al dev antes de continuar** |
| Fase 5 (Verificar) | Verificar que la implementación resuelve cada categoría. Si alguna falla, rutear a Fase 4 |

**Regla de oro:** si el plan omite los criterios de una categoría, no agregar
tareas automáticamente — consultar al dev con las preguntas sugeridas y
registrar la decisión.

## 1. Registros o transacciones duplicadas

**Riesgo:** cobros duplicados, estados inconsistentes, violación de integridad referencial. Kafka opera at-least-once — el mismo mensaje puede procesarse más de una vez ante un reintento o rebalance.

Criterios: punto de duplicación identificado (reintento Kafka, retry de RestClient, reintento manual) · estrategia de idempotencia definida (`UNIQUE constraint`, tabla de eventos procesados, campo `procesado_at`) · comportamiento ante duplicado especificado · test que simule el mensaje duplicado.

Preguntas si el plan no lo cubre: ¿puede el mismo mensaje/solicitud llegar más de una vez, y en qué escenario? ¿qué debe pasar ante un duplicado detectado? ¿hay `UNIQUE constraint` a nivel de BD o la idempotencia es solo de negocio?

## 2. Datos nulos

**Riesgo:** `NullPointerException` en producción, procesamiento silencioso de datos incompletos. Los mensajes Kafka se deserializan desde JSON — campos ausentes llegan como `null` sin advertencia.

Criterios: campos críticos que pueden llegar nulos listados (Kafka, RestClient, PostgreSQL) · comportamiento por campo nulo definido (rechazar, default, DLQ) · nulos representativos documentados como `CL-XX` en Fase 1 · test con payload con campos nulos/ausentes.

Preguntas: ¿qué campos del payload son obligatorios y cuáles pueden venir nulos? ¿qué pasa cuando llega un nulo en un campo obligatorio? ¿hay nulos desde RestClient o PostgreSQL que deban manejarse explícitamente?

## 3. Validación de entrada

**Riesgo:** SQL injection, datos corruptos, errores de integración por formato incorrecto. JDBC sin JPA — las queries se construyen manualmente; los datos de Kafka llegan sin validación previa del productor.

Criterios: formatos esperados definidos por campo (RUT, email, fecha ISO-8601, monto, teléfono) · validaciones especificadas (regex, rango, longitud, lista de valores) · comportamiento ante entrada inválida definido · **todas las queries JDBC usan `PreparedStatement`** — ninguna concatena strings del payload · test con inputs inválidos (caracteres especiales, vacíos, malformados, SQL injection strings).

Preguntas: ¿qué campos requieren validación de formato? ¿qué se hace ante formato inválido? ¿todas las queries usan `PreparedStatement`?

## 4. Casos de borde — criterios de tratamiento

**Riesgo:** mensajes Kafka perdidos sin DLQ, procesos que fallan silenciosamente, inconsistencia de estado ante fallos parciales, MTTR alto. Resilience4j disponible para retry/circuit breaker; DLQ es el fallback estándar.

Criterios: comportamiento ante servicio externo caído o con error HTTP · estrategia de retry (reintentos, backoff, condición) · comportamiento de DLQ especificado · notificación de alerta ante fallos críticos definida · logs de monitoreo por tipo de fallo (nivel, campos clave) · timeout del RestClient especificado y configurado · comportamiento ante fallo parcial (ej. guardó en BD pero falló el RestClient) · tests de timeout, HTTP 500, DLQ hit, reintentos agotados.

Preguntas: ¿qué pasa si el externo no responde en el timeout? ¿cuántos reintentos y con qué backoff, quién configura el Resilience4j? ¿se notifica tras agotar reintentos? ¿qué información mínima va en el log de un mensaje fallido? ¿fallo parcial hace rollback o acepta estado parcial y alerta?

## 5. Trazabilidad

**Riesgo:** imposibilidad de reconstruir el flujo de un mensaje en producción, MTTR alto en incidentes. Un mensaje cruza KafkaListener → Processor → Repository → RestClient; sin correlation ID el hilo se pierde.

Criterios: identificador de trazabilidad definido (correlation ID, transaction ID, u otro) · forma de propagación entre componentes especificada (header Kafka, campo del payload, MDC) · eventos clave a loguear definidos con nivel y campos mínimos · correlation ID presente en **todos** los logs del hilo (via MDC) · test que verifique el correlation ID en los logs de cada etapa.

Preguntas: ¿cuál es el identificador único de trazabilidad? ¿cómo se propaga entre KafkaListener/Processor/Repository/RestClient? ¿qué eventos mínimos deben loguearse? ¿se usa MDC para propagación automática?

## 6. Control de acceso

**Riesgo:** endpoints sin autenticación, Actuator accesible en producción, datos sensibles sin autorización. OWASP A01:2021 — Broken Access Control, el defecto más frecuente según OWASP Top 10 (ver `../../klap-standard/references/seguridad.md`).

Criterios: endpoints REST y Actuator expuestos listados · públicos vs. autenticados definidos · mecanismo de autenticación especificado (JWT, mTLS, API key, Spring Security) · Actuator solo expone `health`/`info` en producción · roles/scopes por endpoint si aplica RBAC · test de rechazo sin credenciales válidas (401/403).

Preguntas: ¿qué endpoints expone el servicio y cuáles requieren auth? ¿qué endpoints de Actuator están habilitados fuera de la red interna? ¿usa Spring Security, con qué mecanismo? ¿hay roles/scopes específicos por endpoint?

## Tabla de verificación rápida

Usar en Fase 3 para cerrar el plan y en Fase 5 para la verificación final.

| # | Categoría | Criterio mínimo | Plan lo cubre | Implementación lo resuelve |
|---|---|---|:---:|:---:|
| 1 | Duplicados | Estrategia de idempotencia definida y testeada | ☐ | ☐ |
| 2 | Nulos | Campos críticos listados y comportamiento definido | ☐ | ☐ |
| 3 | Validación | Formatos validados y `PreparedStatement` confirmado | ☐ | ☐ |
| 4 | Casos de borde | DLQ, retry, alertas y comportamiento parcial definidos | ☐ | ☐ |
| 5 | Trazabilidad | Correlation ID definido y propagado via MDC | ☐ | ☐ |
| 6 | Control de acceso | Endpoints listados, autenticación y Actuator configurados | ☐ | ☐ |

**Regla de cierre:** Fase 3 está completa solo cuando las 6 columnas "Plan lo
cubre" están marcadas. Fase 5 está terminada solo cuando las 6 columnas
"Implementación lo resuelve" están marcadas.
