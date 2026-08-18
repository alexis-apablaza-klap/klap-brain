# Stack Java — build-tooling y convenciones de Gradle

Pisos de version (Java/Spring Boot/Gradle/Resilience4j/springdoc-openapi):
ver [`stack.md`](stack.md). Esto es el detalle de build-tooling que no se
gobierna por version (JaCoCo, Sonar, OWASP DC, Trivy, reglas de Gradle).

**Donde vive la version real, para quien vaya a leer un `build.gradle`:**
`build.gradle` casi nunca declara el numero literal — usa variables
`${nombre}` resueltas en `gradle.properties` (ej. `id
'org.springframework.boot' version "${springBootVersion}"` +
`springBootVersion=3.5.6` en `gradle.properties`, verificado contra un repo
real). La version de Gradle sale de
`gradle/wrapper/gradle-wrapper.properties` (`distributionUrl`), no de
`build.gradle`. `npm run versions:check` ya sabe resolver esto
(`src/lib/stack-scan/java.js`).

## Dependencias principales (build.gradle)

```groovy
implementation 'org.springframework.boot:spring-boot-starter-web'
implementation 'org.springframework.boot:spring-boot-starter-actuator'
implementation 'org.springframework.boot:spring-boot-starter-validation'
implementation 'org.springframework.kafka:spring-kafka'
implementation 'org.springframework.boot:spring-boot-starter-jdbc'
implementation 'org.postgresql:postgresql:42.7.2'
implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.9.0'
implementation 'io.github.resilience4j:resilience4j-spring-boot3:2.4.0'
compileOnly 'org.projectlombok:lombok'
implementation 'io.github.pfaffenrodt:logback-awslogs-appender:1.6.0'
```

Otras versiones no gobernadas por `versions:check` (no hay piso declarado,
mantener actualizadas por buen juicio): PostgreSQL driver `42.7.2`, JUnit
`5`, Lombok "ultima compatible con el Java declarado", Spring Cloud
`2025.0.0`. Base de datos: PostgreSQL Aurora (AWS). Mensajeria: Kafka —
Confluent / AWS MSK. Cobertura minima (JaCoCo): 95%.

## build.gradle — reglas de build

- Toolchain: `languageVersion = JavaLanguageVersion.of(21)` (o el piso
  vigente — ver `stack.md`).
- Plugins: `java`, `org.springframework.boot:3.5.16` (o vigente),
  `io.spring.dependency-management:1.1.7`, `org.owasp.dependencycheck:12.2.0`,
  `org.sonarqube:7.3.1.8318`, `jacoco`.
- OWASP Dependency-Check: formatos `[HTML, JSON]`, `failBuildOnCVSS=7`, `check.dependsOn dependencyCheckAnalyze`. **Nunca `failBuildOnCVSS=11`** — el CVSS maximo real es 10, ese valor nunca bloquea el build (es un error, no una politica laxa intencional).
- Trivy: `trivy --scanners vuln` — no correrlo SIN `--scanners`: el scanner de secrets por defecto dispara falsos positivos sobre placeholders en `application.yml` y tests.
- JaCoCo: `toolVersion 0.8.12`, cobertura minima `0.95`, excluir `model/`, `config/`, `Application.class`, `global/aws/`, `global/exceptions/`, `Constants.class`, `ConstantsQuery.class`.
- Sonar: correr como `./gradlew build sonar` (no `jacocoTestReport sonar` — en CI las clases compiladas no persisten entre tasks si `build` no corre primero).
- Gradle 9: no usar `${buildDir}` en el bloque `sonar{}` — fue eliminado. Usar `layout.buildDirectory.file(...)`.
- Dependency locking: `lockAllConfigurations()` obligatorio para reproducibilidad en CI/CD. Al agregar una dependencia nueva: `./gradlew dependencies --write-locks`.
- Gradle wrapper: regenerar con `./gradlew wrapper --gradle-version X.Y.Z` desde la distribucion oficial; validar el hash contra el tag `vX.Y.Z` en github.com/gradle/gradle antes de commitear.
- Versionado: `getVersionFromGit()` resuelve en orden: variable de entorno `VERSION_APP` (Jenkins) → `git describe --exact-match` → `git describe --abbrev=0` → `project.version` como fallback.
- `bitbucket-pipelines.yml` obligatorio en cada repo: step `owasp-dependency-check` corre `./gradlew dependencyCheckAnalyze --no-daemon` en pull requests y en `develop`/`master`.
