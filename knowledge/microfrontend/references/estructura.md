<!-- versions-check:ignore -->
# Estructura de Microfrontend + BFF — MCF-BO / MCF-BYSF

Convenciones de carpetas, arquitectura y checklist de verificacion para los
dos patrones de Microfrontend del equipo. El codigo de implementacion
(Angular y Java) esta en `references/angular-single-spa.md` y
`references/bff.md`.

**Nota de version:** el BFF de microfrontend corre un sub-stack mas liviano
y DELIBERADAMENTE distinto del backend principal — Spring Boot 3.3.5 / Java
17, no las versiones de `../../klap-standard/references/stack.md` (Spring
Boot 3.5.14 / Java 21). No es drift: es un proxy stateless sin BD, no
comparte el ciclo de actualizacion de los microservicios de dominio. Por eso
este archivo esta exento de `npm run versions:check`.

## Diferencias clave entre patrones

| Aspecto | Patron 1 (bo + menu BFF) | Patron 2 (bysf + BFF propio) |
|---|---|---|
| Prefijo MCF | `mcf-bo-*` | `mcf-bysf-*` |
| BFF | Extension de `ms-central-bff-bysf-bo-menu` | Nuevo proyecto Spring Boot independiente |
| Base de datos | Aurora PostgreSQL (JdbcTemplate) | Ninguna — proxy hacia API externa |
| Auth MCF→BFF | Sin token especial | `window.__AUTH_TOKEN_API__.getToken()` + `clientid` header |
| Config runtime MCF | `window.__BFF_X_URL__` | `window.__env.BFF_X_URL` (con fallback chain) |
| Puerto MCF | 900X | 9010 (u otro disponible) |
| Puerto BFF | 8080 | 8083 (u otro disponible) |
| `extra-webpack` | Simple | Extendido: splitChunks/runtimeChunk false, CORS headers devServer |
| Dockerfile | No | Si — imagen propia `eclipse-temurin:17-jre-alpine` |

---

# Patron 1: MCF bo + BFF existente (CRUD Aurora PostgreSQL)

## Arquitectura

```
mcf-bo-cloud-base (Shell :9000)
  └─ mcf-bo-<nombre> (:900X)
       └─> ms-central-bff-bysf-bo-menu (:8080)
             └─> Controller → Service → Repository
                   └─> sql/<nombre>/*.sql
                         └─> Aurora PostgreSQL (schema: backoffice)
```

## Estructura MCF Angular

```
mcf-bo-<nombre>/
├── angular.json
├── package.json
├── tsconfig.json / tsconfig.app.json / tsconfig.spec.json
├── extra-webpack.config.js   # SystemJS library target
└── src/
    ├── main.ts               # Bootstrap standalone (NO single-spa)
    ├── main.single-spa.ts    # Bootstrap single-spa
    ├── index.html
    ├── styles.scss
    └── app/
        ├── app.component.ts
        ├── app.routes.ts
        ├── empty-route/empty-route.component.ts
        ├── models/index.ts
        ├── services/<nombre>.service.ts
        ├── shared/confirm-dialog/ y notification/
        └── views/<entidad>/<entidad>.component.ts
```

## Registro en Shell (mcf-bo-cloud-base)

```json
// config.json
{ "BOMC_MCF_<NOMBRE>_PATH": "http://localhost:900X/main.js" }
```

```html
<!-- index.ejs — Import map -->
"@mcf-bo/mcf-bo-<nombre>": "<%= BOMC_MCF_<NOMBRE>_PATH %>"

<!-- microfrontend-layout.html -->
<route path="<nombre>">
  <application name="@mcf-bo/mcf-bo-<nombre>"></application>
</route>
```

## Checklist Patron 1

- [ ] MCF Angular creado con single-spa + standalone builds
- [ ] Modelos TypeScript definidos
- [ ] Servicio Angular apuntando al BFF
- [ ] Componentes CRUD para cada entidad
- [ ] SQL files creados (listar, contar, obtener, insertar, actualizar, eliminar, todos)
- [ ] DDL migration SQL (V1__<nombre>_ddl.sql)
- [ ] DTOs Java (Request + Response por entidad)
- [ ] Repository Java (JdbcTemplate + SQL files)
- [ ] Service Java (delega a repository)
- [ ] Controller Java (@RestController con endpoints)
- [ ] SecurityConfig actualizado con nuevas rutas
- [ ] CorsFilterConfig permite localhost (para dev)
- [ ] Shell: config.json + index.ejs + microfrontend-layout.html
- [ ] `gradle compileJava` → BUILD SUCCESSFUL
- [ ] MCF standalone compila y sirve en :4201

---

# Patron 2: MCF bysf + BFF Independiente (Proxy API Externa)

> Referencia: `mcf-bysf-imed-cod-lector-lugar` + `ms-bff-bysf-imed`

## Estructura MCF bysf

```
mcf-bysf-<nombre>/
├── angular.json
├── package.json
├── extra-webpack.config.js      # Extendido (splitChunks false, CORS devServer)
├── proxy.conf.json              # Proxy local → BFF
└── src/
    ├── env.js                   # window.__env = {} (reemplazado en pipeline)
    ├── index.html / styles.css
    ├── main.ts / main.single-spa.ts
    └── app/
        ├── app.component.ts
        ├── app.config.ts        # provideHttpClient + authTokenInterceptor
        ├── app.routes.ts
        ├── auth-token.interceptor.ts
        ├── config/env.ts        # getBffXxxBaseUrl() con fallback chain
        └── <feature>/
```

## BFF Independiente — Estructura

```
ms-bff-bysf-<nombre>/
├── build.gradle / settings.gradle / gradlew
├── Dockerfile
└── src/main/java/cl/multicaja/bo/
    ├── MsBffBysf<Nombre>Application.java
    ├── config/
    │   ├── SecurityConfig.java        # Stateless, permitAll, CORS
    │   ├── RestClientConfig.java      # RestTemplate + timeouts + logger
    │   └── GlobalExceptionHandler.java
    ├── controller/<Entidad>Controller.java
    ├── dto/<Entidad>GetRequest/SetRequest/Response.java
    └── service/<Nombre>Service.java
```

## Checklist Patron 2

### MCF
- [ ] `extra-webpack.config.js` con `splitChunks: false`, `runtimeChunk: false`, CORS headers en devServer
- [ ] `src/env.js` con `window.__env = window.__env || {}`
- [ ] `config/env.ts` con `getBff<Nombre>BaseUrl()` y fallback chain completa
- [ ] `auth-token.interceptor.ts` con `window.__AUTH_TOKEN_API__` + refresh + header `clientid`
- [ ] `app.config.ts` con `provideHttpClient(withInterceptors([authTokenInterceptor]))`
- [ ] `main.single-spa.ts` exporta `bootstrap`, `mount`, `unmount`
- [ ] `angular.json`: `outputHashing: none` en prod Y dev
- [ ] `proxy.conf.json` apuntando al BFF local
- [ ] `npm run build:single-spa` genera `dist/mcf-bysf-<nombre>/main.js`

### BFF
- [ ] `build.gradle` con Spring Boot 3.3.5, Java 17, sin dependencias de BD
- [ ] `application.yml`: port, context-path `/api`, propiedades `<nombre>.base-url` y `<nombre>.auth-token`
- [ ] `RestClientConfig` con timeouts (10s connect, 30s read) + interceptor de logging
- [ ] `SecurityConfig` stateless + CORS permisivo
- [ ] `GlobalExceptionHandler` maneja `HttpClientErrorException` y `HttpServerErrorException`
- [ ] `Service`: `buildHeaders()` con prioridad token MCF > token config, `checkUpstreamError()`, `deserialize()`
- [ ] `Dockerfile` con `eclipse-temurin:17-jre-alpine`
- [ ] `./gradlew build` → BUILD SUCCESSFUL
