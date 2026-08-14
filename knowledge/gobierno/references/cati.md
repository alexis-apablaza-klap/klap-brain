# CATI — Presentación para el Comité de Arquitectura Técnica e Infraestructura

Router: `../SKILL.md`. El CATI se genera **al final del diseño técnico**,
antes de iniciar `../../sdd/`:

```
HU (../hu-jira.md) → Spec de Feature → ADR → STRIDE → [CATI] → sdd (código)
```

Artefactos que deben existir antes de generar el CATI:
- [ ] Spec de Feature aprobada (Confluence)
- [ ] ADR(s) redactado(s)
- [ ] Evaluación STRIDE completada
- [ ] Diagramas técnicos exportados (contexto, secuencia, flujo, infraestructura)
- [ ] Estimación de costos de infraestructura AWS

## Estructura de la presentación (14 slides)

| Slide | Contenido |
|-------|-----------|
| 1 | Portada: proyecto, célula, fecha |
| 2 | Agenda |
| 3 | Propuesta de valor y beneficios |
| 4 | Alcance de la iniciativa |
| 5 | Diagrama de Contexto |
| 6 | Diagrama de Secuencia — Proceso Diario/Online |
| 7 | Diagrama de Secuencia — Proceso Batch/Mensual |
| 8 | Diagrama de Flujo |
| 9 | Diagrama de Infraestructura (AWS) |
| 10 | Costos de Infraestructura |
| 12–13 | Requerimientos No Funcionales (tabla) |
| 14 | Cierre |

## Paso 1 — Recopilar datos y construir `cati_data.json`

```json
{
  "project_name": "Nombre del Proyecto",
  "date": "DD de Mes del AAAA",
  "squad": "BO y Servicios Financieros",
  "jira_epic": "BYSF-XXX",
  "agenda": ["ítem 1", "ítem 2"],
  "value_proposition": { "summary": "...", "benefits": ["...", "..."] },
  "scope": { "description": "..." },
  "diagrams": {
    "context": "ruta/al/archivo.png",
    "sequence_daily": "ruta/al/archivo.png",
    "sequence_monthly": "ruta/al/archivo.png",
    "flow": "ruta/al/archivo.png",
    "infrastructure": "ruta/al/archivo.png"
  },
  "infrastructure_costs": [{ "service": "ECS (Fargate)", "type": "Cómputo", "spec": "2 vCPU, 4GB x 3", "monthly_cost_usd": "180" }],
  "infrastructure_total_usd": "805",
  "nfr": [{ "category": "Disponibilidad", "req": "SLA del servicio", "value": "99.9% uptime mensual", "applies": true, "status": "Pendiente" }]
}
```

**Categorías válidas de NFR:** `Disponibilidad`, `Rendimiento`, `Seguridad`, `Escalabilidad`, `Monitoreo`, `Otros`.

**Fuentes:** `project_name`/`value_proposition`/`scope` desde la Spec de
Feature; decisiones técnicas desde los ADR; amenazas desde la evaluación
STRIDE; costos desde la estimación AWS.

## Paso 2 — Diagramas

Si `diagrams.{key}` apunta a un archivo de imagen real (PNG/JPG) que existe
en disco, el generador lo inserta directamente en el slide. Si el campo
queda vacío o la ruta no existe, el slide muestra un placeholder
("📌 Insertar diagrama aquí") — no falla la generación.

## Paso 3 — Ejecutar el generador

```bash
npm install -g pptxgenjs   # solo la primera vez — herramienta externa, no dependencia del repo
node scripts/generate-cati.js --data cati_data.json --output CATI_NombreProyecto.pptx
node scripts/generate-cati.js --template --output CATI_TEMPLATE.pptx   # template vacío
```

## Paso 4 — Validar el output

No hay herramienta de extracción de texto ni de miniaturas instalada en
este repo. Verificar abriendo el `.pptx` generado (PowerPoint, LibreOffice
Impress, o Google Slides) y revisando:

- [ ] Nombre del proyecto y fecha correctos en portada
- [ ] Costos coherentes con la estimación aprobada
- [ ] NFR con `value` completado (no dice "[ completar ]")
- [ ] Diagramas insertados como imagen real (no el placeholder "📌")
- [ ] 14 slides en total

## Paso 5 — Subir a Confluence (opcional)

Adjuntar el `.pptx` generado como attachment en la página de la Spec de
Feature, vía MCP Atlassian.

## Checklist antes de presentar al CATI

- [ ] Spec de Feature aprobada y vinculada
- [ ] Todos los diagramas insertados (no placeholders)
- [ ] Costos de infraestructura validados
- [ ] NFR completos (sin "Pendiente" en Estado)
- [ ] Evaluación STRIDE y ADR(s) vinculados
- [ ] Revisado por el ingeniero líder y el PO

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Cannot find module 'pptxgenjs'` | No instalado | `npm install -g pptxgenjs` |
| `ENOENT: cati_data.json` | Archivo no existe | Crear el JSON con los datos del proyecto |
| Placeholders en el output | Campos sin completar en el JSON | Completar todos los campos |
| Diagramas en blanco | Ruta en `diagrams.*` incorrecta o archivo inexistente | Verificar que el archivo exista en esa ruta |

## Paleta de colores Klap

| Color | Hex | Uso |
|-------|-----|-----|
| Navy | `#002B49` | Fondo portada, headers |
| Verde | `#26D07C` | Acento, logo "lap" |
| Blanco | `#FFFFFF` | Fondo contenido |
| Gris claro | `#F4F6F8` | Fondo alternativo |
| Gris texto | `#5A6A7A` | Texto secundario |
