---
name: release-publish
description: Flujo para cerrar una release git flow, mergear a master/develop, tagear y publicar el código del CLI en GitHub Packages. Usar al hacer un release o publicar una nueva versión.
---

# Release & Publish — klap-brain

Publica solo el **código** del CLI (`bin/`, `src/`, `package.json`) —
`memory/`, `topology/topology.json` y `topology/MAP.md` quedan excluidos por
`.npmignore` porque ese contenido fluye por `git pull`, no por versión fijada
del paquete (ver `README.md`).

## Prerrequisitos

```bash
git branch                          # rama actual y branches existentes
git status                          # working tree limpio
git ls-remote origin 2>&1 | head -1 # conectividad con el remoto
```

**Nota — este repo usa HTTPS + Git Credential Manager, no SSH.** Si
`git push`/`git fetch` normales quedan colgados indefinidamente (sin error,
sin salida), es GCM intentando un flujo interactivo que no puede completarse
en un shell no interactivo. Workaround: embeber el token en la URL y correr
el comando en background:

```bash
TOKEN=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill | sed -n 's/^password=//p')
USER=$(printf "protocol=https\nhost=github.com\n\n" | git credential fill | sed -n 's/^username=//p')
git -c credential.helper= push "https://${USER}:${TOKEN}@github.com/alexis-apablaza-klap/klap-brain.git" master:master
```

No dejar el token en logs ni archivos persistentes — solo en la variable de
entorno de ese comando puntual.

## PASO 1 — Bump de versión en la release branch

```bash
git checkout release/x.x.x
npm version patch --no-git-tag-version   # o minor/major según corresponda
git add package.json
git commit -m "bump version to x.x.x"
```

`--no-git-tag-version` evita que npm cree el tag — lo hace `git flow` después.

## PASO 2 — `git flow release finish`

```bash
GIT_MERGE_AUTOEDIT=no git flow release finish -m "v{version} - {descripcion breve}" {version}
```

Si queda colgado (editor o fetch remoto), merge manual:

```bash
git checkout master
git merge --no-ff release/{version} -m "Merge release/{version} into master"
git tag -a {version} -m "v{version} - {descripcion breve}"
git checkout develop
git merge --no-ff release/{version} -m "Merge release/{version} into develop"
git branch -d release/{version}
```

## PASO 3 — Push a remoto

Usar el patrón HTTPS+background de arriba para `master`, `develop` y el tag
`{version}` si el push directo se cuelga.

## PASO 3.5 — Actualizar README.md antes de publicar

1. **Footer/versión**: que coincida con el `package.json` recién bumpeado.
2. **Tabla de comandos `klap`**: si el bump agregó un subcomando en `bin/klap.js`, sumarlo.
3. **Catálogo de skills**: comparar contra los `SKILL.md` reales —

   ```bash
   find knowledge -maxdepth 2 -name "SKILL.md" | sort
   ```

   cualquier skill nuevo sin fila en el README es una brecha a cerrar.

Si no hay nada que actualizar, no crear un commit vacío.

## PASO 4 — Publicar en GitHub Packages

```bash
npm publish
```

`.npmrc` (gitignoreado) debe tener el token de escritura:
```
//npm.pkg.github.com/:_authToken=ghp_...
```

`403 Forbidden` → el token solo tiene `read:packages`; crear uno con
`write:packages` en GitHub → Settings → Developer settings → PAT.

Salida esperada:
```
+ @alexis-apablaza-klap/klap-brain@{version}
```

## PASO 5 — Fix de warnings npm (si aplica)

```bash
npm pkg fix
git add package.json
git commit -m "fix: npm pkg fix bin paths"
git push origin develop
```

## Verificación final

```bash
git status
git branch        # solo deben quedar: develop, master
git tag -l        # debe aparecer la nueva version
git log master --oneline -3
```

## Causas comunes de fallo

| Error | Causa | Solución |
|-------|-------|----------|
| `git push`/`fetch` colgado sin error | GCM intenta flujo interactivo | Patrón HTTPS+token+background de arriba |
| `rejected (fetch first)` | El remoto tiene commits que el local no tiene | `git pull origin {rama} --rebase` antes del push |
| `release/x.x.x - not something we can merge` | `git flow` ya completó el merge en background | Verificar con `git log master --oneline` si ya ocurrió |
| `403 Forbidden` en `npm publish` | Token sin `write:packages` | Crear un PAT nuevo con ese scope |
| `diverged` en release finish | El commit de bump diverge del remoto | Merge manual (Paso 2 alternativo) |
