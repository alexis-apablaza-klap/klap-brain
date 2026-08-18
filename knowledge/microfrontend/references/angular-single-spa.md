# Angular + single-spa — Microfrontend

Bootstrap, configuracion runtime y consumo del BFF desde el lado Angular,
para los dos patrones de MCF. La arquitectura y el arbol de carpetas
completo esta en `references/estructura.md`. Piso de version vigente:
`knowledge/klap-standard/references/stack-npm.md` — un MCF nuevo se crea
directo en el piso recomendado ahi, no en lo que muestra este ejemplo.

## Dependencias clave (package.json)

```json
{
  "dependencies": {
    "@angular/core": "^22.0.0",
    "@angular/router": "^22.0.0",
    "@angular/common": "^22.0.0",
    "@angular/forms": "^22.0.0",
    "single-spa-angular": "^9.2.0",
    "rxjs": "~7.8.0",
    "zone.js": "~0.15.0"
  },
  "devDependencies": {
    "@angular-builders/custom-webpack": "^22.0.0",
    "@angular-devkit/build-angular": "^22.0.0",
    "@angular/cli": "^22.0.0"
  }
}
```

---

# Patron 1 (MCF bo)

## angular.json — Targets clave

```jsonc
{
  "projects": {
    "mcf-bo-<nombre>": {
      "architect": {
        "build": {
          "builder": "@angular-builders/custom-webpack:browser",
          "options": {
            "main": "src/main.single-spa.ts",
            "outputPath": "dist",
            "deployUrl": "http://localhost:900X/",
            "customWebpackConfig": { "path": "./extra-webpack.config.js" }
          }
        },
        "serve": {
          "builder": "@angular-builders/custom-webpack:dev-server",
          "options": { "port": 900X }
        },
        "build-standalone": {
          "builder": "@angular-devkit/build-angular:application",
          "options": { "browser": "src/main.ts", "outputPath": "dist-standalone", "index": "src/index.html" }
        },
        "serve-standalone": {
          "builder": "@angular-devkit/build-angular:dev-server",
          "options": { "buildTarget": "mcf-bo-<nombre>:build-standalone", "port": 4201 }
        }
      }
    }
  }
}
```

## extra-webpack.config.js

```js
const singleSpaAngularWebpack = require('single-spa-angular/lib/webpack').default;

module.exports = (config, options) => {
  const singleSpaConfig = singleSpaAngularWebpack(config, options);
  singleSpaConfig.output.library = { type: 'system' };
  singleSpaConfig.externals = ['single-spa', /^@mcf-bo\/.+$/];
  return singleSpaConfig;
};
```

## Servicio Angular — patron de conexion al BFF

```typescript
@Injectable({ providedIn: 'root' })
export class MiService {
  private readonly apiUrl: string;

  constructor(private readonly http: HttpClient) {
    const isLocal = window.location.hostname === 'localhost';
    if (isLocal) {
      this.apiUrl = 'http://localhost:8080/ms-central-bff-bysf-bo-menu/bff/<base>';
    } else {
      const bffUrl = (window as any).__BFF_<NOMBRE>_URL__;
      this.apiUrl = bffUrl || `${window.location.origin}/ms-central-bff-bysf-bo-menu/bff/<base>`;
    }
  }

  getItems(page = 0, size = 10, search = ''): Observable<PaginatedResponse<Item>> {
    let params = new HttpParams().set('page', page).set('size', size);
    if (search) params = params.set('search', search);
    return this.http.get<PaginatedResponse<Item>>(`${this.apiUrl}/items`, { params });
  }
}
```

## Modelos TypeScript

```typescript
export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

export interface MiEntidad {
  id: number;
  nombre: string;
  estado: 'ACTIVO' | 'INACTIVO';  // BFF convierte boolean <-> string
}
```

## Levantar el MCF localmente

```bash
# MCF standalone (sin shell)
cd mcf-bo-<nombre>
npx ng run mcf-bo-<nombre>:serve-standalone
# → http://localhost:4201
```

---

# Patron 2 (MCF bysf)

## src/env.js

```js
window.__env = window.__env || {};
```

## src/app/config/env.ts

```typescript
type RuntimeEnv = { BFF_<NOMBRE>_URL?: string; [key: string]: any; };

export function getBff<Nombre>BaseUrl(): string {
  const env = (window as any).__env || {};
  const w = window as any;
  const isLocal = window.location.hostname === 'localhost';

  if (env.BFF_<NOMBRE>_URL) return env.BFF_<NOMBRE>_URL;
  if (w.__BFF_<NOMBRE>_URL__) return w.__BFF_<NOMBRE>_URL__;
  if (w.BOMC_MCF_BFF_<NOMBRE>_URL) return w.BOMC_MCF_BFF_<NOMBRE>_URL;
  if (isLocal) return 'http://localhost:<PUERTO_BFF>/api';
  return window.location.origin + '/api/bff-<nombre>';
}
```

## auth-token.interceptor.ts

```typescript
export const authTokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authTokenAPI = (window as any).__AUTH_TOKEN_API__;

  return from(authTokenAPI?.getToken() ?? Promise.resolve(null)).pipe(
    switchMap((token: string | null) => {
      const authReq = token
        ? req.clone({ setHeaders: { Authorization: token, clientid: 'backoffice-v2' } })
        : req;

      return next(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          if (error.status === 401 && authTokenAPI) {
            return from(authTokenAPI.getTokenWithRefresh()).pipe(
              switchMap((refreshedToken: string | null) => refreshedToken
                ? next(req.clone({ setHeaders: { Authorization: refreshedToken, clientid: 'backoffice-v2' } }))
                : throwError(() => error)
              ),
              catchError(() => throwError(() => error))
            );
          }
          return throwError(() => error);
        })
      );
    })
  );
};
```

## app.config.ts

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([authTokenInterceptor])),
    provideAnimations(),
    { provide: APP_BASE_HREF, useValue: '/' },
  ],
};
```

## main.single-spa.ts

```typescript
const lifecycles = singleSpaAngular({
  bootstrapFunction: () => bootstrapApplication(AppComponent, appConfig),
  template: '<app-<nombre>></app-<nombre>>',
  NgZone,
});

export const bootstrap = lifecycles.bootstrap;
export const mount = lifecycles.mount;
export const unmount = lifecycles.unmount;
```

Nota: patron 1 usa el mismo esquema `bootstrap`/`mount`/`unmount` en su propio
`main.single-spa.ts`; el ejemplo de arriba es valido para ambos patrones.

## extra-webpack.config.js (version bysf extendida)

```js
const singleSpaAngularWebpack = require('single-spa-angular/lib/webpack').default;

module.exports = (config, options) => {
  const singleSpaWebpackConfig = singleSpaAngularWebpack(config, options);
  const isProd = options?.configuration === 'production' || process.env.NODE_ENV === 'production';

  singleSpaWebpackConfig.output = {
    ...singleSpaWebpackConfig.output,
    filename: 'main.js',
    publicPath: isProd ? 'https://apps-front-dev.mcdesaqa.cl/mcf-bysf-<nombre>/' : 'auto',
    environment: {
      arrowFunction: false, bigIntLiteral: false, const: false,
      destructuring: false, dynamicImport: false, forOf: false, module: false
    }
  };

  singleSpaWebpackConfig.optimization = {
    ...singleSpaWebpackConfig.optimization,
    splitChunks: false,
    runtimeChunk: false
  };

  singleSpaWebpackConfig.devServer = {
    port: <PUERTO_MCF>,
    historyApiFallback: true,
    hot: false,
    liveReload: false,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Authorization',
    },
  };

  singleSpaWebpackConfig.externals = {};
  singleSpaWebpackConfig.output.libraryTarget = 'system';
  return singleSpaWebpackConfig;
};
```

## angular.json — Targets

```jsonc
{
  "build": {
    "builder": "@angular-builders/custom-webpack:browser",
    "options": {
      "outputPath": "dist/mcf-bysf-<nombre>",
      "main": "src/main.single-spa.ts",
      "customWebpackConfig": { "path": "extra-webpack.config.js", "libraryTarget": "system" },
      "sourceMap": { "scripts": false, "styles": false, "vendor": false }
    },
    "configurations": {
      "production": { "outputHashing": "none" },
      "development": { "outputHashing": "none" }
    }
  },
  "serve": {
    "options": { "port": "<PUERTO_MCF>", "proxyConfig": "proxy.conf.json", "liveReload": false, "hmr": false }
  }
}
```

## proxy.conf.json

```json
{
  "/api": {
    "target": "http://localhost:<PUERTO_BFF>",
    "secure": false,
    "changeOrigin": true
  }
}
```

## Levantar el MCF localmente

```bash
# MCF single-spa
cd mcf-bysf-<nombre>
npm run start
# → http://localhost:<PUERTO_MCF>/main.js

# MCF standalone
npm run serve:standalone
# → http://localhost:4201
```
