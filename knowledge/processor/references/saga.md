# Referencia: skeleton del patron Saga

Skeleton completo de la interface y la implementacion del Processor, seguido
de un ejemplo real (`LiquidacionProcessor`) con los 6 pasos aplicados a un
dominio concreto. El manejo de fallos de cada paso (`auditarError`, estados
`PENDIENTE`/`ERROR`/`NOTIFICACION_PENDIENTE`) esta detallado en
[compensacion.md](compensacion.md) — aqui se muestra tal como aparece en el
flujo, sin repetir la explicacion de por que existe.

## Interface: `{Xxx}Processor.java`

```java
package cl.klap.bysf.dominio.{nombre_dominio}.services;

import cl.klap.bysf.dominio.{nombre_dominio}.exceptions.NonRetryableClientDataException;

/**
 * Contrato del processor de {NombreDominio}.
 * Orquesta el flujo completo de procesamiento de un mensaje Kafka
 * siguiendo el patrón Saga de 6 pasos: validar → consultar → procesar
 * → persistir → publicar output → publicar notificación.
 */
public interface {Xxx}Processor {

    /**
     * Ejecuta el flujo Saga completo para el mensaje de {NombreDominio}.
     * Si falla cualquier paso después de la validación, el estado se audita
     * como PENDIENTE o ERROR para retry manual — no hay rollback automático.
     *
     * @param mensaje        DTO con los datos del mensaje recibido del topic Kafka
     * @param idProceso      identificador de correlación del proceso
     * @param codigoSucursal código de la sucursal que originó la transacción
     * @throws NonRetryableClientDataException si el payload es inválido o una
     *         regla de negocio determinista impide el procesamiento (ver
     *         `../../excepciones/references/jerarquia.md`)
     */
    void procesar{Xxx}({Xxx}InputDto mensaje, String idProceso, String codigoSucursal);
}
```

## Implementacion: `{Xxx}ProcessorImpl.java`

```java
package cl.klap.bysf.dominio.{nombre_dominio}.services.impl;

import cl.klap.bysf.dominio.{nombre_dominio}.exceptions.NonRetryableClientDataException;
import cl.klap.bysf.dominio.{nombre_dominio}.model.{Xxx}InputDto;
import cl.klap.bysf.dominio.{nombre_dominio}.model.{Xxx}OutputDto;
import cl.klap.bysf.dominio.{nombre_dominio}.model.NotificacionDto;
import cl.klap.bysf.dominio.{nombre_dominio}.repository.{Xxx}Repository;
import cl.klap.bysf.dominio.{nombre_dominio}.repository.Auditoria{Xxx}Repository;
import cl.klap.bysf.dominio.{nombre_dominio}.services.{Xxx}Processor;
import cl.klap.bysf.dominio.{nombre_dominio}.services.client.{Xxx}Client;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

/**
 * Implementación del processor de {NombreDominio}.
 * Orquesta el flujo Saga completo: validación de payload, consulta a API externa,
 * lógica de negocio, persistencia en DB, publicación en topic output
 * y publicación de notificación a bysf-liqsvbo-notificacion.
 *
 * <p>Política de compensación: si falla cualquier paso 2-6, se audita
 * el estado como PENDIENTE/ERROR para retry manual. No se hace rollback automático.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class {Xxx}ProcessorImpl implements {Xxx}Processor {

    // ── Dependencias ──────────────────────────────────────────────────────
    private final {Xxx}Client          {xxx}Client;           // paso 2: API externa
    private final {Xxx}Repository      {xxx}Repository;       // paso 4: persistencia
    private final Auditoria{Xxx}Repository auditoriaRepository; // compensación
    private final KafkaTemplate<String, Object> {xxx}KafkaTemplate;     // paso 5
    private final KafkaTemplate<String, Object> notificationKafkaTemplate; // paso 6

    @Value("${kafka.topics.{dominio}.output}")
    private String outputTopic;

    @Value("${kafka.topics.notificacion}")
    private String notificacionTopic;

    /**
     * Ejecuta el flujo Saga completo de {NombreDominio} en 6 pasos ordenados.
     * Cada paso puede lanzar excepción; en ese caso se audita y se re-lanza
     * para que el Listener decida entre DLQ manual o reintento automático.
     *
     * @param mensaje        DTO con los datos del mensaje recibido
     * @param idProceso      identificador de correlación del proceso
     * @param codigoSucursal código de la sucursal que originó la transacción
     * @throws NonRetryableClientDataException si el payload es inválido (error determinista)
     */
    @Override
    public void procesar{Xxx}({Xxx}InputDto mensaje, String idProceso, String codigoSucursal) {
        log.info("🔄 Iniciando saga {NombreDominio} | idProceso={} | codigoSucursal={}", idProceso, codigoSucursal);

        // ── Paso 1: Validar payload del mensaje ───────────────────────────
        // Errores aquí = NonRetryableClientDataException = error determinista
        // El Listener los enviará a DLQ manual sin reintentar
        validarPayload(mensaje, idProceso);

        // ── Paso 2: Consultar API externa ─────────────────────────────────
        // Si falla → auditar PENDIENTE + re-throw (error de infraestructura)
        {Xxx}ExternalDto datosExternos;
        try {
            datosExternos = consultar{Xxx}(mensaje, idProceso);
        } catch (Exception e) {
            auditarError(mensaje, idProceso, codigoSucursal, "PENDIENTE", "Error API externa: " + e.getMessage());
            throw e; // re-throw para reintentos automáticos de KafkaConfig
        }

        // ── Paso 3: Procesar lógica de negocio ────────────────────────────
        {Xxx}OutputDto resultado;
        try {
            resultado = procesar{Xxx}Interno(mensaje, datosExternos, idProceso);
        } catch (Exception e) {
            auditarError(mensaje, idProceso, codigoSucursal, "ERROR", "Error lógica negocio: " + e.getMessage());
            throw e;
        }

        // ── Paso 4: Persistir en DB ───────────────────────────────────────
        try {
            registrar{Xxx}(resultado, idProceso);
        } catch (Exception e) {
            auditarError(mensaje, idProceso, codigoSucursal, "PENDIENTE", "Error persistencia: " + e.getMessage());
            throw e;
        }

        // ── Paso 5: Publicar en Kafka output topic ────────────────────────
        // .get() = envío SINCRÓNICO — obligatorio en dominios financieros
        try {
            log.info("📤 Publicando en output topic | idProceso={}", idProceso);
            {xxx}KafkaTemplate.send(outputTopic, idProceso, resultado).get();
        } catch (Exception e) {
            auditarError(mensaje, idProceso, codigoSucursal, "PENDIENTE", "Error publicación Kafka output: " + e.getMessage());
            throw new RuntimeException("Error publicando en output topic", e);
        }

        // ── Paso 6: Publicar notificación ─────────────────────────────────
        // .get() = envío SINCRÓNICO — aunque sea notificación, debe confirmarse
        try {
            NotificacionDto notificacion = construirNotificacion(resultado, idProceso, codigoSucursal);
            log.info("📤 Publicando notificación | idProceso={}", idProceso);
            notificationKafkaTemplate.send(notificacionTopic, idProceso, notificacion).get();
        } catch (Exception e) {
            // La notificación falló pero el proceso principal fue exitoso
            // Auditamos para retry manual del paso de notificación
            auditarError(mensaje, idProceso, codigoSucursal, "NOTIFICACION_PENDIENTE", "Error notificación: " + e.getMessage());
            log.warn("⚠️ Notificación fallida, proceso principal OK | idProceso={}", idProceso);
            // No re-throw: el proceso principal fue exitoso, solo la notificación falló
        }

        log.info("✅ Saga {NombreDominio} completada | idProceso={} | codigoSucursal={}", idProceso, codigoSucursal);
    }

    // ── Métodos privados del Saga ─────────────────────────────────────────

    /**
     * Valida que el payload del mensaje tenga todos los campos requeridos
     * por la lógica de negocio del dominio. Errores aquí son deterministas.
     *
     * @param mensaje   DTO a validar
     * @param idProceso identificador de correlación para logging
     * @throws NonRetryableClientDataException si el payload es inválido o incompleto
     */
    private void validarPayload({Xxx}InputDto mensaje, String idProceso) {
        // Agregar validaciones específicas del dominio
        // Ejemplo:
        // if (mensaje.getMonto() == null || mensaje.getMonto().compareTo(BigDecimal.ZERO) <= 0) {
        //     throw new NonRetryableClientDataException("Monto inválido | idProceso=" + idProceso);
        // }
        log.debug("✅ Payload validado | idProceso={}", idProceso);
    }

    /**
     * Consulta la API externa necesaria para completar el procesamiento.
     * Delega al {Xxx}Client ubicado en services/client/.
     *
     * @param mensaje   DTO con los datos de entrada para la consulta
     * @param idProceso identificador de correlación
     * @return datos obtenidos de la API externa
     * @throws RuntimeException si la API externa no responde o retorna error
     */
    private {Xxx}ExternalDto consultar{Xxx}({Xxx}InputDto mensaje, String idProceso) {
        log.info("🔍 Consultando API externa | idProceso={}", idProceso);
        return {xxx}Client.consultar(mensaje.getId());
    }

    /**
     * Ejecuta la lógica de negocio central del dominio.
     * Transforma los datos de entrada y externos en el resultado de salida.
     *
     * @param mensaje       DTO de entrada
     * @param datosExternos datos obtenidos de la API externa en el paso 2
     * @param idProceso     identificador de correlación
     * @return DTO de resultado listo para persistir y publicar
     */
    private {Xxx}OutputDto procesar{Xxx}Interno({Xxx}InputDto mensaje, {Xxx}ExternalDto datosExternos, String idProceso) {
        log.info("⚙️ Procesando lógica negocio | idProceso={}", idProceso);
        // Implementar lógica de negocio específica del dominio
        return {Xxx}OutputDto.builder()
            .idProceso(idProceso)
            // ... mapear campos
            .build();
    }

    /**
     * Persiste el resultado del procesamiento en la base de datos del dominio.
     * Usa JdbcTemplate a través de {Xxx}Repository — nunca JPA.
     *
     * @param resultado DTO con los datos procesados a persistir
     * @param idProceso identificador de correlación
     */
    private void registrar{Xxx}({Xxx}OutputDto resultado, String idProceso) {
        log.info("💾 Persistiendo resultado | idProceso={}", idProceso);
        {xxx}Repository.guardar(resultado);
    }

    /**
     * Construye el DTO de notificación para el topic bysf-liqsvbo-notificacion.
     *
     * @param resultado      resultado del procesamiento
     * @param idProceso      identificador de correlación
     * @param codigoSucursal código de la sucursal
     * @return DTO de notificación listo para publicar
     */
    private NotificacionDto construirNotificacion({Xxx}OutputDto resultado, String idProceso, String codigoSucursal) {
        return NotificacionDto.builder()
            .idProceso(idProceso)
            .codigoSucursal(codigoSucursal)
            .estado("PROCESADO")
            // ... mapear campos relevantes para la notificación
            .build();
    }

    /**
     * Audita un error o estado pendiente en la tabla de auditoría del dominio.
     * Es el mecanismo de compensación del Saga — no hay rollback automático,
     * solo registro para retry manual posterior.
     *
     * @param mensaje        mensaje original que falló
     * @param idProceso      identificador de correlación
     * @param codigoSucursal código de la sucursal
     * @param estado         estado a registrar: PENDIENTE, ERROR, NOTIFICACION_PENDIENTE
     * @param detalle        descripción del error o razón del estado
     */
    private void auditarError({Xxx}InputDto mensaje, String idProceso, String codigoSucursal, String estado, String detalle) {
        try {
            log.warn("📋 Auditando estado {} | idProceso={} | detalle={}", estado, idProceso, detalle);
            auditoriaRepository.registrarEstado(idProceso, codigoSucursal, estado, detalle);
        } catch (Exception audEx) {
            // La auditoría falló — loggear para investigación manual
            log.error("❌ CRÍTICO: Fallo en auditoría | idProceso={} | estado={} | auditoriaError={}",
                idProceso, estado, audEx.getMessage());
        }
    }
}
```

## Ejemplo completo: `LiquidacionProcessor`

```java
// Interface: LiquidacionProcessor.java
package cl.klap.bysf.dominio.liquidacion.services;

import cl.klap.bysf.dominio.liquidacion.exceptions.NonRetryableClientDataException;
import cl.klap.bysf.dominio.liquidacion.model.LiquidacionInputDto;

/**
 * Contrato del processor de Liquidación SVBO.
 * Orquesta el flujo Saga para procesar solicitudes de liquidación:
 * consulta SVBO, calcula montos, persiste, publica resultado y notifica.
 */
public interface LiquidacionProcessor {

    /**
     * Ejecuta el flujo Saga completo de liquidación SVBO en 6 pasos.
     * La compensación ante fallos es auditoría de estado PENDIENTE/ERROR
     * para retry manual — no hay rollback automático.
     *
     * @param mensaje        DTO con los datos de la solicitud de liquidación
     * @param idProceso      identificador de correlación del proceso
     * @param codigoSucursal código de la sucursal que originó la solicitud
     * @throws NonRetryableClientDataException si el payload es inválido (error determinista)
     */
    void procesarLiquidacion(LiquidacionInputDto mensaje, String idProceso, String codigoSucursal);
}
```

```java
// Implementación: LiquidacionProcessorImpl.java
package cl.klap.bysf.dominio.liquidacion.services.impl;

import cl.klap.bysf.dominio.liquidacion.exceptions.NonRetryableClientDataException;
import cl.klap.bysf.dominio.liquidacion.model.*;
import cl.klap.bysf.dominio.liquidacion.repository.LiquidacionRepository;
import cl.klap.bysf.dominio.liquidacion.repository.AuditoriaLiquidacionRepository;
import cl.klap.bysf.dominio.liquidacion.services.LiquidacionProcessor;
import cl.klap.bysf.dominio.liquidacion.services.client.SvboClient;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

/**
 * Implementación del Saga de Liquidación SVBO.
 * Pasos: validar → consultar SVBO → calcular liquidación → persistir
 * → publicar resultado → publicar notificación.
 *
 * <p>Compensación: cualquier falla en pasos 2-6 se audita como PENDIENTE/ERROR.
 * No hay rollback automático — el retry es manual vía tabla de auditoría.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class LiquidacionProcessorImpl implements LiquidacionProcessor {

    private final SvboClient                    svboClient;
    private final LiquidacionRepository         liquidacionRepository;
    private final AuditoriaLiquidacionRepository auditoriaRepository;
    private final KafkaTemplate<String, Object> liquidacionKafkaTemplate;
    private final KafkaTemplate<String, Object> notificationKafkaTemplate;

    @Value("${kafka.topics.liquidacion.output}")
    private String outputTopic;

    @Value("${kafka.topics.notificacion}")
    private String notificacionTopic;

    /**
     * Ejecuta el flujo Saga de liquidación SVBO completo.
     * Valida el payload, consulta SVBO, calcula montos, persiste en DB,
     * publica resultado en Kafka y envía notificación de estado.
     *
     * @param mensaje        DTO con los datos de la solicitud de liquidación
     * @param idProceso      identificador de correlación del proceso
     * @param codigoSucursal código de la sucursal
     * @throws NonRetryableClientDataException si el monto o idTransaccion son inválidos
     */
    @Override
    public void procesarLiquidacion(LiquidacionInputDto mensaje, String idProceso, String codigoSucursal) {
        log.info("🔄 Iniciando saga Liquidación | idProceso={} | codigoSucursal={}", idProceso, codigoSucursal);

        // Paso 1: Validar payload
        validarPayload(mensaje, idProceso);

        // Paso 2: Consultar SVBO
        SvboResponseDto svboData;
        try {
            svboData = consultarSvbo(mensaje, idProceso);
        } catch (Exception e) {
            auditarError(mensaje, idProceso, codigoSucursal, "PENDIENTE", "Error SVBO: " + e.getMessage());
            throw e;
        }

        // Paso 3: Calcular liquidación
        LiquidacionOutputDto resultado;
        try {
            resultado = calcularLiquidacion(mensaje, svboData, idProceso);
        } catch (Exception e) {
            auditarError(mensaje, idProceso, codigoSucursal, "ERROR", "Error cálculo: " + e.getMessage());
            throw e;
        }

        // Paso 4: Persistir
        try {
            registrarLiquidacion(resultado, idProceso);
        } catch (Exception e) {
            auditarError(mensaje, idProceso, codigoSucursal, "PENDIENTE", "Error DB: " + e.getMessage());
            throw e;
        }

        // Paso 5: Publicar output (SINCRÓNICO — dominio financiero)
        try {
            log.info("📤 Publicando resultado liquidación | idProceso={}", idProceso);
            liquidacionKafkaTemplate.send(outputTopic, idProceso, resultado).get();
        } catch (Exception e) {
            auditarError(mensaje, idProceso, codigoSucursal, "PENDIENTE", "Error Kafka output: " + e.getMessage());
            throw new RuntimeException("Error publicando liquidación en output topic", e);
        }

        // Paso 6: Notificación (SINCRÓNICO)
        try {
            NotificacionDto notif = NotificacionDto.builder()
                .idProceso(idProceso)
                .codigoSucursal(codigoSucursal)
                .estado("LIQUIDADO")
                .monto(resultado.getMontoLiquidado())
                .build();
            notificationKafkaTemplate.send(notificacionTopic, idProceso, notif).get();
        } catch (Exception e) {
            auditarError(mensaje, idProceso, codigoSucursal, "NOTIFICACION_PENDIENTE", "Error notif: " + e.getMessage());
            log.warn("⚠️ Notificación fallida, liquidación OK | idProceso={}", idProceso);
            // No re-throw: liquidación exitosa, solo notificación pendiente
        }

        log.info("✅ Saga Liquidación completada | idProceso={} | codigoSucursal={}", idProceso, codigoSucursal);
    }

    private void validarPayload(LiquidacionInputDto m, String idProceso) {
        if (m.getIdTransaccion() == null)
            throw new NonRetryableClientDataException("idTransaccion requerido | idProceso=" + idProceso);
        if (m.getMonto() == null || m.getMonto().compareTo(BigDecimal.ZERO) <= 0)
            throw new NonRetryableClientDataException("Monto inválido | idProceso=" + idProceso);
        log.debug("✅ Payload validado | idProceso={}", idProceso);
    }

    private SvboResponseDto consultarSvbo(LiquidacionInputDto mensaje, String idProceso) {
        log.info("🔍 Consultando SVBO | idProceso={} | idTransaccion={}", idProceso, mensaje.getIdTransaccion());
        return svboClient.consultarTransaccion(mensaje.getIdTransaccion());
    }

    private LiquidacionOutputDto calcularLiquidacion(LiquidacionInputDto m, SvboResponseDto svbo, String idProceso) {
        log.info("⚙️ Calculando liquidación | idProceso={}", idProceso);
        return LiquidacionOutputDto.builder()
            .idProceso(idProceso)
            .idTransaccion(m.getIdTransaccion())
            .montoLiquidado(svbo.getMontoALiquidar())
            .estado("PROCESADO")
            .build();
    }

    private void registrarLiquidacion(LiquidacionOutputDto resultado, String idProceso) {
        log.info("💾 Persistiendo liquidación | idProceso={}", idProceso);
        liquidacionRepository.guardar(resultado);
    }

    private void auditarError(LiquidacionInputDto m, String idProceso, String sucursal, String estado, String detalle) {
        try {
            auditoriaRepository.registrarEstado(idProceso, sucursal, estado, detalle);
        } catch (Exception ex) {
            log.error("❌ CRÍTICO: Fallo auditoría | idProceso={} | estado={} | error={}", idProceso, estado, ex.getMessage());
        }
    }
}
```
