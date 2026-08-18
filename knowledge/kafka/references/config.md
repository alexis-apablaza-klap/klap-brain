# Kafka Config — template `XxxKafkaConfig`

Router: `knowledge/kafka/SKILL.md`.

## Cuándo usar

Al crear la configuración Kafka de un dominio nuevo, o modificar una existente. Cada dominio tiene su propia clase `{Xxx}KafkaConfig` que extiende la clase base abstracta `KafkaConfig` (`global/config/KafkaConfig.java`), donde viven los factory methods compartidos — código completo de la base en [kafka-config-base.md](kafka-config-base.md).

## Reglas específicas de este template

- Extender siempre `KafkaConfig` y reusar sus factory methods: `createConsumerFactory()`, `createProducerFactory()`, `createListenerContainerFactoryWithDlq()`, `createKafkaTemplate()`. Nunca instanciar `DefaultKafkaConsumerFactory` u otro factory a mano fuera de la clase base.
- Exponer los 6 beans del dominio: `{xxx}ConsumerFactory`, `{xxx}ListenerContainerFactory`, `{xxx}ProducerFactory`, `{xxx}KafkaTemplate`, `notificationKafkaTemplate`, `dlqKafkaTemplate`.
- `ACKS=all` en producers — dominios financieros no toleran `acks=1` ni `acks=0`.
- DLQ con 3 reintentos y backoff de 5s antes de derivar el mensaje: `createListenerContainerFactoryWithDlq(consumerFactory, dlqTemplate, dlqTopic, 3, 5000L)`.
- Perfil `local` usa `PLAINTEXT`; todos los demás perfiles usan `SASL_SSL` (credenciales por variable de entorno — detalle en `properties.md`).
- `client.id` de consumer y producer incluye el hostname del contenedor (`applicationName + "-" + hostname`, ver `kafka-config-base.md`) — distingue instancias del mismo microservicio corriendo en paralelo en ECS Fargate dentro de las métricas de Confluent Cloud.
- `AckMode.MANUAL`, `enable.metrics.push=false`, `max.poll.records=1` y `ErrorHandlingDeserializer` sobre `JsonDeserializer` son reglas globales — ver `../../klap-standard/references/reglas-do.md` (#9, #10, #11, #12).

## Skeleton de código

```java
package cl.klap.sva.dominio.{nombre_dominio}.config;

import cl.klap.sva.global.config.KafkaConfig;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.*;
import org.springframework.kafka.listener.ContainerProperties;

import java.util.Map;

/**
 * Configuración Kafka para el dominio {NombreDominio}.
 * Extiende KafkaConfig para reutilizar los factory methods de la clase base
 * y expone los beans necesarios para consumers, producers y DLQ.
 */
@Slf4j
@Configuration
public class {Xxx}KafkaConfig extends KafkaConfig {

    // ── Topics ────────────────────────────────────────────────────────────
    @Value("${kafka.topics.{dominio}.input}")
    private String inputTopic;

    @Value("${kafka.topics.{dominio}.output}")
    private String outputTopic;

    @Value("${kafka.topics.{dominio}.dlq}")
    private String dlqTopic;

    @Value("${kafka.topics.notificacion}")
    private String notificacionTopic;

    // ── Bootstrap / Security (heredados vía @Value en KafkaConfig) ───────
    // KafkaConfig ya inyecta bootstrapServers, saslMechanism, securityProtocol, etc.

    // ── Consumer ──────────────────────────────────────────────────────────

    /**
     * ConsumerFactory tipada para el DTO de entrada del dominio {NombreDominio}.
     * Usa ErrorHandlingDeserializer como wrapper para que mensajes malformados
     * sean enviados automáticamente a DLQ sin detener el consumer.
     *
     * @return ConsumerFactory configurada con deserializadores seguros
     */
    @Bean
    public ConsumerFactory<String, {Xxx}InputDto> {xxx}ConsumerFactory() {
        Map<String, Object> props = createConsumerFactory(
            {Xxx}InputDto.class,        // tipo del mensaje esperado
            "{grupo-consumidor-{dominio}}" // consumer group id
        );
        // CRÍTICO: evita OOM en MSK/Confluent al deshabilitar métricas push
        props.put("enable.metrics.push", false);
        // Backpressure: procesar de a 1 mensaje para evitar rebalance timeouts
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 1);
        return new DefaultKafkaConsumerFactory<>(props);
    }

    /**
     * ListenerContainerFactory con DLQ configurado.
     * AckMode.MANUAL garantiza at-least-once: el listener hace ack
     * explícitamente solo cuando el procesamiento fue exitoso.
     * 3 reintentos con backoff de 5s antes de enviar a DLQ.
     *
     * @return ConcurrentKafkaListenerContainerFactory con manejo de errores y DLQ
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, {Xxx}InputDto> {xxx}ListenerContainerFactory() {
        var factory = createListenerContainerFactoryWithDlq(
            {xxx}ConsumerFactory(),
            dlqKafkaTemplate(),     // destino de mensajes que fallaron 3 veces
            dlqTopic,
            3,                      // maxRetries
            5000L                   // backoffMs
        );
        // AckMode.MANUAL: el listener llama ack.acknowledge() explícitamente
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
        return factory;
    }

    // ── Producer ──────────────────────────────────────────────────────────

    /**
     * ProducerFactory para el topic de output del dominio {NombreDominio}.
     * ACKS=all garantiza idempotencia: el broker confirma que todos los
     * replicas recibieron el mensaje antes de responder al producer.
     *
     * @return ProducerFactory con configuración idempotente
     */
    @Bean
    public ProducerFactory<String, Object> {xxx}ProducerFactory() {
        return createProducerFactory(); // KafkaConfig configura ACKS=all por defecto
    }

    /**
     * KafkaTemplate para publicar en el topic de output del dominio.
     * Se debe usar con .get() en dominios financieros (envío sincrónico)
     * para detectar fallas de forma inmediata y compensar.
     *
     * @return KafkaTemplate apuntando al output topic del dominio
     */
    @Bean
    public KafkaTemplate<String, Object> {xxx}KafkaTemplate() {
        return createKafkaTemplate({xxx}ProducerFactory(), outputTopic);
    }

    /**
     * KafkaTemplate para publicar en el topic de notificación compartido
     * bysf-liqsvbo-notificacion. Usado por todos los dominios.
     *
     * @return KafkaTemplate apuntando al topic de notificaciones
     */
    @Bean
    public KafkaTemplate<String, Object> notificationKafkaTemplate() {
        return createKafkaTemplate({xxx}ProducerFactory(), notificacionTopic);
    }

    /**
     * KafkaTemplate dedicado para publicar mensajes en el DLQ del dominio.
     * Lo usa el ErrorHandler de KafkaConfig y también el listener cuando
     * detecta errores deterministas (datos inválidos).
     *
     * @return KafkaTemplate apuntando al DLQ topic del dominio
     */
    @Bean
    public KafkaTemplate<String, Object> dlqKafkaTemplate() {
        return createKafkaTemplate({xxx}ProducerFactory(), dlqTopic);
    }
}
```

## Ejemplo completo — dominio Liquidación

```java
package cl.klap.sva.dominio.liquidacion.config;

import cl.klap.sva.dominio.liquidacion.model.LiquidacionInputDto;
import cl.klap.sva.global.config.KafkaConfig;
import lombok.extern.slf4j.Slf4j;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.*;
import org.springframework.kafka.listener.ContainerProperties;

import java.util.Map;

/**
 * Configuración Kafka para el dominio Liquidación.
 * Gestiona consumers y producers del flujo de liquidación SVBO,
 * incluyendo el DLQ para mensajes que no pudieron procesarse tras 3 reintentos.
 */
@Slf4j
@Configuration
public class LiquidacionKafkaConfig extends KafkaConfig {

    @Value("${kafka.topics.liquidacion.input}")
    private String inputTopic;

    @Value("${kafka.topics.liquidacion.output}")
    private String outputTopic;

    @Value("${kafka.topics.liquidacion.dlq}")
    private String dlqTopic;

    @Value("${kafka.topics.notificacion}")
    private String notificacionTopic;

    /**
     * ConsumerFactory para mensajes de tipo LiquidacionInputDto.
     * ErrorHandlingDeserializer asegura que JSON malformado vaya a DLQ
     * sin bloquear la partición.
     *
     * @return ConsumerFactory con deserialización segura y backpressure configurado
     */
    @Bean
    public ConsumerFactory<String, LiquidacionInputDto> liquidacionConsumerFactory() {
        Map<String, Object> props = createConsumerFactory(
            LiquidacionInputDto.class,
            "grupo-liquidacion-svbo"
        );
        props.put("enable.metrics.push", false); // CRÍTICO: evita OOM
        props.put(ConsumerConfig.MAX_POLL_RECORDS_CONFIG, 1); // backpressure
        return new DefaultKafkaConsumerFactory<>(props);
    }

    /**
     * ListenerContainerFactory con DLQ y 3 reintentos con backoff de 5s.
     * AckMode.MANUAL obliga al listener a confirmar explícitamente cada mensaje.
     *
     * @return factory configurada con manejo de errores y DLQ automático
     */
    @Bean
    public ConcurrentKafkaListenerContainerFactory<String, LiquidacionInputDto> liquidacionListenerContainerFactory() {
        var factory = createListenerContainerFactoryWithDlq(
            liquidacionConsumerFactory(),
            dlqKafkaTemplate(),
            dlqTopic,
            3,
            5000L
        );
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL);
        return factory;
    }

    /**
     * ProducerFactory para el dominio Liquidación con ACKS=all (idempotente).
     *
     * @return ProducerFactory configurada por KafkaConfig base
     */
    @Bean
    public ProducerFactory<String, Object> liquidacionProducerFactory() {
        return createProducerFactory();
    }

    /**
     * KafkaTemplate para publicar resultados de liquidación en el output topic.
     * Usar con .get() para garantizar entrega sincrónica en flujos financieros.
     *
     * @return KafkaTemplate para el topic de salida de liquidación
     */
    @Bean
    public KafkaTemplate<String, Object> liquidacionKafkaTemplate() {
        return createKafkaTemplate(liquidacionProducerFactory(), outputTopic);
    }

    /**
     * KafkaTemplate para el topic compartido de notificaciones BYSF.
     *
     * @return KafkaTemplate para bysf-liqsvbo-notificacion
     */
    @Bean
    public KafkaTemplate<String, Object> notificationKafkaTemplate() {
        return createKafkaTemplate(liquidacionProducerFactory(), notificacionTopic);
    }

    /**
     * KafkaTemplate dedicado al DLQ de liquidación.
     * Usado tanto por el ErrorHandler automático como por el listener
     * cuando detecta errores deterministas (datos inválidos del mensaje).
     *
     * @return KafkaTemplate para el DLQ del dominio Liquidación
     */
    @Bean
    public KafkaTemplate<String, Object> dlqKafkaTemplate() {
        return createKafkaTemplate(liquidacionProducerFactory(), dlqTopic);
    }
}
```

## Anti-patrones específicos de Kafka Config

- `AckMode.BATCH` o `AckMode.AUTO` en el listener container factory — rompe el control explícito de ack del dominio.
- Copiar el bloque `SASL_SSL` de otro dominio en vez de heredarlo de `KafkaConfig`.
- Envío asincrónico (`.send()` sin `.get()`) en flujos financieros — no se detecta la falla a tiempo para compensar.
- Duplicar configuración entre dominios o crear un `ErrorHandler` propio sin extender la base: reglas globales, ver `../../klap-standard/references/reglas-dont.md` (#1, #2).
