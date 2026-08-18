---
name: lambda
description: Guias de AWS Lambda/Serverless (cold start, handlers SQS/SNS/API Gateway, alineacion con Terraform) para componentes lbd- KLAP BYSF. Usar al implementar o revisar una funcion Lambda.
---

# Lambda — AWS Serverless

## Cuando usar este skill

Al implementar o revisar un componente `lbd-*` (ver adaptador de topologia
`src/adapters/lambda.js`). No aplica a microservicios Spring Boot on-prem/ECS
(ver skill `klap-standard`) — es especifico del runtime serverless.

## Que leer

| Archivo | Contiene |
|---|---|
| `references/serverless.md` | Cold start, handlers SQS/SNS/API Gateway, resolucion de secretos, alineacion con Terraform |

## Resumen de reglas del equipo

- **Cold start:** paquete del handler lo mas liviano posible — dependencias
  escopadas estrictamente, sin arrastrar el classpath completo de un
  microservicio Spring Boot.
- **Handlers estandarizados** por tipo de trigger: SQS, SNS, API Gateway
  proxy — no mezclar logica de parseo de evento con logica de negocio en el
  mismo metodo.
- **Secretos:** resolver via AWS Secrets Manager en runtime — misma regla
  que el resto del stack, ver [seguridad](../klap-standard/references/seguridad.md).
  Cero secretos en variables de entorno del template en claro.
- **Terraform es la fuente de infraestructura:** no escribir scripts de
  deploy propios en el codigo de la aplicacion. El handler solo expone el
  schema de evento (JSON/YAML) que los modulos Terraform centrales ya
  esperan — coordinar con el equipo de infraestructura antes de cambiar ese
  contrato.
- Si el handler llama una API externa: ver skill `http-cliente` (mismo
  cliente `RestClient`, mismas reglas de timeout/reintento — el runtime
  serverless no cambia esa decision).
- Si el handler consume un evento con forma de excepcion de dominio: ver
  skill `excepciones` — la jerarquia (`XxxException`/`NonRetryableClientDataException`)
  aplica igual que en un microservicio on-prem.
