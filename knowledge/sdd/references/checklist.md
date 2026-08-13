# Checklist SDD — gates por fase

Consultar al cerrar cada fase del SDD (nuevo o refactor) — marcar cada ítem
antes de declarar la fase completada. No repite las reglas globales del
equipo (ver `../../klap-standard/`): aquí solo se verifica que se aplicaron.

## Fase 1 — Explorar / Analizar

- [ ] Responsabilidad del microservicio identificada
- [ ] `klap ctx <producto>` corrido — huecos revisados con el dev si hay alguno relevante para esta tarea
- [ ] Topics Kafka involucrados identificados (input, output, DLQ, notificación)
- [ ] Tablas PostgreSQL involucradas identificadas
- [ ] Servicios externos consumidos identificados (RestClient)
- [ ] Componentes a crear/modificar listados

## Fase 2 — Proponer

- [ ] Estructura de paquetes explícita (`global/` vs `dominio/`) — ver `../../klap-standard/references/arquitectura.md`
- [ ] Interfaces (`XxxService`, `XxxProcessor`) separadas de implementaciones (`XxxServiceImpl`, `XxxProcessorImpl`)
- [ ] Cada decisión de diseño no trivial justificada
- [ ] La propuesta no contradice conocimiento funcional ya registrado (`klap ctx`)

## Fase 3 — Validar

- [ ] `JdbcTemplate`, no JPA — ver `../../klap-standard/references/reglas-dont.md`
- [ ] `XxxKafkaConfig` extiende la clase base, no duplica lógica — ver `../kafka/references/config.md`
- [ ] `enable.metrics.push=false` y `max.poll.records=1` presentes en la config Kafka
- [ ] Naming validado — ver `../../klap-standard/references/naming.md`
- [ ] SQL en `ConstantsQuery`, nunca hardcodeado — ver `../persistencia/references/repository.md`
- [ ] Paginación cursor-based si la tabla supera 500 registros
- [ ] `ErrorHandlingDeserializer` como wrapper en la config del consumer

## Fase 4 — Implementar

- [ ] Skill file correspondiente leído antes de generar código — tabla en `../SKILL.md`
- [ ] JavaDoc en todos los métodos públicos
- [ ] Logging incluye `idProceso` y `codigoSucursal`
- [ ] Errores clasificados: determinista → DLQ manual; infraestructura → re-throw
- [ ] Cache con TTL en repositorio si aplica

## Fase 5 — Verificar

- [ ] Cobertura ≥ 95% (JaCoCo)
- [ ] Tests siguen AAA — ver `../testing/references/mockito.md`
- [ ] `MockWebServer` para tests de `XxxClient` — ver `../testing/references/mockwebserver.md`
- [ ] Tests de Processor cubren: flujo exitoso, error determinista, error de infraestructura
- [ ] `defectos-tipicos.md`: las 6 categorías verificadas

## Resultado

- [ ] ✅ Todas las fases completadas — implementación lista para revisión
- [ ] ⚠️ Correcciones pendientes antes de declarar completado
