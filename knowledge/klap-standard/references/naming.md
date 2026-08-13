# Convenciones de naming — KLAP BYSF

| Componente | Patron | Anotacion |
|---|---|---|
| Interfaz de servicio | `XxxService` | — |
| Implementacion de servicio | `XxxServiceImpl` | `@Service` |
| Procesador (saga) | `XxxProcessor` / `XxxProcessorImpl` | `@Service` |
| Repositorio | `XxxRepository` | `@Repository` |
| Consumer Kafka | `XxxKafkaListener` | `@Component` |
| Cliente HTTP | `XxxClient` | `@Component` |
| Configuracion | `XxxConfig` / `XxxKafkaConfig` / `XxxClientConfig` | `@Configuration` |
| Request/Response DTO | `XxxRequestDto` / `XxxResponseDto` / `XxxInputDto` / `XxxOutputDto` | — |
| Entidad BD | `XxxEntity` | — |
| Excepcion | `XxxException` / `XxxClientException` / `XxxPersistenceException` | — |

## Metodos

- Servicios: `procesarXxx()`, `consultarXxx()`, `registrarXxx()`.
- Repositorios: `findById()`, `findAll()`, `insert()`, `update()`.
- Kafka: `consumir()`, `enviarMensaje()`.

## JavaDoc

Obligatorio en todos los metodos publicos, sin excepcion:

```java
/**
 * [Objetivo del metodo en una oracion clara].
 *
 * @param nombreParam descripcion
 * @return descripcion (omitir si es void)
 * @throws XxxException cuando [condicion]
 */
```
