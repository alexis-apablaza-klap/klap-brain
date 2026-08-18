# Stack npm — Angular (mcf-*) y Lambda TypeScript (lbd-*)

Pisos de version: ver [`stack.md`](stack.md). Esto es donde vive la version
real en cada tipo de repo npm del equipo, para quien vaya a auditarla a mano.
Arquitectura/patrones de MCF y de Lambda siguen en `knowledge/microfrontend/`
y `knowledge/lambda/` — este archivo es solo la version, no la repitas ahí.

## Angular / TypeScript (`mcf-*`)

La version real vive en `package.json`, `dependencies["@angular/core"]` y
`devDependencies["typescript"]` — sin prefijo `^`/`~` para comparar contra
el piso (`npm run versions:check` ya lo hace,
`src/lib/stack-scan/npm.js`).

```json
"dependencies": {
  "@angular/core": "^22.0.0"
},
"devDependencies": {
  "typescript": "~5.9.0"
}
```

## Node runtime (`lbd-*`)

No hay un campo unico y confiable para el runtime de un Lambda: preferir
`engines.node` en `package.json` cuando exista; si no, `devDependencies["@types/node"]`
es el proxy que usa el scanner (mayor version instalada de los tipos, no el
runtime real declarado — util pero no es 100% preciso). Verificado contra
repos reales: hoy casi ninguno declara `engines.node`, el target real vive
como string libre dentro del script de build de `esbuild`
(`--target=node20`), que no es parseable con confianza — declarar
`engines.node` explicito en los Lambdas nuevos evita esta ambiguedad.

```json
"engines": { "node": ">=24.0.0" }
```
