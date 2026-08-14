# Kafka Properties por ambiente — `application-{ambiente}.properties`

Router: `knowledge/kafka/SKILL.md`.

## Cuándo usar

Al completar o revisar la sección Kafka de los 4 archivos de ambiente obligatorios: `application-local.properties`, `application-develop.properties`, `application-qa.properties`, `application-master.properties`. Estructura general del archivo `.properties` y reglas no-Kafka: ver `../../klap-standard/references/arquitectura.md`.

## Advertencia: propiedades ignoradas por los factories manuales

Con `KafkaConfig` (`kafka-config-base.md`) los `ConsumerFactory`/`ProducerFactory` se construyen a mano — Spring Boot **desactiva su auto-configuración de Kafka** al detectar esos beans manuales. Consecuencia real: las propiedades de auto-configuración `spring.kafka.consumer.*` y `spring.kafka.producer.*` (deserializer, `group-id`, `acks`, etc. declaradas como properties top-level, no dentro de `spring.kafka.consumer.properties.*`) **no tienen efecto** sobre esos beans — solo aplicarían si Spring Boot construyera el cliente automáticamente, lo que no ocurre en este stack. El `groupId` real lo fija el segundo argumento de `createConsumerFactory(...)` en código (ver `config.md`), no `spring.kafka.consumer.group-id`. Mantener esas líneas como documentación de referencia no rompe nada, pero no asumas que cambiarlas cambia el comportamiento real.

## Reglas específicas de Kafka por ambiente

- Credenciales Confluent siempre por variable de entorno (`${BYSF_LIQSVBO_BOOTSTRAP_SERVER_CONFLUENT}`, `${BYSF_LIQSVBO_USER_NAME_CONFLUENT}`, `${BYSF_LIQSVBO_PASSWORD_CONFLUENT}`) — nunca un valor literal, ver gestión de secretos en `../../klap-standard/references/seguridad.md`.
- `security.protocol=PLAINTEXT` en local; `SASL_SSL` con `sasl.mechanism=PLAIN` en develop/qa/master.
- `linger.ms=0` en los 4 ambientes — el envío es síncrono con `.get()`, así que con `max.poll.records=1` el batching nunca llega a ocurrir.
- `max.poll.interval.ms`: `300000` (5 min) en local; `3600000` (1h) en develop/qa/master, para soportar procesamiento pesado (BD, Lambda, APIs externas).
- `compression-type`: `none` en local; `lz4` en develop/qa/master.
- `max.request.size`: `1048576` (1MB) en local; `10485760` (10MB) en develop/qa/master, para listas grandes en notificaciones modo FULL.
- Loggers `org.apache.kafka` / `org.springframework.kafka`: `WARN` en local, `ERROR` en develop/qa/master — nunca `DEBUG`, generan ruido excesivo por el polling.
- `enable.auto.commit=false` en todos los ambientes — el commit lo maneja el listener vía `AckMode.MANUAL` (regla global, ver `../../klap-standard/references/reglas-do.md` #9).
- Las claves `kafka.topics.{dominio}.*` SÍ son leídas directamente por `@Value` en `{Xxx}KafkaConfig` y por `@KafkaListener(topics = ...)` (ver `config.md`, `listener.md`) — deben coincidir exactamente, a diferencia de `spring.kafka.consumer.*`/`producer.*` (ver advertencia arriba).

## Template LOCAL (`application-local.properties`)

```properties
# ===================================================================
# KAFKA - TOPICS
# ===================================================================
kafka.topics.{dominio}.input={nombre-topico-entrada}
kafka.topics.{dominio}.output={nombre-topico-salida}
kafka.topics.notificacion={nombre-topico-notificacion}
kafka.topics.{dominio}.dlq=dlq-{nombre-topico-entrada}
app.kafka.group-id={consumer-group}-local

# ===================================================================
# KAFKA - BROKER / SEGURIDAD
# ===================================================================
spring.kafka.bootstrap-servers=127.0.0.1:9092
# Sin autenticacion en local — addSecurityPropsIfNeeded() la omite para perfil "local"
spring.kafka.properties.security.protocol=PLAINTEXT
spring.kafka.properties.sasl.mechanism=PLAIN
spring.kafka.properties.sasl.jaas.config=
spring.kafka.properties.client.dns.lookup=use_all_dns_ips

# ===================================================================
# KAFKA - CONSUMER
# ===================================================================
spring.kafka.consumer.group-id={consumer-group}-local
spring.kafka.consumer.auto-offset-reset=latest
spring.kafka.consumer.enable-auto-commit=false
spring.kafka.consumer.key-deserializer=org.apache.kafka.common.serialization.StringDeserializer
spring.kafka.consumer.value-deserializer=org.springframework.kafka.support.serializer.JsonDeserializer
spring.kafka.consumer.properties.spring.json.trusted.packages=*
spring.kafka.consumer.properties.spring.json.use.type.headers=false
spring.kafka.consumer.properties.request.timeout.ms=30000
spring.kafka.consumer.properties.session.timeout.ms=45000
spring.kafka.consumer.properties.max.poll.interval.ms=300000
spring.kafka.consumer.properties.max.poll.records=1
spring.kafka.consumer.properties.fetch.max.bytes=52428800
spring.kafka.consumer.properties.fetch.min.bytes=1

# ===================================================================
# KAFKA - PRODUCER
# ===================================================================
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.springframework.kafka.support.serializer.JsonSerializer
spring.kafka.producer.acks=all
spring.kafka.producer.retries=3
spring.kafka.producer.properties.spring.json.add.type.headers=false
spring.kafka.producer.properties.spring.json.trusted.packages=*
spring.kafka.producer.properties.enable.idempotence=true
spring.kafka.producer.properties.max.in.flight.requests.per.connection=5
spring.kafka.producer.properties.delivery.timeout.ms=120000
spring.kafka.producer.properties.request.timeout.ms=20000
spring.kafka.producer.properties.max.block.ms=60000
spring.kafka.producer.compression-type=none
spring.kafka.producer.properties.batch.size=16384
spring.kafka.producer.properties.buffer.memory=5242880
# linger.ms=0: envio sincrono con .get(), batching nunca ocurre con max.poll.records=1
spring.kafka.producer.properties.linger.ms=0
spring.kafka.producer.properties.max.request.size=1048576

# ===================================================================
# LOGGING KAFKA
# ===================================================================
logging.level.org.apache.kafka=WARN
logging.level.org.springframework.kafka=WARN
```

## Template DEVELOP (`application-develop.properties`)

```properties
# ===================================================================
# KAFKA - TOPICS
# ===================================================================
kafka.topics.{dominio}.input={nombre-topico-entrada}
kafka.topics.{dominio}.output={nombre-topico-salida}
kafka.topics.notificacion={nombre-topico-notificacion}
kafka.topics.{dominio}.dlq=dlq-{nombre-topico-entrada}
app.kafka.group-id={consumer-group}

# ===================================================================
# KAFKA - BROKER / SEGURIDAD
# ===================================================================
spring.kafka.bootstrap-servers=${BYSF_LIQSVBO_BOOTSTRAP_SERVER_CONFLUENT}
spring.kafka.properties.security.protocol=SASL_SSL
spring.kafka.properties.sasl.mechanism=PLAIN
spring.kafka.properties.sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username='${BYSF_LIQSVBO_USER_NAME_CONFLUENT}' password='${BYSF_LIQSVBO_PASSWORD_CONFLUENT}';
spring.kafka.properties.client.dns.lookup=use_all_dns_ips
spring.kafka.properties.session.timeout.ms=45000
spring.kafka.properties.client.id=${spring.application.name}
# Deshabilita telemetria KIP-714 — evita OOM por ZSTD bajo presion de heap
spring.kafka.properties.enable.metrics.push=false

# ===================================================================
# KAFKA - CONSUMER
# ===================================================================
spring.kafka.consumer.group-id={consumer-group}
spring.kafka.consumer.auto-offset-reset=latest
spring.kafka.consumer.enable-auto-commit=false
spring.kafka.consumer.key-deserializer=org.apache.kafka.common.serialization.StringDeserializer
spring.kafka.consumer.value-deserializer=org.springframework.kafka.support.serializer.JsonDeserializer
spring.kafka.consumer.properties.spring.json.trusted.packages=*
spring.kafka.consumer.properties.spring.json.use.type.headers=false
spring.kafka.consumer.properties.request.timeout.ms=30000
# 1h — soporta procesamiento pesado (BD, Lambda, APIs externas)
spring.kafka.consumer.properties.max.poll.interval.ms=3600000
spring.kafka.consumer.properties.max.poll.records=1
spring.kafka.consumer.properties.fetch.max.bytes=52428800
spring.kafka.consumer.properties.fetch.min.bytes=1

# ===================================================================
# KAFKA - PRODUCER
# ===================================================================
spring.kafka.producer.key-serializer=org.apache.kafka.common.serialization.StringSerializer
spring.kafka.producer.value-serializer=org.springframework.kafka.support.serializer.JsonSerializer
spring.kafka.producer.acks=all
spring.kafka.producer.retries=3
spring.kafka.producer.properties.spring.json.add.type.headers=false
spring.kafka.producer.properties.spring.json.trusted.packages=*
spring.kafka.producer.properties.enable.idempotence=true
spring.kafka.producer.properties.max.in.flight.requests.per.connection=5
spring.kafka.producer.properties.delivery.timeout.ms=120000
spring.kafka.producer.properties.request.timeout.ms=20000
spring.kafka.producer.properties.max.block.ms=60000
spring.kafka.producer.compression-type=lz4
spring.kafka.producer.properties.batch.size=16384
spring.kafka.producer.properties.buffer.memory=5242880
spring.kafka.producer.properties.linger.ms=0
# 10MB — soporta modo FULL con listas grandes de transacciones en notificaciones
spring.kafka.producer.properties.max.request.size=10485760

# ===================================================================
# LOGGING KAFKA
# ===================================================================
logging.level.org.apache.kafka=ERROR
logging.level.org.springframework.kafka=ERROR
```

## Template QA (`application-qa.properties`)

Idéntico a `develop`; ajustar solo si el broker QA difiere del broker de desarrollo.

```properties
# Igual que develop — ajustar solo si el broker QA difiere
spring.kafka.bootstrap-servers=${BYSF_LIQSVBO_BOOTSTRAP_SERVER_CONFLUENT}
spring.kafka.properties.sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username='${BYSF_LIQSVBO_USER_NAME_CONFLUENT}' password='${BYSF_LIQSVBO_PASSWORD_CONFLUENT}';
# ... resto igual que develop
```

## Template MASTER (`application-master.properties`)

Igual que develop/qa; la única diferencia real de Kafka es el nivel de logging de paquete raíz (regla global de logging por ambiente, ver `../../klap-standard/references/logging.md`) — los loggers de Kafka en sí permanecen en `ERROR`.

```properties
# El resto de bloques Kafka es identico a develop/qa
spring.kafka.bootstrap-servers=${BYSF_LIQSVBO_BOOTSTRAP_SERVER_CONFLUENT}
spring.kafka.properties.security.protocol=SASL_SSL
spring.kafka.properties.sasl.mechanism=PLAIN
spring.kafka.properties.sasl.jaas.config=org.apache.kafka.common.security.plain.PlainLoginModule required username='${BYSF_LIQSVBO_USER_NAME_CONFLUENT}' password='${BYSF_LIQSVBO_PASSWORD_CONFLUENT}';
spring.kafka.properties.enable.metrics.push=false
spring.kafka.consumer.properties.max.poll.interval.ms=3600000
spring.kafka.consumer.properties.max.poll.records=1
spring.kafka.producer.compression-type=lz4
spring.kafka.producer.properties.max.request.size=10485760
logging.level.org.apache.kafka=ERROR
logging.level.org.springframework.kafka=ERROR
```

## Diferencias clave entre ambientes

| Propiedad | local | develop/qa | master |
|-----------|-------|------------|--------|
| `bootstrap-servers` | `127.0.0.1:9092` | `${VAR_ENTORNO}` | `${VAR_ENTORNO}` |
| `security.protocol` | `PLAINTEXT` | `SASL_SSL` | `SASL_SSL` |
| `sasl.jaas.config` | vacío | `${USER}` / `${PASS}` | `${USER}` / `${PASS}` |
| `enable.metrics.push` | (omitido) | `false` | `false` |
| `max.poll.interval.ms` | `300000` (5 min) | `3600000` (1h) | `3600000` (1h) |
| `compression-type` | `none` | `lz4` | `lz4` |
| `max.request.size` | `1048576` (1MB) | `10485760` (10MB) | `10485760` (10MB) |
| logger `org.apache.kafka` | `WARN` | `ERROR` | `ERROR` |
