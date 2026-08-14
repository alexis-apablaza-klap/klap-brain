---
name: gobierno
description: Pipeline documental de gobierno técnico KLAP — HU (Jira/Confluence), CATI (comité de arquitectura) y RDC (registro de despliegue QA/PROD). Activar al crear una HU, preparar el CATI o generar el RDC.
---

# Gobierno técnico — HU · CATI · RDC

Router de 3 skills del **pipeline de gobierno** de una iniciativa — comités,
aprobaciones y documentos de despliegue. **No confundir con `../sdd/`**: ese
skill cubre las 5 fases de *código* (Explorar/Proponer/Validar/Implementar/
Verificar) de un microservicio ya con HU aprobada; este skill cubre los
artefactos organizacionales alrededor de esa misma iniciativa, en Jira y
Confluence.

## El pipeline completo

```
[gobierno: HU] → Spec de Feature → ADR → STRIDE → [gobierno: CATI] → sdd (código) → [gobierno: RDC Etapa 1] → QA → Certificación → [gobierno: RDC Etapa 2] → CAB → PROD
```

- **HU** (`references/hu-jira.md`) crea el issue Jira + página Confluence a partir de una conversación con el PO — es la fuente que **`sdd` Fase 1 luego consume** vía MCP Atlassian (issue key) para levantar contexto técnico. HU aquí = *crear* el artefacto; `sdd` Fase 1 = *leerlo*.
- **CATI** (`references/cati.md`) genera la presentación `.pptx` para el Comité de Arquitectura Técnica e Infraestructura, al cierre del diseño técnico y antes de iniciar `sdd`.
- **RDC** (`references/rdc.md`) genera/actualiza el Registro de Despliegue de Cambios en Confluence, en dos etapas: al terminar el desarrollo (plan QA) y al certificar QA (plan PROD + CAB).

## Cuándo leer cada reference

| Situación | Leer |
|---|---|
| PO pide crear una Historia de Usuario | `references/hu-jira.md` |
| Cerrar diseño técnico, preparar presentación para el comité CATI | `references/cati.md` |
| Terminar desarrollo (Etapa 1) o certificar QA (Etapa 2) de un despliegue | `references/rdc.md` |

## Dependencias externas

Los 3 requieren **MCP Atlassian** (Jira + Confluence) con acceso al cloud
`multicaja-cloud.atlassian.net`. CATI además requiere `pptxgenjs` instalado
globalmente (`npm install -g pptxgenjs`) — no es una dependencia del repo
(`package.json` de klap-brain se mantiene en 0 dependencias runtime), es una
herramienta externa que el script `scripts/generate-cati.js` invoca.

## Nota sobre datos internos en `rdc.md`

`references/rdc.md` incluye IPs de Jenkins e identificadores de Confluence
(`cloudId`, `spaceId`) reales del equipo — igual que `topology/topology.json`
ya incluye nombres de componentes, esquemas de BD y hosts de APIs externas.
Es aceptable en un repo **privado**; si este repo pasara a público, esos
datos deben salir a un archivo de configuración no commiteado.
