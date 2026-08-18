---
name: klap-standard
description: Arquitectura, naming, reglas DO/DONT y seguridad KLAP SVA. Usar antes de proponer paquetes, nombrar una clase, o validar un diseño contra el estandar. Fuente unica de estas reglas.
---

# Standard KLAP SVA

Fuente unica de las reglas globales del equipo. Otros skills (kafka-*, processor,
repository, http-cliente, testing, ...) enlazan a estas references en vez de
repetir su contenido — si necesitas citar una regla global, cita el archivo,
no copies el texto (lo verifica `npm run no-duplicate:check`).

## Cuando leer cada reference

| Situacion | Leer |
|---|---|
| Diseñar la arquitectura de un microservicio nuevo | `references/arquitectura.md` |
| Nombrar una clase/interfaz/DTO | `references/naming.md` |
| Validar un diseño o PR contra el estandar | `references/reglas-do.md` + `references/reglas-dont.md` |
| Definir logs de un componente | `references/logging.md` |
| Revisar seguridad (OWASP, CMF, secretos, PII) | `references/seguridad.md` |
| Confirmar version/piso de una libreria del stack | `references/stack.md` (indice) → `references/stack-java.md` / `references/stack-npm.md` (detalle) |

## Resumen de una linea por reference

- **arquitectura.md** — capas (Kafka Input → Orchestration → Domain/Repository/Client → Infra), 7 principios, estructura de paquetes `global/` vs `dominio/{nombre}/`.
- **naming.md** — tabla de patrones de nombre por tipo de componente (Service, Repository, Listener, Client, Config, DTO, Entity).
- **reglas-do.md** — 21 practicas obligatorias (JdbcTemplate, JavaDoc, cobertura 95%, `max.poll.records=1`, `enable.metrics.push=false`, cursor pagination, etc).
- **reglas-dont.md** — 13 anti-patrones prohibidos (JPA/Hibernate, OFFSET/LIMIT en tablas grandes, bypass del service layer, cache sin TTL, etc).
- **logging.md** — niveles (ERROR/WARN/INFO/DEBUG), contexto obligatorio (`idProceso`, `codigoSucursal`).
- **seguridad.md** — OWASP Top 10, cumplimiento CMF, masking de PII/PAN, gestion de secretos, Virtual Threads.
- **stack.md** — indice de pisos de version por ecosistema (Java, npm-Angular, npm-Lambda), con `required`/`recommended`. `stack.yml` es la fuente machine-readable; `npm run versions:check` escanea repos reales (`build.gradle`/`package.json`) contra ella — ya no compara el corpus contra si mismo.

## Regla de oro

Si vas a escribir una frase que ya existe en uno de estos archivos, **enlaza el
archivo, no la repitas**. El ecosistema anterior repetia la regla de JavaDoc en
~16 lugares y `enable.metrics.push=false` en 15 — la duplicacion diluye la
atencion del modelo hasta que las reglas que importan se pierden en el ruido.
