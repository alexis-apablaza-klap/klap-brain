# Referencia: compensacion y manejo de fallos del saga

## Por que no hay rollback automatico

Un saga event-driven no es una transaccion distribuida: Kafka no participa en
el `@Transactional` de JDBC, asi que envolver la persistencia (paso 4) y la
publicacion en el topic de salida (paso 5) en un mismo bloque transaccional
no da ninguna garantia real — el commit en Postgres no protege el envio a
Kafka, ni al reves. La unica compensacion posible en este esquema es dejar un
rastro auditado para que un proceso o una persona reintente manualmente el
paso que fallo.

## Tabla de estados de auditoria

| Estado | Cuando se registra | Pasos afectados |
|---|---|---|
| `PENDIENTE` | Fallo de infraestructura recuperable: API externa caida o con timeout, error de conexion a la base, fallo al enviar a Kafka | 2, 4, 5 |
| `ERROR` | Fallo dentro de la logica de negocio propiamente dicha (un dato paso la validacion inicial pero el calculo no puede completarse) | 3 |
| `NOTIFICACION_PENDIENTE` | El proceso principal (pasos 1 a 5) termino bien, pero el envio de la notificacion final fallo | 6 |

La distincion entre `PENDIENTE` y `ERROR` importa para el retry manual:
`PENDIENTE` suele resolverse solo reintentando el mismo mensaje (la causa fue
externa), mientras que `ERROR` normalmente necesita revisar el dato de
entrada antes de reintentar.

## El metodo `auditarError`

Firma comun a los 5 puntos de falla del saga (pasos 2 a 6). Nunca propaga una
excepcion propia — si la auditoria misma falla, el saga ya viene fallando por
otra razon y no puede depender de un segundo punto de falla:

```java
private void auditarError({Xxx}InputDto mensaje, String idProceso, String codigoSucursal, String estado, String detalle) {
    try {
        log.warn("📋 Auditando estado {} | idProceso={} | detalle={}", estado, idProceso, detalle);
        auditoriaRepository.registrarEstado(idProceso, codigoSucursal, estado, detalle);
    } catch (Exception audEx) {
        // La auditoría falló — loggear para investigación manual
        log.error("❌ CRÍTICO: Fallo en auditoría | idProceso={} | estado={} | auditoriaError={}",
            idProceso, estado, audEx.getMessage());
    }
}
```

Notar la asimetria en el paso 6: el bloque `catch` audita
`NOTIFICACION_PENDIENTE` pero **no** relanza la excepcion, a diferencia de los
pasos 2 a 5. El proceso principal ya cerro con exito; forzar un fallo del
saga completo por una notificacion perdida duplicaria el reintento de pasos
que ya quedaron bien resueltos.

## Anti-patrones especificos de la compensacion

- Envolver los pasos 4 y 5 en un mismo `@Transactional` esperando que el fallo de uno revierta al otro — Kafka queda fuera de esa transaccion.
- Saltarse `auditarError` en cualquier paso 2 a 6 para "ganar tiempo" — sin ese registro el retry manual no tiene de donde partir.
- Dejar que una excepcion dentro de `auditarError` se propague hacia arriba — debe quedar contenida y solo logueada como critica.
- Registrar la falla de notificacion como `ERROR` en lugar de `NOTIFICACION_PENDIENTE` — mezclarlos le hace perder al equipo de soporte la senal de que el proceso principal si se completo.
