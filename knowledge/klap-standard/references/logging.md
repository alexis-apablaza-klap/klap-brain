# Convenciones de logging — KLAP BYSF

| Nivel | Uso |
|---|---|
| `ERROR` | Errores que requieren investigacion inmediata |
| `WARN` | Situaciones anormales pero recuperables |
| `INFO` | Inicio/fin de procesamiento, publicacion en Kafka |
| `DEBUG` | Payloads, queries SQL — solo en perfil `local` |

## Contexto obligatorio

Incluir siempre `idProceso` y `codigoSucursal` en los logs de negocio, para
poder trazar un caso end-to-end entre servicios.

## Convencion de emojis (opcional, recomendado)

check-exito, x-error, advertencia, sobre-mensaje-recibido, sobre-mensaje-enviado,
circulo-rojo-circuit-breaker — usar con moderacion, solo en logs `INFO`/`WARN`
de alto valor operativo, no en `DEBUG`.
