---
name: code-review-expert
description: Revisión de código exhaustiva por 10 dimensiones (arquitectura, calidad, errores, testing, seguridad OWASP, performance, config, observabilidad, docs, Kafka). Usar cuando el dev pide un code review.
---

# Code Review Expert

Rol: ingeniero senior revisando el código con rigor y de forma constructiva
— referencia soluciones concretas, no solo señala problemas. Las reglas
KLAP-específicas (cobertura, stack, DO/DONT) **no se repiten aquí** — ver
`../klap-standard/` y `../testing/`; este skill aporta la metodología y el
formato del entregable.

## PASO 1 — Contexto (preguntar antes de revisar)

1. Propósito y dominio de negocio del proyecto
2. HU o ticket de referencia
3. Tecnologías principales (si difieren del stack KLAP estándar)
4. Tipo de aplicación (microservicio, batch, frontend, evento-driven)
5. Alcance del review: ¿todo el proyecto o módulos específicos?
6. ¿Informe completo además del de hallazgos? (Sí/No)

## PASO 2 — Dimensiones de análisis

| Dimensión | Qué mirar | Fuente KLAP-específica |
|---|---|---|
| A. Arquitectura | Separación de capas, SRP, inversión de dependencias | `../klap-standard/references/arquitectura.md` |
| B. Calidad | SOLID, code smells (God Class, duplicación, Magic Numbers), CC < 10 | `../klap-standard/references/naming.md` |
| C. Manejo de errores | Jerarquía de excepciones, logging sin exponer datos sensibles | `../excepciones/references/jerarquia.md` |
| D. Testing | Cobertura y stack de test | `../testing/SKILL.md` (JUnit5/Mockito/AssertJ/MockWebServer/Kafka — NO Testcontainers/WireMock/EmbeddedKafka) |
| E. Seguridad (OWASP) | Secrets, validación de inputs, inyección | `../klap-standard/references/seguridad.md` |
| F. Performance | N+1, paginación, timeouts, caché con TTL | `../klap-standard/references/reglas-do.md` (#14) |
| G. Configuración | Perfiles por ambiente, health checks | `../klap-standard/references/arquitectura.md` |
| H. Observabilidad | Niveles de log, correlation IDs | `../klap-standard/references/logging.md` |
| I. Documentación | JavaDoc en métodos públicos, OpenAPI | `../klap-standard/references/naming.md`, `../openapi/SKILL.md` |
| J. Kafka (si aplica) | Config/listener/DLQ | `../kafka/SKILL.md`, o auditoría completa con `../kafka-audit/SKILL.md` |

No reevaluar de cero lo que ya tiene un gate dedicado: si el proyecto usa
Kafka, delegar el detalle de esa dimensión a `kafka-audit` en vez de
duplicar sus checks aquí.

## PASO 3 — Archivo de hallazgos (siempre)

`code-review-hallazgos-{proyecto}-{YYYY-MM-DD}.md`:

```markdown
# Hallazgos y acciones requeridas — {PROYECTO}

**Estado general:** APROBADO / APROBAR CON OBSERVACIONES / REQUIERE CAMBIOS

## Resumen
| Severidad | Cantidad |
|---|---|
| CRITICO | X |
| ALTO | X |
| MEDIO | X |
| BAJO | X |
| SUGERENCIA | X |

## [CRITICO-001] {Título}
**Archivo:** `{ruta}:{línea}` · **Dimensión:** {A-J}
**Problema:** {qué pasa} — **Impacto:** {consecuencia}
**Código actual → Solución propuesta** (bloques de código)
**Justificación:** {por qué corregirlo}

(repetir por severidad: ALTO, MEDIO, BAJO, SUGERENCIA)

## Checklist de correcciones
- [ ] [CRITICO-001] ... (bloquea merge)
- [ ] [ALTO-001] ... (bloquea release)
```

Severidad alineada a `../auditoria/references/veredicto.md` (CRITICO/ALTO/
MEDIO/BAJO) — no una escala propia.

## PASO 4 — Informe completo (solo si el dev lo pidió)

`code-review-{proyecto}-{YYYY-MM-DD}.md`: agrega funcionalidades validadas
(tabla ID/Función/Resultado/Evidencia), fortalezas identificadas, calificación
1-10 y veredicto final (APROBAR / APROBAR CON OBSERVACIONES / RECHAZAR).

## Qué incluir

Defectos críticos, vulnerabilidades y violaciones SOLID/DO-DONT: siempre.
Aspectos positivos: solo en el informe completo (Paso 4), nunca en el de
hallazgos.

## Principios del revisor

Referenciar archivo/línea/método concreto en cada hallazgo. Proponer la
solución, no solo señalar el problema. Explicar el porqué de cada cambio.
