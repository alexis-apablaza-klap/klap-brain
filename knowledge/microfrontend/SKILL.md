---
name: microfrontend
description: Crear un Microfrontend Angular 19 + single-spa con BFF Spring Boot para MCF-BO/MCF-BYSF. Usar al crear un MCF nuevo o elegir patron CRUD (Aurora) vs proxy (API externa).
---

# Skill: Crear un Microfrontend Angular + BFF (Spring Boot)

> Guia paso a paso para replicar la creacion de un MCF + integracion BFF, como se hizo con `mcf-bo-perfiles-roles` (patron 1) y `mcf-bysf-imed-cod-lector-lugar` (patron 2).

## Cuando usarlo

| Situacion | Patron |
|---|---|
| MCF backoffice con CRUD sobre Aurora PostgreSQL | Patron 1: `mcf-bo-*` + BFF existente `ms-central-bff-bysf-bo-menu` |
| MCF bysf que proxea una API externa (sin BD propia) | Patron 2: `mcf-bysf-*` + BFF propio `ms-bff-bysf-*` |

La tabla completa de diferencias (puertos, auth, Dockerfile, etc) esta en
`references/estructura.md` — consultarla antes de codear para no mezclar
convenciones de un patron con otro.

## Que leer y en que orden

| Orden | Archivo | Contiene |
|---|---|---|
| 1 | `references/estructura.md` | Diferencias entre patrones, arquitectura de cada uno, arbol de carpetas, registro en el Shell (`mcf-bo-cloud-base`), checklists finales |
| 2 | `references/angular-single-spa.md` | Bootstrap Angular 19 + single-spa (standalone y single-spa), config runtime del BFF, interceptor de auth, servicios/modelos TypeScript |
| 3 | `references/bff.md` | Implementacion del BFF en Spring Boot: capa JdbcTemplate (patron 1) o proxy RestTemplate hacia un upstream externo (patron 2) |
| 4 | `references/angular-reactividad.md` | Convenciones de reactividad (RxJS vs Signals segun version) y estructura de componentes — aplica a cualquier modulo Angular del equipo, no solo al bootstrap de un MCF nuevo |

## Resumen de una linea por reference

- **estructura.md** — que patron elegir, arboles de carpetas de MCF y BFF, puertos, registro en `mcf-bo-cloud-base` (config.json + import map + layout), checklist de verificacion por patron.
- **angular-single-spa.md** — `angular.json` / `extra-webpack.config.js` para SystemJS, `main.single-spa.ts`, env runtime (`window.__env`, fallback chain), interceptor de token, servicios HTTP al BFF, comandos para levantar el MCF local.
- **bff.md** — patron 1: SQL files + Repository/Service/Controller sobre `ms-central-bff-bysf-bo-menu`. Patron 2: proyecto Spring Boot propio (RestTemplate, SecurityConfig, DTOs, Dockerfile) que proxea un upstream externo.

## Reglas transversales

- No mezclar convenciones: un MCF `mcf-bo-*` nunca trae su propio BFF Spring Boot; un MCF `mcf-bysf-*` nunca escribe directo a Aurora.
- Los nombres de variables globales del navegador (`window.__BFF_<NOMBRE>_URL__`, `window.__AUTH_TOKEN_API__`, `window.__env`) son contrato con el Shell — no renombrarlos.
- Puertos y URLs de los ejemplos (`900X`, `8080`, `<PUERTO_BFF>`) son placeholders: asignar el puerto libre real del equipo antes de commitear.
