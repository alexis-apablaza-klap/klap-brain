# OpenApiConfig — Template

## Dependencia Gradle

Version fijada en [stack](../../klap-standard/references/stack.md).

```gradle
implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.12'
```

---

## Configuracion por perfil

`application.yml` (base — produccion):
```yaml
springdoc:
  api-docs:
    enabled: false
  swagger-ui:
    enabled: false
```

`application-local.yml`:
```yaml
springdoc:
  api-docs:
    enabled: true
    path: /v3/api-docs
  swagger-ui:
    enabled: true
    path: /swagger-ui.html
```

`application-develop.yml`:
```yaml
springdoc:
  api-docs:
    enabled: true
    path: /v3/api-docs
  swagger-ui:
    enabled: true
    path: /swagger-ui.html
```

---

## Template: OpenApiConfig.java

```java
package cl.klap.sva.{dominio}.global.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

/**
 * Configuracion de OpenAPI/Swagger para el servicio {NombreServicio}.
 * Disponible unicamente en perfiles local y develop.
 * En produccion, esta configuracion no se carga y la documentacion queda deshabilitada
 * via springdoc.api-docs.enabled=false en application.yml.
 */
@Configuration
@Profile({"local", "develop"})
public class OpenApiConfig {

    /**
     * Define la metadata principal de la API expuesta por este servicio.
     * El bean es consumido por springdoc para generar el spec OpenAPI 3.0
     * disponible en /v3/api-docs y renderizado en /swagger-ui.html.
     *
     * @return instancia de OpenAPI con titulo, version y descripcion del servicio
     */
    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("{NombreServicio} API")
                        .version("1.0.0")
                        .description("API REST para {descripcion del dominio de negocio}. " +
                                "Disponible solo en entornos local y develop.")
                        .contact(new Contact()
                                .name("Equipo KLAP SVA")
                                .email("desarrollosva@klap.cl"))
                        .license(new License()
                                .name("Internal — KLAP")
                                .url("https://klap.com")));
    }
}
```

---

## Anotaciones en Controllers

Usar solo cuando el endpoint necesita documentacion adicional que no es obvia del nombre del metodo.

```java
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;

/**
 * Controller REST para operaciones de liquidacion.
 */
@RestController
@RequestMapping("/api/v1/liquidaciones")
@Tag(name = "Liquidaciones", description = "Operaciones de liquidacion SVBO")
public class LiquidacionController {

    /**
     * Procesa una liquidacion por ID.
     *
     * @param id identificador unico de la liquidacion
     * @return resultado del procesamiento
     */
    @Operation(
        summary = "Procesar liquidacion",
        description = "Ejecuta el flujo completo de liquidacion para el ID indicado"
    )
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Liquidacion procesada exitosamente"),
        @ApiResponse(responseCode = "404", description = "Liquidacion no encontrada"),
        @ApiResponse(responseCode = "422", description = "Estado invalido para procesar"),
        @ApiResponse(responseCode = "500", description = "Error interno del servidor")
    })
    @PostMapping("/{id}/procesar")
    public ResponseEntity<LiquidacionResponse> procesar(
            @Parameter(description = "ID unico de la liquidacion", example = "12345")
            @PathVariable Long id) {
        // implementacion
    }
}
```
