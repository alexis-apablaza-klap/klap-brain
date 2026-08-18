---
name: persistencia
description: Crear o mantener un XxxRepository con JdbcTemplate (ConstantsQuery, RowMapper, DataAccessException, auditoria, paginacion cursor). Usar antes de escribir acceso a datos en PostgreSQL.
---

# Persistencia — JdbcTemplate

## Cuando usar este skill

Al implementar acceso a datos en PostgreSQL Aurora para un `XxxRepository` de
cualquier dominio KLAP BYSF. Prohibido JPA/Hibernate — ver [reglas
DONT](../klap-standard/references/reglas-dont.md).

## Que leer

| Archivo | Contiene |
|---|---|
| `references/repository.md` | Template completo: `ConstantsQuery`, `XxxRepository` (`findById`/`insert`/`update`), `XxxRowMapper` en `mapper/`, `AuditoriaXxxRepository` |
| `references/paginacion.md` | Paginacion cursor-based para tablas grandes: query, metodo, validaciones de `pageSize` |
| `references/migraciones-dbmate.md` | Migraciones de esquema (`-- migrate:up`/`-- migrate:down`) para `contable`/`mc_tlog`: reversibilidad, indices, anti-patrones |

## Reglas propias de persistencia

No estan en `klap-standard` — son especificas de la capa de acceso a datos:

- Centralizar cada sentencia SQL como constante en `ConstantsQuery.XXX`; el repository solo referencia la constante, jamas la arma inline.
- Inyectar `JdbcTemplate`/`NamedParameterJdbcTemplate` por constructor.
- Envolver cualquier `DataAccessException` capturada en `XxxPersistenceException` antes de propagarla al service layer.
- `EmptyResultDataAccessException` en `queryForObject` no es un error de acceso a datos: capturarla aparte y retornar `Optional.empty()`.
- Separar `AuditoriaXxxRepository` del repository principal para trazar INSERT/UPDATE/DELETE.

## Ya cubierto en klap-standard — no repetir aqui

- Mandato de paginacion cursor-based en tablas grandes y prohibicion de `OFFSET/LIMIT`: [reglas DO](../klap-standard/references/reglas-do.md) / [reglas DONT](../klap-standard/references/reglas-dont.md).
- Umbral de extraccion de `RowMapper` a `mapper/` (20+ columnas o reutilizacion): reglas DO.
- Cache con TTL para datos de configuracion leidos frecuentemente: reglas DO.
- Naming de la clase (`XxxRepository`, `@Repository`) y metodos base (`findById`, `findAll`, `insert`, `update`): [naming](../klap-standard/references/naming.md).
- JavaDoc obligatorio en metodos publicos: naming.md.

## Naming adicional (no esta en naming.md)

| Operacion | Nombre |
|---|---|
| Paginacion cursor | `findByCursorAfter(Long lastId, int pageSize)` |
| Buscar por campo especifico | `findByNombreCampo(String valor)` |

## Anti-patrones especificos de persistencia

- SQL armado por concatenacion de Strings en el repository en vez de parametros nombrados (`:param`) — abre la puerta a inyeccion SQL.
- `RowMapper` anonimo inline en una entidad de 20+ columnas en vez de extraerlo a `mapper/`.
- Dejar que una `DataAccessException` generica suba sin envolver hasta el controller.

Los anti-patrones transversales (JPA/Hibernate, `OFFSET/LIMIT`, cache sin TTL)
estan en [reglas DONT](../klap-standard/references/reglas-dont.md).
