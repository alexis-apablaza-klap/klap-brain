---
name: openapi
description: Configuracion de OpenAPI/Swagger (springdoc) en microservicios KLAP SVA, habilitada solo en local/develop. Usar al crear o revisar OpenApiConfig o anotaciones en controllers.
---

# OpenAPI — KLAP SVA

Router de configuracion Swagger/OpenAPI. La version fijada de springdoc esta
documentada en [stack](../klap-standard/references/stack.md).

## Cuando usar este skill

Configurar o revisar OpenAPI/Swagger en un microservicio, o validar que la
documentacion quede deshabilitada en produccion.

## Regla clave

OpenAPI solo se habilita en perfiles `local` y `develop`. El `application.yml`
base (produccion) lo deja deshabilitado y `OpenApiConfig` se restringe ademas
con `@Profile({"local", "develop"})` a nivel de clase. Template completo (yaml
por perfil + `OpenApiConfig.java` + anotaciones en controllers):
[references/config.md](references/config.md).

## Ubicacion

```
{dominio}/global/config/OpenApiConfig.java
```

La estructura completa de `global/` esta en [arquitectura](../klap-standard/references/arquitectura.md).

## URLs (perfiles local/develop)

| URL | Descripcion |
|-----|-------------|
| `/swagger-ui.html` | UI interactiva de Swagger |
| `/v3/api-docs` | Spec OpenAPI 3.0 en JSON |
| `/v3/api-docs.yaml` | Spec OpenAPI 3.0 en YAML |

## DON'T

- No habilitar OpenAPI en produccion — riesgo de exposicion de contratos internos.
- No agregar `@Profile` en el `@Bean` si ya esta en la clase `@Configuration` — es redundante.
- No anotar cada metodo con `@Operation` si el nombre del endpoint ya es autodescriptivo.
- No usar `springfox` (Swagger 2) — el equipo usa `springdoc` (OpenAPI 3) exclusivamente.
