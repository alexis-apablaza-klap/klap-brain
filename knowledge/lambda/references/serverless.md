# AWS Lambda — runtime, handlers e infraestructura

Router: `../SKILL.md`.

## Runtime y ejecucion

- **Version de Node:** piso vigente en
  `../../klap-standard/references/stack-npm.md` — declarar `engines.node`
  explicito en `package.json` (hoy casi ningun Lambda real lo hace; el
  runtime queda escondido en el `--target` del script de `esbuild`, dificil
  de auditar).
- **Minimizar cold start:** dependencias del handler escopadas al minimo
  necesario. Evitar arrastrar librerias pensadas para un microservicio
  Spring Boot completo (auto-configuracion, actuator, etc.) a un handler
  Lambda — cada dependencia extra sube el tiempo de cold start.
- **Empaquetado liviano:** revisar el `.zip`/layer resultante antes de
  publicar; dependencias transitivas no usadas en el path del handler son
  candidatas a excluir.

## Handlers por tipo de evento

Estandarizar la integracion segun el trigger — no reutilizar el mismo
handler generico para distintos tipos de evento:

| Trigger | Consideracion |
|---|---|
| SQS | Procesar en batch cuando el volumen lo justifique; idempotencia por `messageId` si el consumer puede reprocesar el mismo mensaje (visibility timeout expirado) |
| SNS | El handler recibe el mensaje ya enrutado — no asumir orden de entrega entre topics distintos |
| API Gateway (proxy) | Separar parseo del evento (path/query/body) de la logica de negocio — el parseo va en una capa fina, nunca mezclado |

## Alineacion con Terraform

- El equipo de infraestructura mantiene los modulos Terraform centrales — la
  aplicacion **no** escribe scripts de deploy propios.
- El handler solo necesita exponer/consumir el schema de evento (JSON/YAML)
  que esos modulos ya esperan. Si el schema cambia, coordinar con
  infraestructura antes de mergear — un cambio de contrato no anunciado
  rompe el modulo Terraform en el proximo apply.

## Secretos y configuracion

- Mismo estandar que el resto del stack: AWS Secrets Manager en runtime, ver
  [seguridad](../../klap-standard/references/seguridad.md). Nunca un secreto
  en texto plano en las variables de entorno del template SAM/CDK/serverless.

## Anti-patrones

- Handler unico que atiende multiples tipos de trigger via `if/else` sobre
  la forma del evento — separar en handlers distintos, uno por trigger.
- Logica de negocio pesada ejecutandose sincronicamente dentro del handler
  de API Gateway sin control de timeout — el timeout de Lambda corta la
  ejecucion sin garantia de estado consistente aguas abajo.
- Reintentar manualmente dentro del handler en vez de dejar que el trigger
  (SQS redrive policy, retry de SNS) maneje los reintentos — duplica logica
  que la plataforma ya resuelve.
