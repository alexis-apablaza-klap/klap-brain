---
name: testing
description: Templates de tests unitarios para services, repositories y clientes HTTP KLAP BYSF (JUnit 5, Mockito, AssertJ, MockWebServer). Usar al escribir o revisar tests unitarios de un microservicio.
---

# Testing — KLAP BYSF

Router de templates de test unitario. La cobertura minima exigida (JaCoCo)
esta fijada en [stack](../klap-standard/references/stack.md).

## Cuando usar este skill

Escribir o revisar tests unitarios de un `Service`, `Repository`, `Client`
HTTP, `KafkaListener` o `Processor` (paso de publicación) de un microservicio
KLAP BYSF.

## Stack de testing

JUnit 5 + `@ExtendWith(MockitoExtension.class)` + Mockito (mocks, captors,
verificaciones) + AssertJ (`assertThat(...)`) + MockWebServer (OkHttp) para
tests de `XxxClient`.

## Estructura de clase de test

```java
@ExtendWith(MockitoExtension.class)
class XxxServiceImplTest {

    @Mock
    private XxxRepository xxxRepository;

    @Mock
    private XxxClient xxxClient;

    @InjectMocks
    private XxxServiceImpl xxxService;

    @Captor
    private ArgumentCaptor<XxxEntity> xxxCaptor;
}
```

- `@Mock` — una anotacion por dependencia inyectada en el sujeto.
- `@InjectMocks` — la clase concreta bajo test (impl, no interfaz).
- `@Captor` — para capturar argumentos y verificar su contenido.

## Patron AAA (Arrange-Act-Assert)

Templates completos de `XxxServiceImpl` y `XxxRepository` (JdbcTemplate
mockeado) con Mockito: [references/mockito.md](references/mockito.md).

## Cliente HTTP (MockWebServer)

Template para testear `XxxClient` sin levantar el contexto Spring:
[references/mockwebserver.md](references/mockwebserver.md).

## Kafka (Listener y publicación del Processor)

Template para testear `XxxKafkaListener` (circuit breaker, clasificación de
errores, orden ack/procesamiento) y el paso de publicación síncrona del
`XxxProcessor`: [references/kafka.md](references/kafka.md).

## Naming de tests

| Escenario | Nombre del metodo |
|-----------|------------------|
| Flujo feliz | `testProcesarXxxExitoso()` |
| Error de negocio | `testProcesarXxxConError()` |
| Validacion de entrada | `testProcesarXxxConValidacion()` |
| Not found | `testBuscarXxxNoEncontrada()` |
| Timeout / retriable | `testConsultarClienteConTimeout()` |

## DON'T

- No usar `@SpringBootTest` para unit tests — es un integration test, levanta el contexto completo y es lento.
- No mockear `JdbcTemplate` con mocks complejos para validar SQL — usar H2 en integration tests si se necesita validar queries reales.
- No usar `Mockito.reset()` entre tests — cada test debe ser independiente, usar `@BeforeEach` para setup limpio.
- No ignorar el `verify(...)` — siempre verificar que las interacciones esperadas ocurrieron.
- No escribir asserts en el bloque Arrange ni setup en el bloque Assert.
