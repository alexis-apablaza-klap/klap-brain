---
name: excepciones
description: Jerarquia de excepciones custom por dominio KLAP BYSF: XxxException, XxxClientException, XxxPersistenceException, NonRetryableClientDataException. Usar al crear o manejar excepciones de dominio.
---

# Excepciones — KLAP BYSF

Router de la jerarquia de excepciones custom del dominio. Naming de clases: ver
[naming](../klap-standard/references/naming.md). DO/DONT generales del
proyecto: ver [reglas-do](../klap-standard/references/reglas-do.md) y
[reglas-dont](../klap-standard/references/reglas-dont.md).

## Cuando usar este skill

Al crear o manejar excepciones en un dominio KLAP BYSF: services,
repositories, clientes HTTP, Kafka listeners.

## Jerarquia (resumen)

```
RuntimeException
├── XxxException                      base del dominio
│   ├── XxxClientException            API externa (statusCode + responseBody)
│   └── XxxPersistenceException       DB (envuelve DataAccessException)
├── NonRetryableClientDataException   dato irrecuperable -> DLQ sin reintentos
└── KafkaMessageException             (de)serializacion Kafka
```

Codigo completo (constructores, JavaDoc, campos), reglas DO/DONT especificas,
ejemplo de uso en el Kafka listener y anti-patrones: [references/jerarquia.md](references/jerarquia.md).

## Cuando usar cada excepcion

| Situacion | Excepcion a lanzar |
|-----------|-------------------|
| API externa devuelve 4xx | `XxxClientException(msg, 4xx, body)` |
| API externa devuelve 5xx | `XxxClientException(msg, 5xx, body)` |
| `DataAccessException` en repository | `XxxPersistenceException(msg, cause)` |
| Payload de Kafka malformado | `NonRetryableClientDataException` |
| Business rule violation determinista | `NonRetryableClientDataException` |
| Datos del mensaje invalidos (null, formato incorrecto) | `NonRetryableClientDataException` |
| Falla de serializacion JSON en Kafka | `KafkaMessageException` (automatica) |

## Donde viven

```
dominio/{nombre_dominio}/exceptions/
├── XxxException.java
├── XxxClientException.java
├── XxxPersistenceException.java
├── NonRetryableClientDataException.java
└── KafkaMessageException.java
```

La estructura completa de paquetes (`global/` vs `dominio/{nombre}/`) esta en [arquitectura](../klap-standard/references/arquitectura.md).
