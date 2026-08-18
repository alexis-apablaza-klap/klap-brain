'use strict';

/**
 * Extrae versiones reales de un repo Gradle (ms-/mcs-). build.gradle casi
 * nunca declara la version literal -- usa variables `${nombre}` resueltas
 * en gradle.properties (verificado contra ms-central-sva-anticipo-calculos:
 * `id 'org.springframework.boot' version "${springBootVersion}"` +
 * `springBootVersion=3.5.6` en gradle.properties). Gradle mismo sale de
 * gradle/wrapper/gradle-wrapper.properties (distributionUrl), no de
 * build.gradle.
 */

const fs = require('fs');
const path = require('path');

function readIfExists(p) {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function parseProperties(text) {
  const out = {};
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('!')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    out[trimmed.slice(0, idx).trim()] = trimmed.slice(idx + 1).trim();
  }
  return out;
}

function resolveVar(token, props) {
  const m = /^\$\{(.+)\}$/.exec(token || '');
  if (!m) return token;
  return props[m[1]] !== undefined ? props[m[1]] : token;
}

function scan(repoPath) {
  const buildGradle = readIfExists(path.join(repoPath, 'build.gradle'));
  if (!buildGradle) return null;

  const props = parseProperties(readIfExists(path.join(repoPath, 'gradle.properties')));
  const versions = {};

  const bootMatch = /id\s*\(?\s*['"]org\.springframework\.boot['"]\s*\)?\s+version\s*\(?\s*['"]([^'"]+)['"]/.exec(buildGradle);
  if (bootMatch) versions['Spring Boot'] = resolveVar(bootMatch[1], props);

  const javaToolchain = /languageVersion\s*=\s*JavaLanguageVersion\.of\(\s*(\d+)\s*\)/.exec(buildGradle);
  const javaSourceCompat = /sourceCompatibility\s*=\s*['"]?(?:JavaVersion\.VERSION_)?(\d+)['"]?/.exec(buildGradle);
  if (javaToolchain) versions['Java'] = javaToolchain[1];
  else if (javaSourceCompat) versions['Java'] = javaSourceCompat[1];

  const resilienceMatch = /io\.github\.resilience4j:resilience4j-[\w-]+:([\w${}.]+)/.exec(buildGradle);
  if (resilienceMatch) versions['Resilience4j'] = resolveVar(resilienceMatch[1], props);

  const springdocMatch = /org\.springdoc:springdoc-openapi-[\w-]+:([\w${}.]+)/.exec(buildGradle);
  if (springdocMatch) versions['springdoc-openapi'] = resolveVar(springdocMatch[1], props);

  const wrapperProps = readIfExists(path.join(repoPath, 'gradle', 'wrapper', 'gradle-wrapper.properties'));
  const gradleMatch = /gradle-([\d.]+)-(?:bin|all)\.zip/.exec(wrapperProps);
  if (gradleMatch) versions['Gradle'] = gradleMatch[1];

  return versions;
}

module.exports = { scan, parseProperties, resolveVar };
