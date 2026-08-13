# MockWebServer — Testear clientes HTTP (XxxClient)

## Cuando usarlo

Tests unitarios de `XxxClient` que necesitan simular respuestas HTTP reales
(codigos de estado, headers, body) sin levantar el contexto de Spring.

## Template: XxxClient Test

```java
/**
 * Tests unitarios para XxxClient.
 * Usa MockWebServer para simular respuestas HTTP sin levantar Spring context.
 */
class XxxClientTest {

    private MockWebServer mockWebServer;
    private XxxClient xxxClient;

    /**
     * Levanta el servidor mock y configura RestClient apuntando a él.
     */
    @BeforeEach
    void setUp() throws IOException {
        mockWebServer = new MockWebServer();
        mockWebServer.start();

        RestClient restClient = RestClient.builder()
                .baseUrl(mockWebServer.url("/").toString())
                .build();

        xxxClient = new XxxClient(restClient);
    }

    /**
     * Cierra el servidor mock al finalizar cada test.
     */
    @AfterEach
    void tearDown() throws IOException {
        mockWebServer.shutdown();
    }

    /**
     * Verifica que el cliente parsea correctamente una respuesta 200 OK.
     */
    @Test
    void testConsultarExitoso() throws InterruptedException {
        // Arrange
        String responseBody = """
                {"id": 1, "estado": "ACTIVO"}
                """;
        mockWebServer.enqueue(new MockResponse()
                .setBody(responseBody)
                .addHeader("Content-Type", "application/json")
                .setResponseCode(200));

        // Act
        XxxResponse result = xxxClient.consultar(1L);

        // Assert
        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);

        RecordedRequest request = mockWebServer.takeRequest();
        assertThat(request.getMethod()).isEqualTo("GET");
        assertThat(request.getPath()).isEqualTo("/xxx/1");
    }

    /**
     * Verifica que el cliente lanza XxxClientException ante respuesta 4xx.
     */
    @Test
    void testConsultarCon404() {
        // Arrange
        mockWebServer.enqueue(new MockResponse().setResponseCode(404));

        // Act & Assert
        assertThatThrownBy(() -> xxxClient.consultar(99L))
                .isInstanceOf(XxxClientException.class);
    }

    /**
     * Verifica que el cliente lanza XxxClientException ante respuesta 5xx.
     */
    @Test
    void testConsultarCon500() {
        // Arrange
        mockWebServer.enqueue(new MockResponse().setResponseCode(500).setBody("Internal Server Error"));

        // Act & Assert
        assertThatThrownBy(() -> xxxClient.consultar(1L))
                .isInstanceOf(XxxClientException.class);
    }
}
```

Ver [excepciones](../../excepciones/SKILL.md) para el contrato de `XxxClientException`
(`statusCode` + `responseBody`) que este test valida.

---

## Dependencias Gradle

```gradle
testImplementation 'com.squareup.okhttp3:mockwebserver:4.12.0'
testImplementation 'com.squareup.okhttp3:okhttp:4.12.0'
```
