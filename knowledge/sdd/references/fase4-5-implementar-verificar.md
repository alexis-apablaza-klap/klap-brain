# Fases 4-5 — Implementar y Verificar (SDD)

Cubre Fase 4 (Implementar/TDD), Fase 4.5 (Security Gate) y Fase 5 (Verificar). Aplica igual para desarrollo nuevo (`fase1-3-nuevo.md`) y para refactor (`fase1-3-refactor.md`) — el ciclo de implementación no distingue el origen del plan.

**Input:** `spec/*-spec.md` (o `*-refactor-spec.md`) + `spec/*-plan.md` (o `*-refactor-plan.md`), ya aprobados en Fase 3.

## Activación

Al iniciar la implementación, buscar en `spec/` el par de archivos spec+plan del proyecto:

| Situación | Acción |
|-----------|--------|
| Un par de archivos encontrado | Continuar con esos archivos |
| Más de un par encontrado | Preguntar al dev cuál ejecutar |
| Ningún archivo encontrado | Informar que debe completarse Fase 1-3 primero |
| Plan con tareas `[x]` o `[!]` | Modo reanudación — continuar desde la primera tarea incompleta |

## Estado de cada tarea en `spec/*-plan.md`

| Marca | Estado | Significado |
|-------|--------|-------------|
| `[ ]` | pendiente | Tarea no iniciada |
| `[>]` | en-progreso | Tarea actualmente en ejecución |
| `[x]` | completada | Tarea terminada exitosamente |
| `[!]` | bloqueada | Tarea no pudo completarse — ver detalle en informe de bloqueo |

Protocolo por tarea: marcar `[>]` antes de empezar → ejecutar la implementación → éxito marca `[x]`, fallo marca `[!]` con el motivo registrado en el plan.

Al inicio del primer ciclo, agregar al final de `spec/*-plan.md` una tabla de seguimiento:

```markdown
## Estado de implementación

| Iteración | Security Gate | Fase 5 | Resultado |
|-----------|--------------|--------|-----------|
| 1/5       | pendiente    | pendiente | — |
```

Esta tabla se actualiza al finalizar cada fase del ciclo.

## Reanudación tras interrupción

Al detectar tareas `[x]` o `[>]` en el plan:

1. Construir el mapa de estado de todas las tareas leyendo `spec/*-plan.md`
2. `[x]` → omitir, ya completadas
3. `[>]` → re-ejecutar desde cero (la interrupción puede haber dejado código incompleto)
4. `[ ]` → ejecutar normalmente
5. `[!]` → omitir, están bloqueadas — el informe de bloqueo ya las documenta
6. Leer la sección **Estado de implementación** para saber en qué iteración del ciclo se estaba
7. Continuar desde el punto de interrupción sin preguntar al dev

## Flujo general

```
Leer spec/*-spec.md + spec/*-plan.md
    ↓
¿Hay tareas [x] o [>]? → modo reanudación (saltar completadas)
    ↓
Fase 4 — Implementar
    → Agrupar tareas pendientes por nivel de dependencia
    → Por nivel: marcar [>] → implementar (Red-Green-Refactor) → marcar [x] (o [!] si falla)
    → Repetir hasta completar todos los niveles
    ↓
┌── Ciclo (máx. 5 iteraciones) ──────────────────────────┐
│  Registrar iteración actual en "Estado de impl."       │
│                                                          │
│  Fase 4.5 — Security Gate                               │
│      CRITICAL/HIGH/MEDIUM → vuelve a Fase 4             │
│      Sin CRITICAL/HIGH/MEDIUM → avanza                  │
│          ↓                                              │
│  Fase 5 — Verificar                                     │
│      Cobertura < 95% o tests en rojo → vuelve a Fase 4 │
│      Cobertura ≥ 95% y tests 100% verde → completo      │
└───────────────────────────────────────────────────────────┘
    ↓ (si 5 iteraciones sin éxito)
Informe de bloqueo → fin, con pendientes documentados en plan.md
```

## Reglas de ejecución de tareas

Las tareas del `*-plan.md` se agrupan por niveles de dependencia:

- Las tareas del mismo nivel se implementan en paralelo entre sí.
- No se inicia el nivel siguiente hasta que todas las tareas del nivel anterior estén `[x]`.
- Si una tarea queda `[!]` bloqueada, las tareas del nivel siguiente que dependan de ella también se marcan `[!]`.
- Dentro de cada tarea se sigue el ciclo **Red → Green → Refactor**.
- El agente lee el skill file correspondiente **antes** de generar el código — tabla consolidada en `../SKILL.md`.

**Ejemplo de ejecución por niveles:**
```
Nivel 1: T-01 [ ], T-02 [ ], T-03 [ ]  → en paralelo → T-01 [x], T-02 [x], T-03 [x]
Nivel 2: T-04 [ ], T-05 [ ]             → en paralelo → T-04 [x], T-05 [x]
Nivel 3: T-06 [ ]                       → secuencial  → T-06 [x]
```

## Reglas del ciclo 4 → 4.5 → 5

### Criterios de éxito

El ciclo se considera exitoso cuando se cumplen **ambas** condiciones:
- Cobertura de tests unitarios **≥ 95%** (JaCoCo)
- **Cero** findings CRITICAL, HIGH o MEDIUM en el Security Gate

### Límite de iteraciones

- **Máximo 5 iteraciones** del ciclo completo.
- Cada iteración queda registrada en la tabla **Estado de implementación** del plan.
- Al superar 5 iteraciones se genera un **informe de bloqueo** y el workflow termina.

### Informe de bloqueo (tras 5 iteraciones sin éxito)

Se agrega al final de `spec/*-plan.md`:

- [ ] Tabla de iteraciones con lo que se intentó y el resultado de cada una
- [ ] Tests que no alcanzaron el 95%: clase, método y porcentaje actual
- [ ] Findings de seguridad no resueltos: CWE, severidad, clase afectada y motivo
- [ ] Recomendación de routing: bloqueo por diseño → rutear a Fase 2 (`fase1-3-nuevo.md` o `fase1-3-refactor.md`); deuda técnica aceptable → documentar como observación para el dev

## Cambios de scope durante implementación

| Tipo de cambio | Acción |
|----------------|--------|
| Cambio de requisito o diseño arquitectónico | Marcar tareas afectadas como `[ ]` → dev actualiza el spec → relanzar la implementación |
| Nuevo CA o CL detectado | Marcar tareas afectadas como `[ ]` → dev actualiza ambos spec → relanzar |
| Ajuste menor de naming o reorganización de tareas | El agente propone el ajuste, espera confirmación del dev y continúa |
| Tarea más compleja de lo estimado (S→M o M→L) | El agente informa al dev, re-estima y continúa |

---

## Fase 4 — Implementar

**Agente:** `tdd-implementer` · **Modelo:** sonnet · **Unidad:** una tarea a la vez

Leer el skill file correspondiente al tipo de componente **antes** de generar el código — tabla consolidada en `../SKILL.md` (no repetida aquí).

### Entregable obligatorio por tarea

- [ ] Tarea marcada `[>]` en `spec/*-plan.md` antes de iniciar
- [ ] Test en rojo primero (Red)
- [ ] Implementación mínima que hace pasar el test (Green)
- [ ] Refactor sin romper tests (Refactor)
- [ ] JavaDoc y naming conventions aplicados — ver `../../klap-standard/references/naming.md`
- [ ] Sin placeholders ni TODOs sin reportar al dev
- [ ] Autocheck de calidad al finalizar
- [ ] Tarea marcada `[x]` en `spec/*-plan.md` al completar

---

## Fase 4.5 — Security Gate

**Agente:** `static-security-auditor` · **Modelo:** opus · **Unidad:** una vez por iteración del ciclo

### Entregable obligatorio

- [ ] Análisis estático sobre todo el código generado en Fase 4
- [ ] OWASP Top 10 (2021): A01–A10
- [ ] Amenazas de stack: SSRF (CWE-918), Kafka deserialization (CWE-502), SpEL (CWE-917), Mass Assignment (CWE-915), Actuator (CWE-200)
- [ ] NIST SP 800-53: AC-3, AU-3, SC-8
- [ ] MITRE ATT&CK: T1190, T1552, T1059 descartadas
- [ ] Findings clasificados: CRITICAL / HIGH / MEDIUM / LOW
- [ ] Resultado registrado en la tabla **Estado de implementación** del plan

### Criterio de avance

| Resultado | Acción |
|-----------|--------|
| Findings CRITICAL o HIGH | Bloquea → Fase 4 con CWE, categoría OWASP y remediación |
| Findings MEDIUM | Bloquea → Fase 4 con detalle del finding |
| Solo LOW o ninguno | Avanza a Fase 5 |

---

## Fase 5 — Verificar

**Agente:** `sdd-validator` · **Modelo:** sonnet · **Unidad:** una vez por iteración del ciclo

### Entregable obligatorio

- [ ] Cobertura de cada `CA-XX` con su test
- [ ] Cobertura de cada `CL-XX` con su test
- [ ] Tests unitarios 100% verde (`./gradlew test`)
- [ ] Tests de integración 100% verde (`./gradlew verify`)
- [ ] Cobertura ≥ 95% verificada con JaCoCo
- [ ] JavaDoc completo en métodos públicos
- [ ] Naming conventions verificadas
- [ ] Reglas DO/DON'T re-chequeadas contra el gate de `checklist.md`
- [ ] `defectos-tipicos.md`: las 6 categorías resueltas en la implementación
- [ ] Resultado registrado en la tabla **Estado de implementación** del plan

### Criterio de avance

| Resultado | Acción |
|-----------|--------|
| Tests en rojo | Bloquea → Fase 4 con test, assertion y stacktrace |
| Cobertura < 95% | Bloquea → Fase 4 con clases y métodos sin cubrir |
| Test de integración falla por contrato | Bloquea → Fase 2 (`fase1-3-nuevo.md` o `fase1-3-refactor.md`) con error y stacktrace |
| Todo verde + cobertura ≥ 95% | ✅ Implementación verificada |

---

## Matriz de routing de defectos

| Tipo de defecto | Destino | Contexto requerido |
|-----------------|---------|---------------------|
| Calidad de código, JavaDoc, naming, lógica | Fase 4 | Archivo, método, descripción |
| Test unitario falla | Fase 4 | Nombre del test, assertion, stacktrace |
| Cobertura < 95% | Fase 4 | Clases y métodos sin cubrir |
| Finding CRITICAL/HIGH/MEDIUM | Fase 4 | CWE, OWASP, MITRE ATT&CK, remediación |
| Test de integración falla por contrato/infraestructura | Fase 2 | Test, error de conexión/contrato, stacktrace |
| Finding por diseño arquitectónico | Fase 2 | CWE, descripción del problema de diseño |
| Cambio de requisito detectado | Fase 1-3 completa | Descripción del gap |

Al rutear un defecto a una fase anterior, se re-ejecutan todas las fases posteriores a la fase corregida.
