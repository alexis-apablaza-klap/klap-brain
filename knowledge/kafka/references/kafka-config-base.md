# KafkaConfig — clase base (`global/config/KafkaConfig.java`)

Router: `knowledge/kafka/SKILL.md`. Complementa `config.md`, que muestra la
subclase de dominio (`{Xxx}KafkaConfig extends KafkaConfig`) pero no la base.

## Cuándo usar

Al crear la clase base en un microservicio Kafka nuevo, o al auditar si una
existente cumple el contrato que las subclases de dominio asumen (`config.md`,
`listener.md`). Se crea **una sola vez por microservicio** — las subclases de
dominio la extienden, nunca la duplican (`../../klap-standard/references/reglas-dont.md` #1).

## Contrato con las subclases de dominio

- `createConsumerFactory(Class<T> targetType, String groupId)` → `Map<String, Object>` — el dominio arma su `DefaultKafkaConsumerFactory` con este mapa (ver `config.md`), no una `ConsumerFactory` ya construida.
- `createProducerFactory()` → `ProducerFactory<String, T>` con `ACKS=all` ya fijado.
- `createKafkaTemplate(producerFactory, defaultTopic)` → `KafkaTemplate` con el topic de destino ya fijado (el dominio no repite el topic en cada `.send(...)`).
- `createListenerContainerFactoryWithDlq(consumerFactory, dlqTemplate, dlqTopic, maxRetries, backoffMs)` — 5 argumentos explícitos (no hardcodear reintentos/backoff en la base; cada dominio puede necesitar valores distintos).
- `client.id` de consumer y producer incluye el hostname (`applicationName + "-" + hostname`) — diferencia instancias cuando el microservicio corre con N réplicas en ECS Fargate, visible en las métricas de Confluent Cloud.
- Errores deterministas (`NonRetryableClientDataException`, ver `../../excepciones/references/jerarquia.md`) NO se marcan como reintentables en el `DefaultErrorHandler` — refuerza a nivel de contenedor lo que el listener ya maneja en su `catch` (`listener.md`).

## Qué NO trae esta base (a diferencia de un patrón ingenuo)

- **Sin `sharedStringKafkaTemplate` con double-checked locking.** Ese patrón resuelve "evitar abrir una conexión TCP nueva por cada mensaje a DLQ" cuando el template se instancia perezosamente dentro de un método. Aquí no aplica: `dlqKafkaTemplate()` es un `@Bean` de Spring (singleton, construido una vez al arrancar el contexto) — no hay instanciación repetida que evitar.
- **Sin envoltorio JSON propio para el DLQ** (`{"topic":...,"payload":...}`). `DeadLetterPublishingRecoverer` republica el `ConsumerRecord` original (misma key, mismo value) en el topic de DLQ — el consumidor del DLQ puede desserializar el mismo tipo que el topic de origen, sin parsear un formato ad-hoc.

## Código completo

```java
package cl.klap.bysf.global.config;

import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.clients.producer.ProducerConfig;
import org.apache.kafka.common.TopicPartition;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.apache.kafka.common.serialization.StringSerializer;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaProducerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.core.ProducerFactory;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DeadLetterPublishingRecoverer;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.util.backoff.FixedBackOff;

import jakarta.annotation.PostConstruct;
import java.util.HashMap;
import java.util.Map;

import cl.klap.bysf.global.exceptions.NonRetryableClientDataException;

/**
 * Clase base abstracta para configuración de Apache Kafka. Expone factory
 * methods reutilizables (consumer, producer, DLQ) que las subclases de
 * dominio invocan desde sus propios @Bean — nunca se anota @Configuration
 * aquí, los beans concretos van en la subclase (ver config.md).
 */
@Slf4j
@Data
public abstract class KafkaConfig {

    @Value("${spring.kafka.bootstrap-servers}")
    private String bootstrapServers;

    @Value("${spring.kafka.consumer.auto-offset-reset}")
    private String autoOffsetReset;

    @Value("${spring.kafka.properties.security.protocol}")
    private String securityProtocol;

    @Value("${spring.kafka.properties.sasl.mechanism}")
    private String saslMechanism;

    @Value("${spring.kafka.properties.sasl.jaas.config}")
    private String saslJaasConfig;

    @Value("${spring.kafka.consumer.properties.request.timeout.ms}")
    private String requestTimeoutMs;

    @Value("${spring.kafka.properties.client.dns.lookup}")
    private String dnsLookup;

    @Value("${spring.application.name}")
    private String applicationName;

    // Hostname del contenedor -- unico por task ECS, distingue instancias en Confluent Cloud
    @Value("${HOSTNAME:unknown}")
    private String hostname;

    // DEBE leerse del properties -- soporta ordenes con procesamiento pesado (400K+ registros)
    @Value("${spring.kafka.consumer.properties.max.poll.interval.ms:300000}")
    private int maxPollIntervalMs;

    // Con procesamiento pesado usar 1 para mantener max.poll.interval.ms bajo control
    @Value("${spring.kafka.consumer.properties.max.poll.records:1}")
    private int maxPollRecords;

    // 5MB es suficiente con max.poll.records=1; 32MB (default) agrava presion sobre heap
    @Value("${spring.kafka.producer.properties.buffer.memory:5242880}")
    private long producerBufferMemory;

    @Value("${spring.kafka.producer.compression-type:none}")
    private String compressionType;

    @Value("${spring.kafka.producer.retries:3}")
    private int producerRetries;

    // Modo FULL con listas grandes puede superar el default de 1MB
    @Value("${spring.kafka.producer.properties.max.request.size:1048576}")
    private int producerMaxRequestSize;

    private static final String ENABLE_METRICS_PUSH = "enable.metrics.push";
    private static final int PRODUCER_RETRY_BACKOFF_MS = 100;

    @Autowired
    private Environment environment;

    @PostConstruct
    public void validateConfiguration() {
        if (bootstrapServers == null || bootstrapServers.isBlank()) {
            throw new IllegalStateException("spring.kafka.bootstrap-servers no puede estar vacío");
        }
        log.info("Configuración Kafka validada — bootstrap: {}", bootstrapServers);
    }

    /**
     * Solo aplica SASL si el perfil activo NO es "local".
     * Permite Kafka sin autenticación en local y SASL_SSL en develop/qa/master.
     */
    protected void addSecurityPropsIfNeeded(Map<String, Object> props) {
        String[] profiles = environment.getActiveProfiles();
        if (profiles.length > 0 && !"local".equals(profiles[0])) {
            props.put("security.protocol", securityProtocol);
            props.put("sasl.mechanism", saslMechanism);
            props.put("sasl.jaas.config", saslJaasConfig);
        }
    }

    /**
     * Propiedades de consumer listas para {@code DefaultKafkaConsumerFactory}.
     * client.id incluye el hostname para distinguir instancias ECS en Confluent.
     * ErrorHandlingDeserializer + JsonDeserializer configurados vía Map (no
     * instanciados a mano) para que el dominio solo pase el DTO objetivo.
     */
    protected <T> Map<String, Object> createConsumerFactory(Class<T> targetType, String groupId) {
        Map<String, Object> props = new HashMap<>();
        props.put(ConsumerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ConsumerConfig.GROUP_ID_CONFIG, groupId);
        props.put(ConsumerConfig.AUTO_OFFSET_RESET_CONFIG, autoOffsetReset);
        props.put(ConsumerConfig.ENABLE_AUTO_COMMIT_CONFIG, false);
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, StringDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class.getName());
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, targetType.getName());
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "*");
        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);
        props.put(ConsumerConfig.REQUEST_TIMEOUT_MS_CONFIG, requestTimeoutMs);
        props.put(ConsumerConfig.DEFAULT_API_TIMEOUT_MS_CONFIG, requestTimeoutMs);
        props.put(ConsumerConfig.CLIENT_DNS_LOOKUP_CONFIG, dnsLookup);
        props.put(ConsumerConfig.CLIENT_ID_CONFIG, applicationName + "-" + hostname);
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, maxPollRecords);
        props.put(ConsumerConfig.MAX_POLL_INTERVAL_MS_CONFIG, maxPollIntervalMs);
        props.put(ConsumerConfig.FETCH_MIN_BYTES_CONFIG, 1);
        props.put(ConsumerConfig.FETCH_MAX_WAIT_MS_CONFIG, 500);
        props.put(ConsumerConfig.CONNECTIONS_MAX_IDLE_MS_CONFIG, 540_000L);
        props.put(ENABLE_METRICS_PUSH, false);
        addSecurityPropsIfNeeded(props);
        log.info("Consumer configurado: groupId={}, client.id={}, max.poll.records={}",
                groupId, applicationName + "-" + hostname, maxPollRecords);
        return props;
    }

    protected Map<String, Object> getProducerProperties() {
        Map<String, Object> props = new HashMap<>();
        props.put(ProducerConfig.BOOTSTRAP_SERVERS_CONFIG, bootstrapServers);
        props.put(ProducerConfig.KEY_SERIALIZER_CLASS_CONFIG, StringSerializer.class);
        props.put(ProducerConfig.VALUE_SERIALIZER_CLASS_CONFIG, org.springframework.kafka.support.serializer.JsonSerializer.class);
        props.put(ProducerConfig.CLIENT_ID_CONFIG, applicationName + "-" + hostname);
        props.put(ProducerConfig.REQUEST_TIMEOUT_MS_CONFIG, requestTimeoutMs);
        props.put(ProducerConfig.COMPRESSION_TYPE_CONFIG, compressionType);
        props.put(ProducerConfig.ACKS_CONFIG, "all");
        props.put(ProducerConfig.RETRIES_CONFIG, producerRetries);
        props.put(ProducerConfig.RETRY_BACKOFF_MS_CONFIG, PRODUCER_RETRY_BACKOFF_MS);
        props.put(ProducerConfig.ENABLE_IDEMPOTENCE_CONFIG, true);
        props.put(ProducerConfig.BATCH_SIZE_CONFIG, 16384);
        // linger.ms=0: envio sincrono con .get() -- batching nunca ocurre con max.poll.records=1
        props.put(ProducerConfig.LINGER_MS_CONFIG, 0);
        props.put(ProducerConfig.BUFFER_MEMORY_CONFIG, producerBufferMemory);
        props.put(ProducerConfig.MAX_IN_FLIGHT_REQUESTS_PER_CONNECTION, 5);
        props.put(ProducerConfig.CONNECTIONS_MAX_IDLE_MS_CONFIG, 540_000L);
        // max.request.size leido de @Value -- ignorado si se leyera solo del
        // properties con factory manual (ver advertencia en properties.md)
        props.put(ProducerConfig.MAX_REQUEST_SIZE_CONFIG, producerMaxRequestSize);
        props.put(ENABLE_METRICS_PUSH, false);
        addSecurityPropsIfNeeded(props);
        return props;
    }

    protected <T> ProducerFactory<String, T> createProducerFactory() {
        return new DefaultKafkaProducerFactory<>(getProducerProperties());
    }

    protected <T> KafkaTemplate<String, T> createKafkaTemplate(ProducerFactory<String, T> producerFactory, String defaultTopic) {
        KafkaTemplate<String, T> template = new KafkaTemplate<>(producerFactory);
        template.setDefaultTopic(defaultTopic);
        return template;
    }

    /**
     * ListenerContainerFactory con DLQ automático tras agotar los reintentos.
     * DeadLetterPublishingRecoverer republica el record ORIGINAL (key+value)
     * en dlqTemplate/dlqTopic — el consumidor del DLQ deserializa el mismo
     * tipo que el topic de origen, sin envoltorio JSON ad-hoc.
     *
     * Los errores deterministas (NonRetryableClientDataException) no deberían
     * llegar aquí — el listener los captura y los envía a DLQ manualmente
     * (ver listener.md). Se marcan como no-reintentables igual, como defensa
     * en profundidad si alguno se escapa del try/catch del listener.
     */
    protected <T> ConcurrentKafkaListenerContainerFactory<String, T> createListenerContainerFactoryWithDlq(
            ConsumerFactory<String, T> consumerFactory,
            KafkaTemplate<String, Object> dlqTemplate,
            String dlqTopic,
            int maxRetries,
            long backoffMs) {
        ConcurrentKafkaListenerContainerFactory<String, T> factory = new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(consumerFactory);
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);

        DeadLetterPublishingRecoverer recoverer = new DeadLetterPublishingRecoverer(dlqTemplate,
                (record, ex) -> new TopicPartition(dlqTopic, record.partition()));
        DefaultErrorHandler errorHandler = new DefaultErrorHandler(recoverer, new FixedBackOff(backoffMs, maxRetries));
        errorHandler.addNotRetryableExceptions(NonRetryableClientDataException.class);
        factory.setCommonErrorHandler(errorHandler);

        log.info("ListenerContainerFactory configurado: {} reintentos, backoff {}ms, DLQ: {}",
                maxRetries, backoffMs, dlqTopic);
        return factory;
    }
}
```

## Anti-patrones específicos de esta clase base

- Anotarla con `@Configuration` — los `@Bean` van en la subclase de dominio, nunca aquí (si se anota aquí, cada dominio que la extienda duplicaría los beans).
- Instanciar `DefaultKafkaConsumerFactory`/`DefaultKafkaProducerFactory` fuera de esta clase — rompe la razón de ser de la base (ver `../../klap-standard/references/reglas-dont.md` #2).
- Omitir `client.id` con hostname — sin él, las métricas de Confluent Cloud no distinguen entre réplicas ECS del mismo microservicio.
- Hardcodear `maxRetries`/`backoffMs` dentro de la clase base en vez de recibirlos como parámetro — cada dominio puede necesitar tolerancias distintas.
