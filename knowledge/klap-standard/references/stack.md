# Stack tecnologico — version unica

Fuente unica de versiones. `npm run versions:check` falla si otro archivo del
corpus declara una version distinta para la misma libreria — en el ecosistema
anterior Spring Boot aparecia como 3.5.11 en 7 archivos y 3.5.14 en uno solo
(el mas reciente) y nadie lo habia notado. Enlaza este archivo en vez de
repetir el numero de version en otro skill.

| Componente | Version |
|---|---|
| Java | 21 |
| Spring Boot | 3.5.14 |
| Spring Cloud | 2025.0.0 |
| Gradle | 9.0.0 |
| Resilience4j | 2.2.0 |
| springdoc-openapi | 2.8.12 |
| PostgreSQL driver | 42.7.2 |
| JUnit | 5 |
| Lombok | ultima compatible con Java 21 |
| Base de datos | PostgreSQL Aurora (AWS) |
| Mensajeria | Kafka — Confluent / AWS MSK |
| Cobertura minima (JaCoCo) | 95% |

## Dependencias principales (build.gradle)

```groovy
implementation 'org.springframework.boot:spring-boot-starter-web'
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'org.springframework.boot:spring-boot-starter-validation'
implementation 'org.springframework.kafka:spring-kafka'
implementation 'org.springframework.boot:spring-boot-starter-jdbc'
implementation 'org.postgresql:postgresql:42.7.2'
implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.8.12'
implementation 'io.github.resilience4j:resilience4j-spring-boot3:2.2.0'
compileOnly 'org.projectlombok:lombok'
implementation 'io.github.pfaffenrodt:logback-awslogs-appender:1.6.0'
```

## build.gradle — reglas de build

- Toolchain: `languageVersion = 21`.
- Plugins: `java`, `org.springframework.boot:3.5.14`, `io.spring.dependency-management:1.1.7`, `org.owasp.dependencycheck:12.2.0`, `org.sonarqube:7.3.1.8318`, `jacoco`.
- OWASP Dependency-Check: formatos `[HTML, JSON]`, `failBuildOnCVSS=7`, `check.dependsOn dependencyCheckAnalyze`. **Nunca `failBuildOnCVSS=11`** — el CVSS maximo real es 10, ese valor nunca bloquea el build (es un error, no una politica laxa intencional).
- Trivy: `trivy --scanners vuln` — no correrlo SIN `--scanners`: el scanner de secrets por defecto dispara falsos positivos sobre placeholders en `application.yml` y tests.
- JaCoCo: `toolVersion 0.8.12`, cobertura minima `0.95`, excluir `model/`, `config/`, `Application.class`, `global/aws/`, `global/exceptions/`, `Constants.class`, `ConstantsQuery.class`.
- Sonar: correr como `./gradlew build sonar` (no `jacocoTestReport sonar` — en CI las clases compiladas no persisten entre tasks si `build` no corre primero).
- Gradle 9: no usar `${buildDir}` en el bloque `sonar{}` — fue eliminado. Usar `layout.buildDirectory.file(...)`.
- Dependency locking: `lockAllConfigurations()` obligatorio para reproducibilidad en CI/CD. Al agregar una dependencia nueva: `./gradlew dependencies --write-locks`.
- Gradle wrapper: regenerar con `./gradlew wrapper --gradle-version X.Y.Z` desde la distribucion oficial; validar el hash contra el tag `vX.Y.Z` en github.com/gradle/gradle antes de commitear.
- Versionado: `getVersionFromGit()` resuelve en orden: variable de entorno `VERSION_APP` (Jenkins) → `git describe --exact-match` → `git describe --abbrev=0` → `project.version` como fallback.
- `bitbucket-pipelines.yml` obligatorio en cada repo: step `owasp-dependency-check` corre `./gradlew dependencyCheckAnalyze --no-daemon` en pull requests y en `develop`/`master`.
