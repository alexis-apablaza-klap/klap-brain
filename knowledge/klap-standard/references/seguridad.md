# Estandares de seguridad — KLAP BYSF

Aplican a todo microservicio, sin excepcion. Ver tambien el skill `auditoria`
para como se verifican automaticamente antes de certificacion.

## Cumplimiento

- **OWASP Top 10** — mapear amenazas por componente: SSRF si hay HTTP externo,
  deserializacion insegura si hay mensajeria o datos serializados, SpEL
  Injection si hay expresiones dinamicas, Mass Assignment si hay REST con
  binding automatico, exposicion de Actuator si esta habilitado.
- **Regulacion financiera CMF** — el dominio es financiero; cualquier decision
  que se desvie del estandar de trazabilidad o control debe quedar
  documentada explicitamente en el spec del SDD (ver skill `sdd`).
- Controles NIST SP 800-53 y tecnicas MITRE ATT&CK mapeadas por modulo cuando
  el diseño lo justifique (integraciones externas, datos sensibles).

## Secretos y credenciales

- **Cero credenciales o API keys hardcodeadas.** Todo secreto se resuelve via
  AWS Secrets Manager o Spring Cloud Config — nunca en `application.yml`
  committeado, nunca en literales de codigo.
- Los property files de ambientes reales usan siempre `${VARIABLE}` — un
  valor literal en una clave `password`/`token`/`secret`/`apikey` en un
  archivo committeado es un hallazgo de seguridad, no una excepcion valida.

## PII y PAN

- Mandatorio enmascarar PII (datos personales) y PAN (numeros de tarjeta) en
  logs y trazas. Nunca loguear el body completo de un request/response que
  pueda contener esos datos — truncar y enmascarar antes de loguear.

## Concurrencia y Virtual Threads

- Usar Java 21 Virtual Threads para I/O bloqueante donde aplique (llamadas
  HTTP externas, JDBC) en lugar de pools de threads tradicionales
  sobre-dimensionados.
- Todo par verificar→crear o leer→actualizar que pueda ejecutarse en paralelo
  entre replicas necesita una estrategia explicita (constraint UNIQUE, lock
  distribuido, clave de idempotencia) — nunca asumir que "no va a pasar".

## Columnas para respuestas de APIs externas

Las columnas que almacenan respuestas crudas de proveedores externos (error
bodies, payloads de terceros) se declaran **`text`, nunca `json`/`jsonb`**.
En fallas de infraestructura (502/504, proxies, CDN) el proveedor puede
devolver HTML; una columna `json` rechaza el INSERT y puede hacer que un
scheduler de reintentos entre en loop infinito sobre el mismo registro.
