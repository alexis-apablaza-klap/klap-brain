# Paginacion cursor-based — tablas grandes

Router y reglas: [SKILL.md](../SKILL.md). El mandato de usar cursor en vez de
`OFFSET/LIMIT` ya esta en [reglas DO](../klap-standard/references/reglas-do.md)
y [reglas DONT](../klap-standard/references/reglas-dont.md) — este archivo cubre
solo el patron de implementacion.

## Por que cursor y no OFFSET

`OFFSET n` obliga al motor a recorrer y descartar las primeras `n` filas antes
de devolver la pagina — el costo crece de forma lineal con la profundidad de la
pagina. `WHERE id > :lastId` en cambio hace un seek directo sobre el indice de
la primary key: el costo es constante sin importar cuantas paginas se hayan
recorrido antes.

## Constante en `ConstantsQuery`

Se agrega junto al resto de queries del dominio (ver [repository.md](repository.md)):

```java
/**
 * Paginación cursor-based: trae la siguiente página desde lastId.
 * Uso: {@code findByCursorAfter(lastId, pageSize)}.
 */
public static final String FIND_BY_CURSOR_AFTER =
        "SELECT id, columna_a, columna_b, created_at, updated_at " +
        "FROM esquema.tabla " +
        "WHERE id > :lastId " +
        "ORDER BY id " +
        "LIMIT :pageSize";
```

## Metodo en el repository

Se agrega a `LiquidacionRepository` (ver [repository.md](repository.md) para
la clase completa):

```java
/**
 * Recupera una página de liquidaciones usando cursor-based pagination.
 * Más eficiente que OFFSET en tablas grandes porque usa el índice de id directamente.
 *
 * @param lastId   id del último elemento de la página anterior (0 para la primera página)
 * @param pageSize cantidad máxima de registros a retornar
 * @return lista de liquidaciones ordenadas por id ascendente
 * @throws LiquidacionPersistenceException si ocurre un error de acceso a la base de datos
 */
public List<Liquidacion> findByCursorAfter(Long lastId, int pageSize) {
    log.debug("Paginando liquidaciones desde lastId={}, pageSize={}", lastId, pageSize);
    try {
        var params = new MapSqlParameterSource()
                .addValue("lastId", lastId)
                .addValue("pageSize", pageSize);
        return jdbcTemplate.query(
                LiquidacionConstantsQuery.FIND_BY_CURSOR_AFTER, params, rowMapper);
    } catch (DataAccessException e) {
        log.error("Error al paginar liquidaciones desde lastId={}", lastId, e);
        throw new LiquidacionPersistenceException("Error al paginar liquidaciones", e);
    }
}
```

## Reglas de uso del cursor

- Primera pagina: el caller invoca con `lastId = 0` (o el minimo valor posible del tipo de la PK).
- El cursor (`lastId`) debe ser una columna con indice unico y orden estable — normalmente la PK autoincremental; no usar una columna sin indice o con valores repetidos.
- `pageSize` debe validarse en el service layer con un maximo permitido (ej. 100-500) antes de llegar al repository — un caller externo no controla cuantas filas pide.
- Para saber si existe una pagina siguiente sin una query `COUNT` adicional: si `list.size() == pageSize`, asumir que puede haber mas y usar el `id` del ultimo elemento como proximo `lastId`; si `list.size() < pageSize`, es la ultima pagina.
- El nombre del metodo sigue el patron `findByCursorAfter(Long lastId, int pageSize)` — ver la tabla de naming en [SKILL.md](../SKILL.md).
