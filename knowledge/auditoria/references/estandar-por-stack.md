# PASO 4 — Estandar KLAP por stack (reusa skills existentes)

Aplica **solo** a los stacks detectados en el PASO 1. Reutiliza las reglas de las
skills ya instaladas — no dupliques criterios que ya viven en otro skill.

## Java (microservicio Spring Boot / Lambda-Java)

- `code-review-expert` — arquitectura, SOLID, manejo de errores, performance,
  observabilidad.
- `sdd-checklist` + `knowledge/klap-standard/references/naming.md`,
  `reglas-do.md`, `reglas-dont.md` — convenciones de nombre, JavaDoc, JdbcTemplate
  (nunca JPA), queries en `ConstantsQuery`, paginacion cursor-based, cobertura
  minima. No repitas esas reglas aqui: cita el hallazgo contra el archivo.
- `defectos-tipicos-checklist` — 6 categorias: duplicados, nulls, validacion de
  inputs, edge cases (DLQ/retry/alertas), trazabilidad (idProceso + codigoSucursal),
  control de acceso (OWASP A01).
- `kafka-audit` — **solo si el proyecto usa Kafka** (hay `@KafkaListener`/
  `KafkaTemplate`); reglas Kafka especificas ya estan en
  `knowledge/klap-standard/references/reglas-do.md` y `reglas-dont.md`.

## AWS Lambda

- Cold start / timeout / memoria dimensionados; sin logica pesada en el handler init
  sin justificar.
- Permisos IAM de minimo privilegio (revisar policies en SAM/serverless/CDK).
- Gestion de secretos: mismo estandar que el resto del ecosistema — ver
  `knowledge/klap-standard/references/seguridad.md` (Secretos y credenciales).
- Idempotencia y manejo de reintentos (SQS/EventBridge/DLQ).
- Logging estructurado con correlation id; enmascarar PII/PAN segun
  `seguridad.md` (PII y PAN).

## API REST

- Contrato OpenAPI/Swagger presente y coherente (ver skill `openapi`).
- Validacion de inputs (`@Valid`/schemas), manejo de errores centralizado, codigos
  HTTP correctos.
- Autenticacion/autorizacion y CORS configurados; sin endpoints sensibles expuestos.

## Angular

- `ng lint` sin errores; `npm audit` sin CRITICAL/HIGH.
- Cobertura de tests (Karma/Jest) por encima del umbral autodetectado (PASO 2 de
  `gates.md`).
- `ng build --configuration production` sin warnings; sin secrets en el bundle;
  source maps de prod controlados.
