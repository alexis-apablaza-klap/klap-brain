# HU — Creación de Historia de Usuario en Jira/Confluence

Router: `../SKILL.md`. Este paso **crea** el artefacto que `../../sdd/references/fase1-3-nuevo.md`
luego **consume** como fuente de contexto (issue key de Jira) — no lo reemplaza.

## Prerequisitos — preguntar siempre antes de comenzar

| Dato | Por qué se necesita |
|------|-------------------|
| **Proyecto Jira** | Las HU no son solo del proyecto BYSF — pueden ser de cualquier proyecto. El PO lo indica. |
| **Épica GOBI** | Toda HU debe vincularse a una épica de Gobierno de Iniciativas. Pedir el código (ej: GOBI-1076). |
| **spaceId Confluence** | Los artefactos se crean en el espacio del equipo dueño del proyecto, no siempre en bysf. |

## Infraestructura de referencia (bysf)

```
cloudId:              db4dd528-0e0b-4bdf-b3dd-1e2e4e792a43
Template HU pageId:   5465145369
URL template:         https://multicaja-cloud.atlassian.net/wiki/spaces/bysf/pages/5465145369
```

Para otros espacios, obtener el `spaceId` del equipo correspondiente.

## Paso 1 — Elicitación guiada con DOR integrado

Dos niveles simultáneos en una conversación con el PO. No hacer todas las
preguntas de golpe — ir por bloques temáticos y adaptar según las respuestas.

### Nivel 1 — Criterios INVEST (DOR)

| Criterio | Pregunta al PO |
|----------|---------------|
| **I** — Independiente | ¿Esta historia puede desarrollarse sin depender de otra que no esté terminada? |
| **N** — Negociable | ¿El "cómo" está sin definir, dejando libertad al equipo técnico para elegir la solución? |
| **V** — Valor | ¿Qué valor concreto aporta y a quién? ¿Alto / Medio / Bajo? |
| **E** — Estimable | ¿El equipo tiene suficiente información para estimar el esfuerzo? |
| **S** — Small | ¿Cabe en un sprint? (referencia: menos de 13 puntos) Si no, ¿podemos dividirla? |
| **T** — Testeable | ¿Podemos verificar que está lista con criterios de aceptación Dado/Cuando/Entonces? |

### Nivel 2 — Extensibilidad y modelo de negocio

Estas preguntas son críticas: el modelo de negocio determina el
comportamiento del sistema, que determina los criterios de aceptación. Sus
respuestas se convierten directamente en CA de la HU y en contexto de diseño
para `sdd` Fase 2.

```
¿Este requerimiento aplica solo a este caso específico,
o puede extenderse a otros actores / clientes / bancos / negocios en el futuro?

¿El volumen de datos o transacciones puede escalar significativamente?

¿Hay variantes de comportamiento previsibles según el tipo de usuario o contexto?

¿El sistema debe soportar múltiples instancias o ser multi-tenant?
```

## Paso 2 — Construir el JSON de datos

```json
{
  "proyecto_jira": "BYSF",
  "epica_gobi": "GOBI-XXXX",
  "space_id_confluence": "2478211099",
  "titulo": "[PROYECTO-XXX] Nombre descriptivo de la historia",
  "necesidad_negocio": "Descripción del contexto de negocio.",
  "hu": { "rol": "rol del usuario o sistema", "necesita": "acción concreta", "para": "beneficio esperado" },
  "criterios_aceptacion": [
    { "nro": 1, "escenario": "Escenario principal", "dado_que": "...", "cuando": "...", "entonces": "..." },
    { "nro": 2, "escenario": "Escenario alternativo", "dado_que": "...", "cuando": "...", "entonces": "..." },
    { "nro": 3, "escenario": "Error o borde — incluir uno por extensibilidad si aplica", "dado_que": "...", "cuando": "...", "entonces": "..." }
  ],
  "tareas_notas": [{ "tarea": "...", "detalle": "..." }],
  "mock": { "link": "", "estado": "Pendiente" },
  "extensibilidad": "Resumen de las respuestas del PO sobre el alcance futuro.",
  "valor": "Alto | Medio | Bajo",
  "invest_cumplido": true
}
```

## Paso 3 — Crear el issue en Jira (MCP Atlassian)

```
project:     {proyecto_jira}
issuetype:   Historia (o Story)
summary:     {titulo}
description: ADF con: Necesidad de Negocio / Como-Necesito-Para / Criterios
             de Aceptación (Dado/Cuando/Entonces) / Extensibilidad
parent/epic: {epica_gobi}
labels:      ["SDD", "lean"]
```

**Convención de identificadores:** criterios de aceptación `CA-01`, `CA-02`...;
casos límite `CL-01`, `CL-02`... — los mismos identificadores que `sdd` usa
para trazabilidad de tests en Fase 3/5.

## Paso 4 — Crear la página en Confluence

```
cloudId:       db4dd528-0e0b-4bdf-b3dd-1e2e4e792a43  (o el del equipo)
spaceId:       {space_id_confluence}
parentId:      ID de la carpeta SDD del equipo (preguntar si no se conoce)
contentFormat: html
title:         {titulo}
```

Estructura de la página (secciones en este orden): Necesidad de Negocio → HU
(Como/Necesito/Para, tabla) → Criterios de Aceptación (tabla N°/Escenario/
Dado/Cuando/Entonces) → Tareas/Notas → Mock/Prototipo (estado `Pendiente`) →
Contexto de Extensibilidad → Vinculaciones (issue Jira, épica GOBI, Spec y
ADR marcados "Pendiente — se vincula en Etapa 2") → Estado (`Borrador` →
`En refinamiento` → `Lista para sprint` → `Bloqueada`).

## Paso 5 — Vincular Jira ↔ Confluence

Tras crear la página, actualizar el issue Jira con su URL.

## Paso 6 — Verificación DOR antes de cerrar

```
[ ] I/N/V/E/S/T cumplidos (ver Nivel 1)
[ ] Extensibilidad documentada
[ ] Issue Jira creado y vinculado a la épica GOBI
[ ] Página Confluence creada y vinculada al issue Jira
```

Si algún ítem falla, iterar con el PO antes de avanzar.

## Salidas

| Artefacto | Ubicación |
|-----------|-----------|
| Issue HU | Jira — proyecto indicado por el PO, vinculado a épica GOBI, con CA-XX/CL-XX |
| Página HU | Confluence — espacio del equipo dueño, vinculada al issue |
| `requerimientos-del-negocio.md` (opcional) | Raíz del repo del componente — espejo local de la elicitación (resumen, CA, casos límite, reglas de negocio, dudas abiertas) para que `sdd` Fase 1 lo lea sin volver a golpear Jira/Confluence en cada sesión |

## Errores comunes

| Error | Solución |
|-------|----------|
| Crear la HU siempre en el proyecto BYSF | Siempre preguntar al PO en qué proyecto crear |
| No vincular a la épica GOBI | Es obligatorio — bloquearse hasta obtenerla si el PO no la tiene |
| CA sin Dado/Cuando/Entonces completo | No avanzar hasta que los tres campos estén definidos |
| Saltarse el Nivel 2 (extensibilidad) | Es obligatorio — define el diseño técnico de `sdd` Fase 2 |
| Página Confluence en espacio incorrecto | Preguntar el spaceId si no es inferible del proyecto Jira |
