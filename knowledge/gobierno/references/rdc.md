# RDC — Registro de Despliegue de Cambios

Router: `../SKILL.md`. El RDC se crea **al terminar el desarrollo**, antes
del primer despliegue en QA, y se completa en dos etapas. Es prerequisito
para el pase a **producción** — no para el despliegue en QA.

```
Desarrollo terminado (ver ../../sdd/)
    ↓
[RDC Etapa 1] — crear documento con plan despliegue QA
    ↓
Despliegue QA  ← sin CAB
    ↓
Certificación QA aprobada
    ↓
[RDC Etapa 2] — completar sección PROD → presentar al CAB
    ↓
CAB aprueba → Producción
```

| Etapa | Cuándo | Qué se completa |
|-------|--------|-----------------|
| **1 — Creación** | Al terminar desarrollo, antes de QA | Todo el documento con plan QA. Sección PROD con placeholders. PIM: Pendiente. |
| **2 — PROD + CAB** | Al aprobar certificación QA | "Despliegue Deployment": repos master/, variables Jenkins PROD, plan PROD, rollback PROD, Kong. PIM: Certificado. |

**Regla clave: el CAB solo aplica a producción — QA no requiere CAB.**

## Infraestructura Atlassian

| Campo | Valor |
|-------|-------|
| cloudId | `db4dd528-0e0b-4bdf-b3dd-1e2e4e792a43` |
| Sitio | `multicaja-cloud.atlassian.net` |
| Espacio bysf (spaceId) | `2478211099` |
| Carpeta padre RDC (parentId) | `4393402419` |
| RDC de referencia | https://multicaja-cloud.atlassian.net/wiki/spaces/bysf/pages/5167054860 |

## Patrones de pipelines Jenkins

| Ambiente | Tipo | Patrón URL |
|----------|------|-----------|
| QA | Microservicio deploy | `http://10.179.20.28:8080/job/qa-{nombre-componente}/` |
| QA | DB migrate-up | `http://10.179.20.28:8080/job/qa-db-mc-tlog-scripts-migrate-up/` |
| QA | DB rollback | `http://10.179.20.28:8080/view/DATABASE-QA/job/qa-db-mc-tlog-scripts-rollback/` |
| QA | Rollback microservicios | `http://10.179.20.28:8080/job/central-docker-rollback-qa/` |
| PROD | Microservicio deploy | `http://10.117.1.36:8080/job/prod-{nombre-componente}/` |
| PROD | DB migrate-up | `http://10.117.1.36:8080/job/prod-cd-backoffice-db-mc-tlog-scripts-migrate-up/` |
| PROD | DB rollback | `http://10.117.1.36:8080/job/prod-cd-backoffice-db-mc-tlog-scripts-rollback/` |
| PROD | Variables globales Jenkins | `http://10.117.1.36:8080/configure` |

Rollback microservicios: parámetros `NOMBRE_PIPELINE` + `ROLLBACK_VERSION`.
Rollback DB: parámetros `PROYECTO` + `CANTIDAD_DE_VECES`.

## Convenciones de nombres

| Campo | Convención |
|-------|-----------|
| Título página RDC | `[BYSF-XXX] Nombre del proyecto RDC R.M V{version} [{DD.MM.AA}]` |
| Nombre proyecto DB pipelines | `AAAAMMDD_nombre_corto_sin_espacios` (ej: `20260224_autoconfiguracion_itau`) |
| Pipeline QA microservicio | `qa-{nombre-repo-sin-prefijo-mcs-central-bysf-}` |
| Pipeline PROD microservicio | `prod-{nombre-repo-sin-prefijo-mcs-central-bysf-}` |

## Estructura del RDC — 21 secciones en orden

Replica **fielmente** el RDC de referencia (BYSF-956): mismo orden, paneles,
tablas y checkboxes. Solo cambian los datos del proyecto.

| # | Sección | Panel | Etapa | Descripción |
|---|---------|-------|-------|-------------|
| 1 | Detalles del Cambio | success | 1 | Link Jira issue |
| 2 | Descripción del Cambio | success | 1 | Área, líder, teléfono, descripción, solución, servicios/usuarios afectados, consecuencias, validador, plan validación |
| 3 | Requisitos Previos | info | 1 | Checkboxes Redes/Infra/BD + tabla BD crítica + tickets IT Service |
| 4 | Diagrama Técnico | note | 1 | Aplica/No + link |
| 5 | ¿Requiere Monitoreo? | info | 1 | Servicio nuevo/ya monitoreado + descripción |
| 6 | ¿Depreca componente? | note | 1 | Sí/No/No Aplica + nombre |
| 7 | Respaldo antes de eliminar | warning | 1 | Sí/No |
| 8 | Negocio | success | 1 | Impactado (PCI/Multiservicio/Verticales) + Ambiente |
| 9 | Sistema(s) Relacionado(s) | success | 1 | 18 categorías con subsistemas (ver lista abajo) |
| 10 | Horario de Ejecución | info | 1 | Sin restricción / Con restricción |
| 11 | Día y hora coordinada Deployment | info | 1 | Texto libre |
| 12 | Asistido | success | 1 | No Aplica/Semi/Asistido + responsable |
| 13 | Dependencia con otro RDC | success | 1 | Aplica/No + link |
| 14 | Cambio | success | 1 | Tipo + Urgencia + Categoría + Impacto + Prioridad |
| 15 | Programar Corte | warning | 1 | Aplica/No + impacto — comunicar 72h antes a comercios |
| 16 | Respaldos | note | 1 | App-Jar-War + BD-Esquema-Tabla-Funciones |
| 17 | PIM — Componentes de Software | note | 1→2 | Tabla Nro/Componente/Versión/Estado/Jenkins QA/Parámetros. Inicial: Pendiente → Certificado en etapa 2 |
| 18 | Despliegue QA | note (collapsible) | 1 | Historias a certificar + repos `qa/` + plan (microservicios+BD) + rollback QA |
| 19 | Despliegue Deployment | note (collapsible) | 2 | Repos `master/` + variables Jenkins PROD + plan PROD + rollback PROD + Kong |
| 20 | Plan de Mitigación CAB 2.0 | note | 1→2 | Responsable + casos de falla |
| 21 | Aprobaciones | info | 2 | Tabla Dueño Cambio/QA/DBA/Deployment |

### Lista de 18 categorías — Sistemas Relacionados

Copiar completa. Marcar `checked` los que aplican al proyecto.

```
1. Afiliacion y Contrato (1.1→1.10)
2. APM (2.1→2.13)
3. Boleta Electronica y Multiservicios (3.1→3.34)
4. Adquirencia E-Commerce (4.1→4.3)
5. E-Commerce-Checkout (5.1→5.9)
6. Servicios de Valor Agregado (6.1→6.3)
7. App Klap (7.1)
8. Web (8.1→8.3)
9. Facturacion y SSFF (9.1→9.18)
10. BO y Multiservicio Central (10.1→10.20)
11. Adquirencia Transaccional (11.1→11.9)
12. Adquirencia Clearing/RealNear (12.1→12.8)
13. Adquirencia H2H/SmartCell (13.1→13.3)
14. POS (14.1→14.6)
15. SmartVista (15.1→15.5)
16. Liquidaciones WEB (16.1)
17. Data Analytics (17.1→17.3)
18. OTI (18.1→18.4)
```

### Estados válidos para tabla PIM

`Pendiente` | `Error de Despliegue` | `Instalado en QA` | `Certificado` | `Listo para PROD`

## JSON de entrada (esqueleto — completar por proyecto)

```json
{
  "title": "[BYSF-XXX] Nombre — RDC R.M V.1 [DD.MM.AA]",
  "jira_issue": "https://multicaja-cloud.atlassian.net/browse/BYSF-XXX",
  "requisitos_previos": { "redes": false, "infraestructura": true, "bd_criticas": false },
  "diagrama_tecnico": { "aplica": false, "link": "" },
  "negocio": { "impactado": ["Multiservicio"], "ambiente": ["Producción"] },
  "sistemas_relacionados": ["10. BO y Multiservicio Central"],
  "cambio": { "tipo": ["Software", "Base de Datos"], "urgencia": "Normal", "categoria": "Proyecto", "impacto": "Bajo", "prioridad": "Alta" },
  "componentes": [{ "nro": 1, "nombre": "mcs-central-bysf-nombre-servicio", "version": "1.0.0", "estado": "Pendiente", "jenkins_qa_url": "http://10.179.20.28:8080/job/qa-nombre-servicio/" }],
  "despliegue_qa": {
    "repositorios_microservicios": ["https://bitbucket.org/multicaja-cloud/nombre-repo/src/qa/"],
    "plan_microservicios": [{ "nombre_pipeline": "qa-nombre-servicio", "version": "1.0.0", "url": "http://10.179.20.28:8080/job/qa-nombre-servicio/" }]
  },
  "despliegue_prod": {
    "repositorios_microservicios": ["https://bitbucket.org/multicaja-cloud/nombre-repo/src/master/"],
    "variables_jenkins": [{ "nombre": "DB_URL_SERVICIO", "valor": "<jdbc:postgresql://HOST_PROD:PUERTO/mc_tlog>" }],
    "plan_microservicios": [{ "nombre_pipeline": "prod-nombre-servicio", "version": "1.0.0", "url": "http://10.117.1.36:8080/job/prod-nombre-servicio/" }],
    "kong_configs": []
  },
  "aprobaciones": { "dueno_cambio": "", "qa": "", "dba": "", "deployment": "" }
}
```

## Instrucciones paso a paso

### ETAPA 1 — Crear el RDC al terminar el desarrollo

1. **Recopilar datos** de: Spec de Feature (descripción/solución/servicios), ADR (tipo de cambio), issues Jira (HUs del despliegue), ingeniero líder, componentes (nombres exactos + versiones), repos Bitbucket (`qa/`).
2. **Construir el JSON** completo.
3. **Crear la página en Confluence** (`cloudId`/`spaceId`/`parentId` de arriba, `contentFormat: html`) replicando fielmente la estructura de 21 secciones. Sección "Despliegue Deployment" queda con placeholders. PIM inicial: **Pendiente**.
4. **Despliegue en QA** — sin CAB.

### ETAPA 2 — Completar PROD y presentar al CAB

5. **Actualizar la página** (`updateConfluencePage`) al certificar QA: PIM → **Certificado**, completar "Despliegue Deployment" (repos `master/`, variables Jenkins PROD, plan y rollback PROD).
6. **Presentar al CAB** con el RDC completo.
7. **Checklist pre-PROD:**
   - [ ] Componentes PIM en "Certificado" o "Listo para PROD"
   - [ ] URLs pipelines PROD verificadas (10.117.1.36:8080)
   - [ ] Repos Bitbucket apuntan a `master/`
   - [ ] Variables Jenkins PROD completas
   - [ ] Rollback PROD documentado por componente
   - [ ] Aprobaciones firmadas
   - [ ] CAB aprobado

## Errores comunes

| Error | Solución |
|-------|----------|
| Solicitar CAB para despliegue QA | El CAB solo aplica a producción |
| Completar sección PROD antes de certificar QA | Se completa SOLO después de aprobar QA |
| Repos apuntan a rama incorrecta | Plan QA usa `qa/` — Plan PROD usa `master/` |
| URL pipeline incorrecta | QA: `10.179.20.28:8080` — PROD: `10.117.1.36:8080` |
| Estado PIM no reconocido | Valores exactos: ver "Estados válidos" arriba |
| Estructura del RDC diferente al template | Respetar orden y paneles del RDC de referencia BYSF-956 |
