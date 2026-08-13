---
name: kafka
description: Crear/modificar XxxKafkaConfig o XxxKafkaListener, o completar properties Kafka por ambiente (local/develop/qa/master) de un dominio KLAP BYSF.
---

# Kafka — KLAP BYSF

## Cuándo usar este skill

Al crear o modificar la configuración Kafka de un dominio (`XxxKafkaConfig`), implementar el consumer (`XxxKafkaListener`), o completar las properties de Kafka en `application-{ambiente}.properties`. Para naming, DO/DONT y stack transversales ver `knowledge/klap-standard` — este skill cubre solo el detalle específico de Kafka.

## Qué leer cuándo

| Situación | Leer |
|---|---|
| Crear/modificar `XxxKafkaConfig` — beans de consumer/producer factory, DLQ | `references/config.md` |
| Implementar el `@KafkaListener` — circuit breaker, ack manual, clasificación de errores | `references/listener.md` |
| Completar la sección Kafka de `application-{ambiente}.properties` | `references/properties.md` |

## Resumen de cada reference

- **config.md** — template de `XxxKafkaConfig extends KafkaConfig`: los 6 beans (consumer factory, listener container factory, producer factory, 3 `KafkaTemplate`), DLQ con reintentos, `PLAINTEXT` en local vs `SASL_SSL` en el resto.
- **listener.md** — template de `XxxKafkaListener`: `@KafkaListener` con `containerFactory` explícito, circuit breaker (`AtomicInteger`, threshold 10, reset 60s), clasificación determinista vs infraestructura, envío manual a DLQ.
- **properties.md** — bloque Kafka de `application-{ambiente}.properties` para los 4 ambientes obligatorios: bootstrap servers, seguridad, consumer/producer, tabla de diffs entre ambientes.

## Reglas globales aplicables (no repetidas aquí)

Ver `knowledge/klap-standard`:
- `references/reglas-do.md` — #7 (extender `KafkaConfig`), #9 (`AckMode.MANUAL`), #10 (`max.poll.records=1`), #11 (`enable.metrics.push=false`), #12 (`ErrorHandlingDeserializer`), #15 (envío síncrono `.get()` en dominios financieros), #18 (clasificar errores deterministas vs infraestructura), #20 (ajustar `max.poll.interval.ms` según medición real).
- `references/reglas-dont.md` — #1 (no duplicar config Kafka entre dominios), #2 (no crear `ErrorHandler` sin extender la base), #7 (no crear consumer groups extra sin justificar), #8 (no omitir `enable.metrics.push=false`), #10 (no ignorar `max.poll.interval.ms`), #12 (no enviar a DLQ desde el listener por errores de infraestructura).
- `references/naming.md` — patrón `XxxKafkaListener` / `XxxKafkaConfig`.
- `references/seguridad.md` — gestión de secretos (variables de entorno, nunca literal) y masking de PII en logs.
- `references/logging.md` — contexto obligatorio (`idProceso`, `codigoSucursal`) y niveles por ambiente.
- `references/stack.md` — Kafka gestionado (Confluent / AWS MSK), dependencia `spring-kafka`.

## Nota de dominio

Los ejemplos usan el dominio `liquidacion` (SVBO) como caso de referencia. Sustituir por el dominio propio al aplicar cualquier template.
