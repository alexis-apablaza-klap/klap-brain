---
name: web-artifacts-builder
description: Construye un dashboard HTML autocontenido (CSP-safe, sin CDNs) desde un objeto de datos: graficos SVG inline (dona, gauges), KPIs y tablas. Usado por /auditoria; reutilizable en cualquier proyecto.
allowed-tools: Read, Write, Glob, Bash
---

# Web Artifacts Builder — Dashboards HTML autocontenidos

Genera **un unico archivo `.html` autocontenido** a partir de un objeto de datos.
Sirve para dashboards de resultados (auditorias, metricas, reportes) reutilizables
en cualquier proyecto. No requiere build, ni Node, ni Parcel, ni React: es HTML + CSS
+ JS **inline**.

## Cuando usar

- El dev (o otra skill, como `auditoria`) necesita visualizar datos como un
  dashboard: graficos arriba, detalle abajo.
- Se quiere un entregable portable que se abra en cualquier navegador sin servidor
  ni internet.

Para SPAs complejas con routing/estado usa el toolkit oficial React/Vite; aqui el
objetivo es un dashboard estatico de datos, y para eso este enfoque liviano es
superior.

## Reglas duras (no negociables)

1. **Autocontenido**: todo el CSS y JS va inline en el `.html`. Cero recursos
   externos: sin `<script src>`, sin `<link href>` a CDNs, sin fuentes remotas, sin
   imagenes por URL. Cualquier asset va como data URI.
2. **CSP-safe**: nada que dependa de red. Los graficos se dibujan con SVG generado
   por JS vanilla o SVG estatico; no uses librerias de charts por CDN.
3. **Datos incrustados**: serializa el objeto de datos como `const DATA = { ... }`
   en un `<script>` inline y renderiza desde ahi. Nunca hagas `fetch`.
4. **Responsive**: usa flex/grid con unidades relativas; `max-width:100%` en SVG;
   tablas anchas dentro de un contenedor con `overflow-x:auto` (el body nunca hace
   scroll horizontal).
5. **Accesible y sobrio** (evitar "AI slop"): fuente de sistema (no Inter por
   defecto), sin gradientes morados, sin esquinas uniformemente redondeadas
   exageradas. Contraste AA. Colores por significado, no decorativos.

## Paleta (tokens accesibles, semaforo por estado)

```
--ok:      #1a7f4b   (verde — PASSED/OK/APTO)
--warn:    #b26a00   (ambar — observaciones/medio)
--fail:    #c0392b   (rojo — FAILED/critico/NO APTO)
--info:    #2c5aa0   (azul — neutro/acento)
--ink:     #1c2024   (texto)
--muted:   #5b6470   (texto secundario)
--line:    #e3e6ea   (bordes)
--bg:      #f7f8fa   (fondo pagina)
--card:    #ffffff   (fondo tarjetas)
```

Severidades: CRITICO=`--fail`, ALTO=`#e06c1f`, MEDIO=`--warn`, BAJO=`--info`,
SUGERENCIA=`--muted`.

## Contrato de datos (generico)

La skill acepta un objeto con, al menos: un titulo, una fecha, un veredicto/estado
global, una lista de "gates"/indicadores con estado, metricas numericas con umbral,
conteos por categoria, y una lista de hallazgos/filas de detalle con su remediacion.
El caso `auditoria` usa exactamente el JSON de la seccion "Datos estructurados" de
`knowledge/auditoria/references/veredicto.md` (`verdict`, `gates[]`, `metrics{}`,
`findingsBySeverity{}`, `findings[]`, `blockers[]`).

## Que leer segun lo que necesites

| Necesito | Ver |
|---|---|
| Los helpers SVG listos para copiar (dona, gauge) | `references/graficos.md` |
| El esqueleto HTML completo, la estructura de secciones y el checklist final | `references/layout.md` |

## Procedimiento (resumen)

1. Recibe/arma el objeto de datos.
2. Parte del esqueleto de `layout.md` y reemplaza `__DATA__` por el JSON serializado
   (JSON valido, no JS con comentarios).
3. Ajusta titulos/secciones si el caso de uso no es una auditoria — el esqueleto es
   generico; cambia tarjetas de KPI y columnas de tabla, manteniendo las reglas
   duras de arriba.
4. Guarda el resultado con `Write` (destino por defecto: raiz del proyecto) e
   informa al dev donde quedo.

Checklist de verificacion antes de entregar: `references/layout.md` (seccion final).
