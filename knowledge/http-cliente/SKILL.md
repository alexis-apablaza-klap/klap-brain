---
name: http-cliente
description: Cliente HTTP externo con RestClient (no WebFlux/WebClient) para llamar APIs REST externas desde un servicio KLAP BYSF. Usar antes de crear un XxxClient o XxxClientConfig.
---

# HTTP Cliente — RestClient

## Cuando usar este skill

Al llamar a una API externa (REST) desde un servicio KLAP BYSF. No aplica a
comunicación interna entre microservicios via Kafka (ver skill `kafka`).

**Decision de stack, ya resuelta — no discutir de nuevo:** el cliente HTTP es
`RestClient`, incluido en `spring-boot-starter-web`. **No WebFlux, no
WebClient.** El servidor es Spring MVC bloqueante; agregar
`spring-boot-starter-webflux` solo para hacer llamadas HTTP es innecesario —
`RestClient` ya resuelve el caso de uso sin traer un segundo modelo de
concurrencia (reactivo) a un stack que en todo lo demas es bloqueante.

## Que leer

| Archivo | Contiene |
|---|---|
| `references/restclient.md` | Template completo: `XxxClientConfig`, `XxxClient`, manejo de 4xx/5xx, reintentos, test con mocks |

## Resumen de reglas del equipo

- Timeouts explicitos via `SimpleClientHttpRequestFactory` (`connectTimeout` + `readTimeout`).
- Bean de configuracion con `@Bean("restClientXxx")` + `@Qualifier` — **no** `@RequiredArgsConstructor` en el cliente (Lombok no propaga `@Qualifier`; usar constructor manual).
- `4xx` → `XxxClientNonRetryableException` (determinista, no reintentar). `5xx` → `XxxClientException` con reintento via `@Retry` de Resilience4j.
- Nunca hardcodear la base URL — siempre `@Value` en `XxxClientConfig`.
- Loguear `statusCode` + `body` antes de lanzar la excepcion (necesario para debug en produccion).

Naming y JavaDoc: ver [naming](../klap-standard/references/naming.md). Version
de Resilience4j: ver [stack](../klap-standard/references/stack.md).
