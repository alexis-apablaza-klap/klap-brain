# Reglas DO — practicas obligatorias KLAP BYSF

1. Definir siempre una interfaz de servicio antes de su implementacion.
2. Usar Lombok: `@Data`, `@Builder`, `@RequiredArgsConstructor`, `@Slf4j`.
3. Logging apropiado: `DEBUG` en local, `INFO` en produccion — incluir siempre `idProceso` y `codigoSucursal`.
4. Tests unitarios con 95% de cobertura minima (JaCoCo).
5. Excepciones custom por dominio: `XxxException`, `XxxClientException`, `XxxPersistenceException`.
6. `JdbcTemplate` para PostgreSQL — nunca JPA/Hibernate.
7. Factory Pattern para Kafka: extender la `KafkaConfig` base, no duplicar configuracion.
8. Naming de DTOs consistente: `InputDto`, `OutputDto`, `RequestDto`, `ResponseDto`.
9. `AckMode.MANUAL` en Kafka, para at-least-once con control explicito de commits.
10. `max.poll.records=1` en todos los consumers, para backpressure.
11. `enable.metrics.push=false` en toda config Kafka — critico para evitar OOM en MSK/Confluent.
12. `ErrorHandlingDeserializer` como wrapper de `JsonDeserializer` — mensajes malformados van a DLQ automaticamente.
13. Paginacion cursor-based (por PK) para tablas con mas de 500 registros.
14. Cache con TTL en el repositorio para datos de configuracion leidos en cada mensaje.
15. Envio Kafka sincronico (`.get()`) en dominios financieros, para garantizar consistencia.
16. Timeout explicito (3s) en health indicators de base de datos.
17. RowMappers en paquete `mapper/` cuando tienen 20+ columnas o se reutilizan.
18. Clasificar errores en el listener: deterministas → DLQ inmediato; infraestructura → re-throw para que `KafkaConfig` reintente.
19. `NonRetryableClientDataException` para errores de datos irrecuperables — van a DLQ sin reintentos.
20. Ajustar `max.poll.interval.ms` segun el tiempo real de procesamiento (medir con `AtomicLong`).
21. JavaDoc obligatorio en todos los metodos publicos, explicando objetivo o funcionamiento (ver `naming.md`).
