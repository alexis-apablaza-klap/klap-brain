# Migraciones — Dbmate

Router: `../SKILL.md`. Cubre el ciclo de vida del **esquema** (DDL versionado);
`repository.md`/`paginacion.md` cubren el acceso a datos en runtime sobre ese
esquema ya migrado — son capas distintas, no se solapan.

## Cuándo usar

Al crear o modificar tablas/columnas/índices en `contable` o `mc_tlog` (o la
carpeta de BD de un componente específico), o al generar la migración que
acompaña un cambio de repository.

## Estructura del archivo

```sql
-- migrate:up
CREATE TABLE IF NOT EXISTS transaction_log (
    id BIGSERIAL PRIMARY KEY,
    event_id VARCHAR(64) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_transaction_log_event_id ON transaction_log(event_id);

-- migrate:down
DROP TABLE IF EXISTS transaction_log;
```

## Reglas

- **Reversibilidad obligatoria:** todo `-- migrate:down` debe revertir
  **completamente** lo que hizo su `-- migrate:up` correspondiente — nunca un
  down parcial o un `-- noop` comentado.
- **Repos destino:** `contable`, `mc_tlog`, o la carpeta de BD propia del
  componente si el dominio no comparte esquema con esos dos.
- Índice en toda columna usada para dedup/idempotencia (`event_id`,
  claves de negocio) — ver la regla de idempotencia en
  `../../kafka/references/listener.md`: la migración es quien crea el
  `UNIQUE` que ese check de deduplicación necesita en la base de datos.
- Nombrar el archivo con el prefijo de timestamp que exige Dbmate
  (`YYYYMMDDHHMMSS_descripcion.sql`) — nunca a mano, dejar que `dbmate new`
  lo genere.
- Validar el `up` con `EXPLAIN ANALYZE` si crea índices sobre tablas grandes
  (ver `paginacion.md` para el patrón cursor-based que depende de esos índices).

## Anti-patrones

- `DROP TABLE`/`ALTER TABLE ... DROP COLUMN` en el `up` sin backup si la tabla
  tiene datos reales en el ambiente destino — coordinar con el DBA antes.
- Migraciones que dependen del orden de ejecución de otra migración no
  declarada como prerequisito explícito en el nombre/comentario del archivo.
- Ejecutar `dbmate up` manualmente contra QA/PROD en vez de vía el pipeline
  Jenkins correspondiente (ver skill `gobierno`, sección RDC — los pipelines
  `*-db-mc-tlog-scripts-migrate-up`/`-rollback` son el mecanismo real).
