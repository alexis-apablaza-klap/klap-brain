# Reglas DONT — anti-patrones prohibidos KLAP BYSF

1. No duplicar configuracion Kafka — extender la clase base `KafkaConfig`.
2. No crear nuevos error handlers de Kafka sin extender el de `KafkaConfig`.
3. No modificar `NotificationMessageDto` sin coordinacion cross-team (lo consumen otros dominios).
4. No usar JPA/Hibernate — la arquitectura es JDBC puro con `JdbcTemplate`.
5. No hacer bypass del service layer — siempre pasar por las interfaces.
6. No usar `OFFSET/LIMIT` para paginacion sobre tablas grandes — usar cursor-based por PK.
7. No crear multiples consumer groups para el mismo topic sin justificacion documentada.
8. No omitir `enable.metrics.push=false` — provoca OOM progresivo en MSK en produccion.
9. No hardcodear SQL fuera de `ConstantsQuery`.
10. No ignorar `max.poll.interval.ms` — si el procesamiento supera el intervalo, Kafka expulsa al consumer.
11. No usar cache sin TTL en repositorios — datos congelados generan bugs dificiles de diagnosticar.
12. No enviar a DLQ desde el listener por errores de infraestructura — dejar que `KafkaConfig` maneje los reintentos.
13. No omitir JavaDoc en metodos publicos.
