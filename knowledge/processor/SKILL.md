---
name: processor
description: Orquesta el patron Saga de 6 pasos para un mensaje Kafka (validar, consultar API externa, procesar, persistir, publicar output y notificar). Usar al crear XxxProcessor / XxxProcessorImpl.
---

# Skill: Processor (Patron Saga)

## Cuando usar este skill

Al implementar la Orchestration Layer de un dominio: la clase que coordina el
flujo completo de un mensaje Kafka desde que el Listener lo entrega hasta que
el resultado queda persistido, publicado y notificado. Ver capas en
[arquitectura](../klap-standard/references/arquitectura.md).

- Interface: `dominio/{nombre_dominio}/services/{Xxx}Processor.java`
- Implementacion: `dominio/{nombre_dominio}/services/impl/{Xxx}ProcessorImpl.java`
- Naming y anotaciones: fila "Procesador (saga)" en [naming](../klap-standard/references/naming.md).

## El patron: Saga de 6 pasos

El Processor es el Template Method Pattern de la capa de orquestacion (ver
[arquitectura](../klap-standard/references/arquitectura.md)): un algoritmo
fijo de 6 pasos, con la logica especifica de cada dominio inyectada en los
metodos privados.

1. **Validar payload** — sincronico, sin dependencias externas. Payload
   invalido lanza `IllegalArgumentException` (error determinista, sin retry).
2. **Consultar API externa** — delega en `{Xxx}Client` (ver skill `webclient`).
3. **Procesar logica de negocio** — combina input + datos externos en el DTO de salida.
4. **Persistir** — `{Xxx}Repository` sobre `JdbcTemplate` (ver skill `repository`).
5. **Publicar output en Kafka** — topic de salida propio del dominio.
6. **Publicar notificacion** — topic transversal de notificacion (ej. `bysf-liqsvbo-notificacion`).

Skeleton completo (interface + implementacion) y un ejemplo real
(`LiquidacionProcessor`) en [references/saga.md](references/saga.md).

## Compensacion: que pasa cuando un paso falla

No hay rollback automatico — es un saga event-driven, no una transaccion
distribuida. La compensacion es auditar el estado (`PENDIENTE`, `ERROR`,
`NOTIFICACION_PENDIENTE`) en `Auditoria{Xxx}Repository` y dejar el retry para
un proceso manual posterior. Tabla de estados, el metodo `auditarError` y los
anti-patrones especificos de la compensacion en
[references/compensacion.md](references/compensacion.md).

## Reglas propias del Processor

**DO:**
- Delegar la consulta externa a un `{Xxx}Client` inyectado — el Processor nunca abre la conexion HTTP directamente.
- Loggear `idProceso` y `codigoSucursal` en cada paso del saga (formato general en [logging](../klap-standard/references/logging.md)).
- Re-lanzar la excepcion despues de auditar en los pasos 2-6, para que el Listener decida entre DLQ manual o reintento automatico.

**DON'T:**
- No poner logica de Kafka (`ack`, headers, offsets) en el Processor — es responsabilidad exclusiva del `{Xxx}KafkaListener`.
- No inyectar un `KafkaTemplate` compartido entre dominios — cada Processor usa el `KafkaTemplate` propio de su topic de salida.
- No usar nombres genericos (`process()`, `execute()`, `handle()`) para los metodos publicos — seguir los patrones de [naming](../klap-standard/references/naming.md).

Reglas globales (JavaDoc obligatorio, `JdbcTemplate` en vez de JPA, envio
Kafka sincronico en dominios financieros, cobertura minima) ya estan en
[reglas-do](../klap-standard/references/reglas-do.md) y
[reglas-dont](../klap-standard/references/reglas-dont.md) — no se repiten aqui.
