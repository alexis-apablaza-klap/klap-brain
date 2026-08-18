# Reactividad y estructura Angular — convenciones generales

Router: `../SKILL.md`. Distinto de `angular-single-spa.md`: ese archivo cubre
el **bootstrap** de un MCF nuevo (single-spa, config runtime, interceptor);
este cubre cómo escribir los **componentes** de cualquier módulo Angular del
equipo (dentro o fuera de un MCF) una vez que el proyecto ya existe.

## Reactividad según versión

- **Angular < 17:** RxJS puro — `Observable`/`Pipe`. Limpieza de suscripción
  obligatoria vía `takeUntilDestroyed()` o el pipe `async` en el template;
  nunca un `subscribe()` sin desuscribir en `ngOnDestroy` o equivalente.
- **Angular >= 17:** Signals como mecanismo primario (`signal()`, `computed()`,
  `effect()`) sobre RxJS para estado local de componente. Control de flujo
  nativo (`@if`/`@for`/`@switch`) en vez de `*ngIf`/`*ngFor` legacy.

Antes de aplicar una u otra convención, confirmar la versión real del
`package.json` del repo — no asumir por la fecha del proyecto.

## Estructura y performance

- Standalone components + rutas lazy-loaded por feature.
- Estilos con scope de componente (SCSS), naming BEM o utility classes —
  consistente dentro del mismo repo, no mezclar convenciones a mitad de módulo.

## Anti-patrones

- `subscribe()` manual sin `takeUntilDestroyed`/`async` pipe → memory leak en
  componentes que se destruyen y recrean (tabs, modales, rutas).
- Mezclar Signals y RxJS para el mismo estado dentro del mismo componente sin
  una razón explícita (ej. un stream que sí necesita operadores RxJS).
