# Testing de Kafka — Listener y publicación

Router: `knowledge/testing/SKILL.md`. Cubre lo que `mockito.md` y
`mockwebserver.md` no cubren: el consumer (`XxxKafkaListener`, ver
`../../kafka/references/listener.md`) y la publicación síncrona del
`XxxProcessor` (paso 5/6 del saga, ver `../../processor/references/saga.md`).

## Test del Listener

Mockear el `Processor` y el `Acknowledgment` — nunca levantar un broker real
ni el contexto Spring para un test unitario (`@SpringBootTest` es integración).

```java
@ExtendWith(MockitoExtension.class)
class {Xxx}KafkaListenerTest {

    @Mock private {Xxx}Processor {xxx}Processor;
    @Mock private KafkaTemplate<String, Object> dlqKafkaTemplate;
    @Mock private Acknowledgment ack;

    @InjectMocks private {Xxx}KafkaListener listener;

    // CASO 1: mensaje valido -> processor invocado, ack confirmado
    @Test
    void consumir_mensajeValido_procesaYAcknowledge() {
        {Xxx}InputDto mensaje = // instancia de prueba valida
        listener.consumir(mensaje, "proc-1", "001", ack);
        verify({xxx}Processor).procesar{Xxx}(mensaje, "proc-1", "001");
        verify(ack).acknowledge();
    }

    // CASO 2: error determinista (NonRetryableClientDataException) -> DLQ manual + ack, SIN re-throw
    @Test
    void consumir_errorDeterminista_envioADlqYAcknowledgeSinPropagar() throws Exception {
        {Xxx}InputDto mensaje = // instancia de prueba
        doThrow(new NonRetryableClientDataException("dato invalido"))
            .when({xxx}Processor).procesar{Xxx}(any(), any(), any());
        var future = mockSendResult();
        when(dlqKafkaTemplate.getDefaultTopic()).thenReturn("dlq-topic");
        when(dlqKafkaTemplate.send(any(), any(), any())).thenReturn(future);

        assertDoesNotThrow(() -> listener.consumir(mensaje, "proc-2", "001", ack));

        verify(dlqKafkaTemplate).send(eq("dlq-topic"), eq("proc-2"), eq(mensaje));
        verify(ack).acknowledge();
    }

    // CASO 3: error de infraestructura -> NO ack, excepcion propagada (KafkaConfig reintenta)
    @Test
    void consumir_errorInfraestructura_noAcknowledgeYPropaga() {
        {Xxx}InputDto mensaje = // instancia de prueba
        doThrow(new RuntimeException("timeout BD")).when({xxx}Processor).procesar{Xxx}(any(), any(), any());

        assertThrows(RuntimeException.class,
            () -> listener.consumir(mensaje, "proc-3", "001", ack));

        verify(ack, never()).acknowledge();
    }

    // CASO 4: circuit breaker abierto -> rechaza sin invocar el processor
    @Test
    void consumir_circuitBreakerAbierto_rechazaSinInvocarProcessor() {
        {Xxx}InputDto mensaje = // instancia de prueba
        doThrow(new RuntimeException("fallo")).when({xxx}Processor).procesar{Xxx}(any(), any(), any());
        for (int i = 0; i < 10; i++) {
            assertThrows(RuntimeException.class, () -> listener.consumir(mensaje, "proc-cb-" + i, "001", ack));
        }

        // el fallo #11 encuentra el circuit breaker ya abierto -- ni siquiera invoca el processor
        reset({xxx}Processor);
        assertThrows(RuntimeException.class, () -> listener.consumir(mensaje, "proc-cb-11", "001", ack));
        verifyNoInteractions({xxx}Processor);
    }

    // CASO 5: orden correcto -- processor ANTES que ack
    @Test
    void consumir_ordenCorrecto_processorAntesQueAcknowledge() {
        {Xxx}InputDto mensaje = // instancia de prueba
        InOrder inOrder = inOrder({xxx}Processor, ack);
        listener.consumir(mensaje, "proc-5", "001", ack);
        inOrder.verify({xxx}Processor).procesar{Xxx}(mensaje, "proc-5", "001");
        inOrder.verify(ack).acknowledge();
    }

    @SuppressWarnings("unchecked")
    private CompletableFuture<SendResult<String, Object>> mockSendResult() {
        var future = mock(CompletableFuture.class);
        try {
            when(future.get()).thenReturn(mock(SendResult.class));
        } catch (Exception ignored) { /* mock, nunca lanza realmente */ }
        return future;
    }
}
```

**Nota sobre CASO 4:** el circuit breaker es estado interno de la instancia
(`AtomicInteger consecutiveFailures`) — para testearlo hay que forzar el
threshold (10 fallas) antes de verificar el rechazo. Si el dominio ajusta
`CB_FAILURE_THRESHOLD`, ajustar el loop del test.

## Test de la publicación (Processor, paso 5/6 del saga)

El `Processor` publica directo con `{xxx}KafkaTemplate.send(topic, key, dto).get()`
— no hay una capa `KafkaProducerService` separada (ver `saga.md`). Mockear el
`KafkaTemplate` y el `CompletableFuture` que retorna `.send(...)`:

```java
@ExtendWith(MockitoExtension.class)
class {Xxx}ProcessorImplTest {

    @Mock private KafkaTemplate<String, Object> {xxx}KafkaTemplate;
    @Mock private KafkaTemplate<String, Object> notificationKafkaTemplate;
    // ... demas mocks del processor (client, repository, auditoriaRepository)

    @InjectMocks private {Xxx}ProcessorImpl processor;

    // CASO 1: publicacion exitosa -- send() invocado con la clave de negocio correcta
    @Test
    void procesar_publicacionExitosa_enviaConClaveDeNegocio() throws Exception {
        var future = mockSendResult({xxx}KafkaTemplate);
        // ... arrange de client/repository con respuestas validas

        processor.procesar{Xxx}(mensajeValido, "proc-1", "001");

        verify({xxx}KafkaTemplate).send(eq("{topic-output}"), eq("proc-1"), any());
    }

    // CASO 2: fallo en el send del topic output -- se audita PENDIENTE y se re-lanza
    @Test
    void procesar_fallaPublicacionOutput_audiraPendienteYPropaga() throws Exception {
        when({xxx}KafkaTemplate.send(any(), any(), any()))
            .thenThrow(new RuntimeException("broker no disponible"));
        // ... arrange de client/repository con respuestas validas

        assertThrows(RuntimeException.class,
            () -> processor.procesar{Xxx}(mensajeValido, "proc-2", "001"));

        verify(auditoriaRepository).registrarEstado(eq("proc-2"), any(), eq("PENDIENTE"), contains("Kafka output"));
    }

    // CASO 3: fallo SOLO en notificacion -- NO propaga (proceso principal ya fue exitoso)
    @Test
    void procesar_fallaNotificacion_noPropagaProcesoPrincipalExitoso() throws Exception {
        mockSendResult({xxx}KafkaTemplate);
        when(notificationKafkaTemplate.send(any(), any(), any()))
            .thenThrow(new RuntimeException("notificacion no disponible"));
        // ... arrange de client/repository con respuestas validas

        assertDoesNotThrow(() -> processor.procesar{Xxx}(mensajeValido, "proc-3", "001"));

        verify(auditoriaRepository).registrarEstado(eq("proc-3"), any(), eq("NOTIFICACION_PENDIENTE"), any());
    }

    @SuppressWarnings("unchecked")
    private CompletableFuture<SendResult<String, Object>> mockSendResult(KafkaTemplate<String, Object> template) throws Exception {
        var future = mock(CompletableFuture.class);
        var sendResult = mock(SendResult.class);
        var metadata = mock(RecordMetadata.class);
        when(template.send(any(), any(), any())).thenReturn(future);
        when(future.get()).thenReturn(sendResult);
        when(sendResult.getRecordMetadata()).thenReturn(metadata);
        return future;
    }
}
```

## Anti-patrones específicos de estos tests

- Levantar `EmbeddedKafka` o un broker real para testear el listener o el processor — son tests unitarios, el `KafkaTemplate`/`Processor` se mockea (ver DON'T de `../SKILL.md`).
- Verificar `ack.acknowledge()` sin verificar también que ocurrió **después** del procesamiento (`InOrder`) — un ack antes de tiempo pierde mensajes si el procesamiento falla a mitad de camino.
- Omitir el caso de error de infraestructura — es el que prueba que los reintentos automáticos de `KafkaConfig` realmente se disparan (sin el `throw e`, nunca se activan).
