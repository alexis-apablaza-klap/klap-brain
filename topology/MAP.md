# Mapa de topologia KLAP

_Generado por `klap map` — 2026-08-13T20:46:10.825Z_

## Abono Ya (`abono-ya`) — Fase 1

Pago adelantado al comercio de las ventas del dia, sin esperar el proceso de pago normal (payout acceleration).

**Componentes (16):**

- `lbd-sva-reporte-facturacion-anticipo` [lbd]
- `lbd-sva-reporte-interaux-anticipo` [lbd]
- `lbd-sva-trx-summary-anticipo` [lbd]
- `ms-central-bomc-limites-anticipo` [ms]
- `ms-central-sva-anticipo-calculos` [ms]
- `ms-central-sva-anticipo-limites` [ms]
- `ms-central-sva-anticipo-listas` [ms]
- `ms-central-sva-anticipo-listas-develop-replica` [ms]
- `ms-central-sva-anticipo-listas-qa-replica` [ms]
- `ms-central-sva-anticipo-on-demand` [ms]
- `ms-central-sva-anticipo-on-demand-develop-replica` [ms]
- `ms-central-sva-anticipo-on-demand-qa-replica` [ms]
- `ms-central-sva-anticipo-ondemand` [ms]
- `ms-central-sva-anticipo-programado` [ms]
- `ms-central-sva-anticipo-reportes` [ms]
- `ms-central-sva-anticipo-transferencias` [ms]

## Impulso Klap (`impulso-klap`) — Mantencion

Credito otorgado por R2 al comercio en base a su historial de ventas, pagado dia a dia via retenciones sobre los pagos de Klap.

**Componentes (19):**

- `mcf-central-sva-r2-admin-creditos` [mcf]
- `mcf-central-sva-r2-nomina` [mcf]
- `mcf-central-sva-r2-reporte-creditos` [mcf]
- `ms-central-fasf-r2-auditoria` [ms]
- `ms-central-fasf-r2-comercio` [ms]
- `ms-central-fasf-r2-correos` [ms]
- `ms-central-fasf-r2-credito` [ms]
- `ms-central-fasf-r2-enviotrx` [ms]
- `ms-central-fasf-r2-enviotrx-potencial` [ms]
- `ms-central-fasf-r2-orquestador` [ms]
- `ms-central-fasf-r2-pagos-externos` [ms]
- `ms-central-fasf-r2-parametros` [ms]
- `ms-central-fasf-r2-regla-deudor` [ms]
- `ms-central-fasf-r2-regla-monto` [ms]
- `ms-central-fasf-r2-reportes` [ms]
- `ms-central-fasf-r2-retencion-mc` [ms]
- `ms-central-fasf-r2-retencion-r2` [ms]
- `ms-central-fasf-r2-token` [ms]
- `ms-central-fasf-r2-validador-regla` [ms]

## Cuota Comercio (`cuota-comercio`) — Mantencion

Soluciones de pago en cuotas para el comercio.

**Componentes (3):**

- `mcs-central-sva-mantenedor-cuota-comercio` [mcs]
- `ms-central-ret-cuota-comercio` [ms]
- `ms-central-sva-consultas-cuota-comercio` [ms]

## Vouchering Itau (`vouchering-itau`) — Kickoff

Cuarto proyecto del equipo, en definicion.

**Componentes (0):**

_Sin componentes matcheados — ver `topology/productos.yml`._

## Sin producto asignado (187)

_Componentes del scan que no matchean ningun patron en productos.yml — probablemente transversales o de otros equipos._

- `bff-bysf-liqsvbo-administracion-tarifas-adquirencia`
- `bff-bysf-liqsvbo-crud-reglas-tarifa`
- `bff-bysf-liqsvbo-notificaciones`
- `bysf-fact-presentador-facturador`
- `cnsr-multi-smv-data-comercios`
- `cnsr-multi-smv-data-comercios-retry`
- `mcs-bysf-liqsvbo-api-gestion-retencion`
- `mcs-bysf-liqsvbo-api-pago-comercio`
- `mcs-bysf-liqsvbo-calculo-tasa-intercambio`
- `mcs-bysf-liqsvbo-crud-retencion-pago`
- `mcs-bysf-liqsvbo-datos-cliente`
- `mcs-bysf-liqsvbo-genera-transfer`
- `mcs-bysf-liqsvbo-legado-obtiene-deuda`
- `mcs-bysf-liqsvbo-legado-registra-deuda`
- `mcs-bysf-liqsvbo-productor-clearing-out`
- `mcs-bysf-liqsvbo-regla-tarifa-crud`
- `mcs-bysf-liqsvbo-reglas-transfer`
- `mcs-bysf-liqsvbo-saldo-clientes`
- `mcs-bysf-liqsvbo-tarifa-comisiones`
- `mcs-bysf-liqsvbo-tipo-comercio-crud`
- `mcs-bysf-liqsvbo-validacion-tarifas`
- `mcs-central-apm-pluxee-pin`
- `mcs-central-bysf-autoconfig-activacion-pos`
- `mcs-central-bysf-autoconfig-asignar-terminal-bo`
- `mcs-central-bysf-autoconfig-consultas-bo`
- `mcs-central-bysf-autoconfig-crud-terminales`
- `mcs-central-bysf-autoconfig-despacho-kits`
- `mcs-central-bysf-autoconfig-order-manager`
- `mcs-central-bysf-autoconfig-terminales`
- `mcs-central-sva-batch-resumen-trxs`
- `mcs-central-sva-correo-pago-24-7`
- `mcs-multi-be-api-fonasa-bonos`
- `mcs-multi-bo-ms-bff-bysf-imed`
- `mcs-multi-bysf-liqctacte-integracion-banco`
- `mcs-multi-bysf-liqsvbo-gestor-reintentos`
- `mcs-multi-bysf-liqsvbo-migracion-tablon-aurora`
- `mcs-multi-bysf-liqsvbo-productor-clearing-out-interchange`
- `mcs-multi-bysf-liqsvbo-productor-clearing-out-multiservicio`
- `mcs-multi-bysf-liqsvbo-resultado-proceso`
- `mcs-multi-bysf-pos-datos-cliente`
- `mcs-multi-sop-af-ayc-validacion-kyc`
- `mcs-vertical-appk-enrollment-worker`
- `monoapp-multi-smv-generador-svap-amex`
- `monoapp-multi-smv-generador-svap-comercio`
- `monoapp-multi-smv-generador-svap-fin700`
- `monoapp-multi-smv-generador-svap-margen-adquirente`
- `monoapp-multi-smv-generador-svap-sucursal`
- `monoapp-multi-smv-generador-svap-tarifa-estandar`
- `monoapp-multi-smv-generador-svap-tarifas`
- `monoapp-multi-smv-generador-svap-terminal`
- _(+137 mas)_
