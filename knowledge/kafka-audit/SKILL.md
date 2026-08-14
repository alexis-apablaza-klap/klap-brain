---
name: kafka-audit
description: Audita si la implementación Kafka de un microservicio existente cumple el estándar knowledge/kafka/ (config base y de dominio, listener, properties, tests). Reporta desviaciones con severidad.
disable-model-invocation: true
allowed-tools: Read, Grep, Glob, Bash, Edit, Write, TaskCreate, TaskUpdate, TaskList
---

# Auditoría de cumplimiento Kafka

Audita si la implementación Kafka de este proyecto cumple el estándar definido
en `knowledge/kafka/` (no un documento aparte — es la misma referencia que usa
`sdd` al implementar). Cada desviación es un hallazgo.

**Severidad** (misma escala que `../auditoria/references/veredicto.md`):
CRITICO · ALTO · MEDIO · BAJO.

**Veredicto del componente:** CUMPLE (0 hallazgos CRITICO/ALTO) · CUMPLE
PARCIALMENTE (solo MEDIO/BAJO) · NO CUMPLE (algún CRITICO/ALTO).

---

## PASO 1 — Exploración del proyecto

```
src/main/java/**/*.java  →  @KafkaListener, KafkaTemplate, ConsumerFactory, ProducerFactory, KafkaConfig
src/test/java/**/*.java  →  tests de listener y del paso de publicación del Processor
src/main/resources/application-{local,develop,qa,master}.properties
```

Identifica y lee:
1. **KafkaConfig base** (`global/config/KafkaConfig.java` — abstracta, sin `@Configuration`)
2. **KafkaConfig de dominio** (`{Xxx}KafkaConfig extends KafkaConfig`)
3. **Listener(s)** (`@KafkaListener`)
4. **Processor** — paso 5/6 (publicación en topic output + notificación)
5. **Excepciones** — `NonRetryableClientDataException` y la jerarquia `XxxException`/`XxxClientException`/`XxxPersistenceException`
6. **Properties** de los 4 ambientes
7. **Tests** del listener y del paso de publicación

---

## PASO 2 — Auditoría por componente

### A. KafkaConfig base — ver `../kafka/references/kafka-config-base.md`

- [ ] Existe una clase abstracta (`public abstract class KafkaConfig`), **sin** `@Configuration` (CRITICO si no existe ninguna base — todo duplicado entre dominios; ALTO si existe pero tiene `@Configuration`)
- [ ] `@Value` presentes: `bootstrapServers`, `autoOffsetReset`, `securityProtocol`, `saslMechanism`, `saslJaasConfig`, `requestTimeoutMs`, `dnsLookup`, `applicationName`, `hostname` (`${HOSTNAME:unknown}`), `maxPollIntervalMs`, `maxPollRecords`, `producerBufferMemory`, `compressionType`, `producerRetries`, `producerMaxRequestSize` (ALTO por cada una ausente que además se usa hardcodeada más abajo — ver el siguiente punto)
- [ ] `client.id` de consumer/producer usa `applicationName + "-" + hostname`, no solo `applicationName` (MEDIO — sin hostname no se distinguen réplicas ECS en las métricas de Confluent)
- [ ] **CRITICO especial — retries/max.request.size hardcodeados:** si `getProducerProperties()` usa una constante Java en vez de los campos `producerRetries`/`producerMaxRequestSize` leídos por `@Value`, el properties.md del ambiente queda sin efecto real y nadie lo nota
- [ ] `createConsumerFactory(Class<T> targetType, String groupId)` devuelve `Map<String, Object>` — con `VALUE_DESERIALIZER_CLASS_CONFIG=ErrorHandlingDeserializer`, `ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS=JsonDeserializer`, `JsonDeserializer.VALUE_DEFAULT_TYPE=targetType` (ALTO si falta — sin `ErrorHandlingDeserializer`, un JSON malformado tumba el consumer entero, no solo el mensaje)
- [ ] `getConsumerProperties`: `ENABLE_AUTO_COMMIT_CONFIG=false` (CRITICO), `enable.metrics.push=false` (ALTO — riesgo OOM en Confluent Cloud), llama `addSecurityPropsIfNeeded` (CRITICO)
- [ ] `getProducerProperties`: `ACKS_CONFIG="all"` (ALTO), `ENABLE_IDEMPOTENCE_CONFIG=true` (ALTO), `LINGER_MS_CONFIG=0` (MEDIO — con envío síncrono `.get()`, `linger>0` solo agrega latencia), llama `addSecurityPropsIfNeeded` (CRITICO)
- [ ] `addSecurityPropsIfNeeded`: solo aplica SASL si el perfil activo **no** es `"local"` (ALTO — en local con SASL_SSL sin credenciales el consumer no arranca)
- [ ] `createListenerContainerFactoryWithDlq` recibe 5 argumentos explícitos (`consumerFactory, dlqTemplate, dlqTopic, maxRetries, backoffMs`) — **no** hardcodea reintentos/backoff como constantes de la clase base (MEDIO — cada dominio puede necesitar tolerancias distintas)
- [ ] El error handler usa `DeadLetterPublishingRecoverer` (republica el record original) — **no** un envoltorio JSON manual (MEDIO — un envoltorio ad-hoc rompe la deserialización del consumidor del DLQ)
- [ ] `AckMode.MANUAL` configurado en el factory (CRITICO — sin esto el offset se commitea automáticamente incluso si el mensaje falló)
- [ ] `NonRetryableClientDataException` marcada `addNotRetryableExceptions` en el `DefaultErrorHandler` (MEDIO — defensa en profundidad si se escapa del try/catch del listener)

### B. KafkaConfig de dominio — ver `../kafka/references/config.md`

- [ ] `@Configuration` + extiende `KafkaConfig` (ALTO — sin extenderla, duplica toda la configuración)
- [ ] Expone los 6 beans: `{xxx}ConsumerFactory`, `{xxx}ListenerContainerFactory`, `{xxx}ProducerFactory`, `{xxx}KafkaTemplate`, `notificationKafkaTemplate`, `dlqKafkaTemplate` (BAJO por cada uno ausente sin justificación — ej. sin tópico de notificación, el bean correspondiente no aplica)
- [ ] Topics leídos con `@Value("${kafka.topics.{dominio}.input|output|dlq}")` / `@Value("${kafka.topics.notificacion}")` — **no** `app.kafka.topic.*` (CRITICO si las keys de `@Value` no calzan con las declaradas en el `.properties` del proyecto — el bean falla al arrancar el contexto)
- [ ] `{xxx}KafkaTemplate`/`dlqKafkaTemplate` construidos con `createKafkaTemplate(producerFactory, topic)` (2 args, topic ya fijado) — no requieren pasar el topic en cada `.send(...)` (BAJO)

### C. Listener — ver `../kafka/references/listener.md`

- [ ] `@Component`, `@Slf4j`, `@RequiredArgsConstructor` (BAJO)
- [ ] `@KafkaListener` referencia `containerFactory` explícito del dominio (ALTO — con el factory por defecto no hay DLQ ni `AckMode.MANUAL`)
- [ ] Circuit breaker manual (`AtomicInteger consecutiveFailures`, threshold 10, reset 60s) (MEDIO si falta — una dependencia caída puede generar storm de reintentos sin backpressure adicional)
- [ ] **Clasificación de errores en el `catch` — invertida respecto a "siempre re-throw":**
  - `NonRetryableClientDataException` → `enviarADlqManual()` + `ack.acknowledge()` **sin** re-throw (CRITICO si en cambio hace `throw e` genérico aquí — el mensaje se reintenta 3 veces sin sentido antes de llegar al DLQ)
  - Cualquier otra excepción (infraestructura) → `throw e`, sin ack (CRITICO si la captura sin relanzar — el mensaje nunca llega al DLQ automático de `KafkaConfig`)
- [ ] `validarMensaje()` lanza `NonRetryableClientDataException` (no `IllegalArgumentException`/`IllegalStateException` genéricas) — ver `../excepciones/references/jerarquia.md` (MEDIO)
- [ ] Envío manual a DLQ es síncrono (`.get()`), nunca fire-and-forget (ALTO — sin `.get()` un fallo al enviar al DLQ se pierde en silencio)
- [ ] Tracking de tiempo de procesamiento (`AtomicLong`/`System.currentTimeMillis()`) para calibrar `max.poll.interval.ms` (BAJO)

### D. Publicación (Processor, paso 5/6) — ver `../processor/references/saga.md`

No hay una capa `KafkaProducerService` separada en este estándar — el
`Processor` publica directo. Verificar en el paso 5/6 del saga:

- [ ] Envío síncrono (`.send(topic, key, dto).get()`) en dominios financieros (ALTO — sin `.get()` no se detecta la falla a tiempo para compensar)
- [ ] Clave de partición es el identificador de negocio que garantiza orden (ALTO — una clave incorrecta rompe el orden garantizado entre mensajes de la misma entidad)
- [ ] Fallo en el topic **output** → `auditarError(..., "PENDIENTE", ...)` + re-throw (ALTO — si no re-lanza, `KafkaConfig` nunca reintenta y el fallo queda enterrado en el log)
- [ ] Fallo en el topic **notificación** → auditar `"NOTIFICACION_PENDIENTE"` **sin** re-throw (MEDIO — la notificación es best-effort, no debe revertir un procesamiento principal ya exitoso)

### E. Excepciones — ver `../excepciones/references/jerarquia.md`

- [ ] `NonRetryableClientDataException extends RuntimeException` existe y vive en `dominio/{nombre_dominio}/exceptions/` (MEDIO — sin ella, todo error de negocio se reintenta 3 veces innecesariamente)
- [ ] `XxxClientException` incluye `statusCode` + `responseBody` (BAJO)
- [ ] `XxxPersistenceException` envuelve `DataAccessException`, nunca la deja escapar del repository (MEDIO)

### F. Properties — consistencia entre ambientes

- [ ] **F.1 — group-id:** el groupId real es el **literal hardcodeado** en el segundo argumento de `createConsumerFactory(...)` en el `@Bean` de dominio (config.md), no una property — verificar que ese literal es el **mismo string** en los 4 ambientes (CRITICO si difiere entre deploys — los offsets se resetean). `spring.kafka.consumer.group-id`/`app.kafka.group-id` en el `.properties` son solo documentación (ver F.6) y **no** deben usarse como fuente de verdad para este check.
- [ ] **F.2 — nombres de tópicos:** `kafka.topics.{dominio}.*` consistentes entre ambientes; DLQ sigue el patrón `dlq-{nombre-topico-entrada}` (ALTO)
- [ ] **F.3 — local:** `security.protocol=PLAINTEXT`, sin credenciales en texto plano (CRITICO si hay una credencial literal en el repo)
- [ ] **F.4 — develop/qa/master:** `SASL_SSL` + credenciales por variable de entorno (CRITICO), `enable.metrics.push=false` (ALTO), `max.poll.interval.ms=3600000` (ALTO si es menor — rebalanceos falsos con procesamiento pesado), `max.request.size=10485760` (ALTO si quedó en 1MB por defecto)
- [ ] **F.5 — master:** logger de Kafka en `ERROR`, nunca `DEBUG` (MEDIO — ruido excesivo por el polling)
- [ ] **F.6 — propiedades ignoradas:** si el proyecto tiene `spring.kafka.consumer.*`/`producer.*` de auto-configuración con un valor que el equipo cree que está activo pero el `ConsumerFactory`/`ProducerFactory` son manuales, reportar como MEDIO — ver la advertencia completa en `../kafka/references/properties.md`

### G. Tests — ver `../testing/references/kafka.md`

- [ ] Test del listener cubre: mensaje válido, `NonRetryableClientDataException` (DLQ manual + ack, sin propagar), error de infraestructura (sin ack, propaga), circuit breaker abierto, orden processor-antes-que-ack (ALTO por caso ausente; CRITICO si falta el caso `NonRetryableClientDataException` — es el que prueba que el mensaje no entra en un loop de reintentos inútil)
- [ ] Test del paso de publicación del Processor cubre: éxito, fallo en output (audita + propaga), fallo en notificación (audita, no propaga) (ALTO por caso ausente)
- [ ] Mock del `CompletableFuture` retornado por `.send().get()` en vez de levantar `EmbeddedKafka` (MEDIO — levantar un broker embebido para un test unitario es lento y no es lo que se está probando)

---

## PASO 3 — Informe de hallazgos

```
## Informe de Auditoría Kafka — {nombre-proyecto}

### Veredicto: CUMPLE / CUMPLE PARCIALMENTE / NO CUMPLE
N hallazgos: X CRITICO, Y ALTO, Z MEDIO, W BAJO

### Hallazgos

| # | Severidad | Componente | Descripción | Archivo:Línea |
|---|-----------|------------|-------------|---------------|
| 1 | CRITICO   | Listener   | ...         | Foo.java:52   |

### Componentes sin hallazgos
[lista]
```

---

## PASO 4 — Correcciones

Tras el informe, preguntar si se aplican las correcciones (todas o priorizadas).
Si acepta: `TaskCreate` por cada hallazgo CRITICO/ALTO, corregir en orden
CRITICO → ALTO → MEDIO → BAJO, marcar cada tarea con `TaskUpdate`, y ejecutar
`./gradlew build -x test` (compilación) + `./gradlew test` si había tests en rojo.
