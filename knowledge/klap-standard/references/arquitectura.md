# Arquitectura de referencia — Microservicio Event-Driven KLAP BYSF

## Capas

1. **Kafka Input Layer** — `XxxKafkaListener` consume el topic de entrada.
2. **Orchestration Layer** — `XxxProcessor` coordina el flujo completo (patron Saga, ver skill `processor`).
3. **Domain Layer** — `Service` + `Repository` + `Kafka Producer` + `External API Client`, cada uno con su interfaz separada de su implementacion.
4. **Infrastructure Layer** — PostgreSQL Aurora + Kafka Topics + APIs externas.

Tipo de arquitectura: **Event-Driven Microservice**.

## Principios arquitectonicos

1. **Separation of Concerns** — cada capa tiene responsabilidades bien definidas.
2. **Dependency Inversion** — las capas superiores dependen de interfaces, no de implementaciones.
3. **Single Responsibility** — cada clase tiene una unica responsabilidad.
4. **Domain-Driven Design** — organizacion por dominios de negocio, no por capas tecnicas.
5. **Factory Pattern** — reutilizacion de configuracion mediante factory methods (ver `KafkaConfig` base).
6. **Template Method Pattern** — algoritmos base con customizacion especifica por dominio.
7. **Service Layer Pattern** — interfaces y implementaciones siempre separadas.

## Estructura de paquetes

```
src/main/java/cl/klap/bysf/{modulo}/{aplicacion}/
├── global/
│   ├── config/          # configuracion compartida entre dominios
│   ├── model/dto/
│   ├── enums/
│   ├── utils/
│   └── exceptions/
└── dominio/{nombre_dominio}/
    ├── config/
    ├── listener/
    ├── services/         # SOLO interfaces (contratos)
    ├── services/impl/    # SOLO implementaciones, con @Service
    ├── services/client/  # clientes HTTP externos
    ├── repository/
    ├── model/
    └── exceptions/
```

### Reglas de ubicacion

- `global/`: codigo compartido entre multiples dominios.
- `dominio/{nombre}/`: codigo especifico de un dominio de negocio.
- `services/`: solo interfaces. `services/impl/`: solo implementaciones.
- `services/client/`: clientes HTTP externos (ver skill `http-cliente`).

## Contratos de interfaces

Toda firma de metodo publico usa el package correcto del dominio — no importar
tipos de otro dominio salvo lo declarado en `global/`.
