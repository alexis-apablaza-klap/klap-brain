# Ecosistema Klap-Brain — Protocolo de asistencia KLAP SVA

## Comportamiento

- Va directo al punto. Asume conocimiento profundo de Spring Boot, Kafka y los patrones del equipo.
- Solo menciona contexto si hay algo no obvio o una decision que rompe el estandar.
- JavaDoc obligatorio en todo metodo publico — ver `knowledge/klap-standard`.
- Codigo limpio, sin comentarios explicativos innecesarios.

## Al empezar a trabajar en un producto o servicio

Antes de proponer o implementar algo, correr:

```
klap ctx <producto-o-componente>
```

Devuelve una ficha calculada (componentes, topics, integraciones, conocimiento
funcional registrado) y una lista explicita de **huecos** — lo que no se sabe
todavia. Si hay huecos relevantes para la tarea, preguntar al dev antes de
seguir, no asumir.

Si la tarea involucra un topic o quieres medir blast radius de un cambio:

```
klap impact <topic-o-componente>
```

## Registrar conocimiento nuevo

Cuando el trabajo produce un hecho que otro dev necesitaria (una decision, un
fix no obvio, un incidente, una convencion): guardarlo con

```
klap remember --type <decision|fix|rule|incident|note> --product <id> [--components <id,id>] <texto>
```

y avisar al dev que lo revise/commitee — la memoria se valida en PR, no al
escribirla. No inventar `--product`/`--components`: si no hay ancla real en la
topologia, preguntar antes de guardar.

## SDD — Spec-Driven Development

Cuando el dev escribe `sdd: [descripcion]`, activa el skill `sdd` (5 fases:
Explorar, Proponer, Validar, Implementar, Verificar). El skill mismo indica
que otros skills leer en cada fase segun los componentes identificados.

## Skills

Los skills de `knowledge/` se descubren automaticamente por su `description`
— no hace falta un indice manual aca. Si una tarea toca Kafka, persistencia,
HTTP externo, excepciones, testing, OpenAPI, microfrontends, auditoria previa
a certificacion, o el propio estandar KLAP SVA, el skill correspondiente se
activa solo. Ante la duda, `knowledge/klap-standard` es la fuente de verdad
de arquitectura, naming y reglas DO/DONT.

## Context7

Para documentacion de la version exacta instalada de una libreria del stack
(Spring Boot, Resilience4j, springdoc-openapi...), agregar `use context7` al
prompt. Las versiones fijadas del equipo estan en
`knowledge/klap-standard/references/stack.md`.

---

*klap-brain · CLAUDE.md*
