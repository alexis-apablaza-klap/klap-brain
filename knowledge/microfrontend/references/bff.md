# BFF Spring Boot — Microfrontend

Implementacion del BFF para cada patron: patron 1 extiende un BFF
compartido existente sobre Aurora PostgreSQL, patron 2 crea un proyecto
Spring Boot propio que proxea un upstream externo. La estructura de
carpetas de cada BFF esta en `references/estructura.md`.

---

# Patron 1: Integracion en BFF existente (ms-central-bff-bysf-bo-menu)

## Archivos a crear en el BFF

| Ubicacion | Archivo | Patron |
|-----------|---------|--------|
| `src/main/resources/sql/<nombre>/` | `*.sql` | Queries con `?` |
| `src/.../controller/dto/` | `*Request.java` / `*Response.java` | POJOs con getters/setters |
| `src/.../menu/aurora/repo/` | `Bo<Nombre>Repository.java` | `@Repository` + `JdbcTemplate` |
| `src/.../menu/service/` | `<Nombre>Service.java` | `@Service` |
| `src/.../menu/controller/` | `<Nombre>Controller.java` | `@RestController` |
| `src/.../config/` | `SecurityConfig.java` | Agregar `.requestMatchers("/bff/<base>/**").permitAll()` |

## SQL files — Convenciones

```
sql/<nombre>/
├── <entidad>_listar.sql        # SELECT ... LIMIT ? OFFSET ?
├── <entidad>_contar.sql        # SELECT COUNT(*)
├── <entidad>_obtener.sql       # SELECT ... WHERE id = ?
├── <entidad>_insertar.sql      # INSERT ... RETURNING ...
├── <entidad>_actualizar.sql    # UPDATE ... WHERE id = ? RETURNING ...
├── <entidad>_eliminar.sql      # DELETE ... WHERE id = ?
├── <entidad>_todos.sql         # SELECT ... ORDER BY (sin paginacion, para lookups)
└── V1__<nombre>_ddl.sql        # ALTER TABLE IF NOT EXISTS (migracion)
```

**Reglas SQL:**
- Schema siempre `backoffice.*`
- Estado en BD es `boolean` → Java convierte a `"ACTIVO"/"INACTIVO"`
- PKs: `bo_menu.id`, `bo_rol.id_rol`, `bo_accion.id_accion`, `bo_funcionalidad.id`, `bo_perfil.id_perfil`
- Usar `RETURNING` de PostgreSQL para INSERT/UPDATE
- Busqueda: `WHERE (? IS NULL OR ? = '' OR LOWER(col) LIKE LOWER(CONCAT('%', ?, '%')))`

## Repository — Patron JdbcTemplate

```java
@Repository
public class Bo<Nombre>Repository {
    private final JdbcTemplate jdbc;
    private final ResourceLoader resourceLoader;
    private static final String SQL_BASE = "classpath:sql/<nombre>/";

    public Bo<Nombre>Repository(JdbcTemplate jdbc, ResourceLoader resourceLoader) {
        this.jdbc = jdbc;
        this.resourceLoader = resourceLoader;
    }

    public List<MiResponse> findItems(String search, int limit, int offset) {
        try {
            String sql = readSql("<entidad>_listar.sql");
            return jdbc.query(sql, (rs, rowNum) -> {
                MiResponse r = new MiResponse();
                r.setId(rs.getLong("id"));
                r.setNombre(rs.getString("nombre"));
                r.setEstadoFromBoolean(rs.getBoolean("estado"));
                return r;
            }, search, search, search, limit, offset);
        } catch (IOException e) {
            return Collections.emptyList();
        }
    }

    private String readSql(String filename) throws IOException {
        try (InputStream is = resourceLoader.getResource(SQL_BASE + filename).getInputStream()) {
            return new String(is.readAllBytes(), StandardCharsets.UTF_8);
        }
    }
}
```

## Service — Patron

```java
@Service
public class <Nombre>Service {
    private final Bo<Nombre>Repository repository;

    @Autowired
    public <Nombre>Service(@Autowired(required = false) Optional<Bo<Nombre>Repository> repo) {
        this.repository = repo.orElse(null);
    }

    public PaginatedResponse<MiResponse> getItems(int page, int size, String search) {
        checkRepository();
        List<MiResponse> content = repository.findItems(search, size, page * size);
        long total = repository.countItems(search);
        return new PaginatedResponse<>(content, total, size, page);
    }

    private void checkRepository() {
        if (repository == null) throw new IllegalStateException("Repository no disponible");
    }
}
```

## Controller — Patron

```java
@RestController
@RequestMapping("/bff/<base>")
@Tag(name = "<Nombre>", description = "CRUD de <entidades>")
public class <Nombre>Controller {
    private final <Nombre>Service service;

    @GetMapping(value = "/<entidad>", produces = APPLICATION_JSON_VALUE)
    public ResponseEntity<PaginatedResponse<MiResponse>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "") String search) {
        return ResponseEntity.ok(service.getItems(page, size, search));
    }

    @PostMapping(value = "/<entidad>", consumes = APPLICATION_JSON_VALUE)
    public ResponseEntity<MiResponse> create(@Valid @RequestBody MiRequest req) {
        return ResponseEntity.status(CREATED).body(service.createItem(req));
    }
    // PUT /<entidad>/{id}, DELETE /<entidad>/{id}, GET /<entidad>/all
}
```

## Levantar el BFF localmente

```bash
cd ms-central-bff-bysf-bo-menu
SPRING_PROFILES_ACTIVE=local gradle bootRun --args='--security.oauth2.enabled=false'
```

---

# Patron 2: BFF Independiente (ms-bff-bysf-<nombre>)

## build.gradle

```groovy
plugins {
    id 'java'
    id 'org.springframework.boot' version '3.3.5'
    id 'io.spring.dependency-management' version '1.1.6'
}
group = 'cl.multicaja.bo'
java { toolchain { languageVersion = JavaLanguageVersion.of(17) } }
dependencies {
    implementation 'org.springframework.boot:spring-boot-starter-web'
    implementation 'org.springframework.boot:spring-boot-starter-validation'
    implementation 'org.springframework.boot:spring-boot-starter-oauth2-resource-server'
    implementation 'org.springframework.boot:spring-boot-starter-actuator'
    compileOnly 'org.projectlombok:lombok'
    annotationProcessor 'org.projectlombok:lombok'
    testImplementation 'org.springframework.boot:spring-boot-starter-test'
}
```

## application.yml

```yaml
server:
  port: <PUERTO_BFF>
  servlet:
    context-path: /api
spring:
  application:
    name: ms-bff-bysf-<nombre>
  jackson:
    default-property-inclusion: non_null
<nombre>:
  base-url: ${<NOMBRE>_BASE_URL:https://upstream-dev.dominio.cl/ruta/base}
  auth-token: ${<NOMBRE>_AUTH_TOKEN:Bearer <token-default-dev>}
management:
  endpoints:
    web:
      exposure:
        include: health,info
```

## RestClientConfig.java

```java
@Configuration @Slf4j
public class RestClientConfig {
    @Bean
    public RestTemplate restTemplate(RestTemplateBuilder builder) {
        return builder
            .setConnectTimeout(Duration.ofSeconds(10))
            .setReadTimeout(Duration.ofSeconds(30))
            .messageConverters(List.of(
                new StringHttpMessageConverter(StandardCharsets.UTF_8),
                new MappingJackson2HttpMessageConverter()
            ))
            .interceptors((request, body, execution) -> {
                log.info(">>> {} {}", request.getMethod(), request.getURI());
                ClientHttpResponse response = execution.execute(request, body);
                log.info(">>> Response: {}", response.getStatusCode());
                return response;
            })
            .build();
    }
}
```

## SecurityConfig.java (BFF propio)

```java
@Configuration @EnableWebSecurity
public class SecurityConfig {
    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(csrf -> csrf.disable())
            .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll());
        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }
}
```

## Service — Patron proxy

```java
@Service @Slf4j
public class <Nombre>Service {
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${<nombre>.base-url}") private String upstreamBaseUrl;
    @Value("${<nombre>.auth-token}") private String upstreamAuthToken;

    public <EntidadResponse> getEntidad(<EntidadGetRequest> request, String authToken) {
        String url = upstreamBaseUrl + "/ruta/del/upstream";
        HttpEntity<<EntidadGetRequest>> entity = new HttpEntity<>(request, buildHeaders(authToken));
        ResponseEntity<String> response = restTemplate.exchange(url, HttpMethod.POST, entity, String.class);
        checkUpstreamError(response.getBody());
        return deserialize(response.getBody(), <EntidadResponse>.class);
    }

    private HttpHeaders buildHeaders(String authToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        String token = (authToken != null && !authToken.isBlank()) ? authToken : upstreamAuthToken;
        headers.set("Authorization", token);
        return headers;
    }

    private void checkUpstreamError(String body) {
        try {
            JsonNode node = objectMapper.readTree(body);
            if (node.has("code") && node.get("code").asInt() != 1) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Upstream error: " + node.get("message").asText());
            }
        } catch (ResponseStatusException e) { throw e; }
        catch (Exception ignored) {}
    }

    private <T> T deserialize(String body, Class<T> clazz) {
        try { return objectMapper.readValue(body, clazz); }
        catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Error procesando respuesta del upstream");
        }
    }
}
```

## DTOs (Lombok)

```java
@Data public class <Entidad>GetRequest {
    @NotBlank private String campo_requerido_string;
    @NotNull  private Long campo_requerido_long;
}

@Data public class <Entidad>Response {
    private Integer code;
    private String message;
    private String timestamp;
}
```

## Dockerfile

```dockerfile
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY build/libs/*.jar app.jar
EXPOSE <PUERTO_BFF>
ENTRYPOINT ["java", "-jar", "app.jar"]
```

## Levantar el BFF localmente

```bash
cd ms-bff-bysf-<nombre>
./gradlew bootRun
# → http://localhost:<PUERTO_BFF>/api
```
