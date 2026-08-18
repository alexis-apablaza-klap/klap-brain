'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const javaScan = require('../src/lib/stack-scan/java');
const npmScan = require('../src/lib/stack-scan/npm');

function tmpRepo() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'klap-brain-stack-scan-test-'));
}

function cleanup(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

test('java scan: resuelve ${springBootVersion} desde gradle.properties (patron real verificado)', () => {
  const dir = tmpRepo();
  fs.writeFileSync(path.join(dir, 'build.gradle'), [
    "plugins {",
    "    id 'java'",
    "    id 'org.springframework.boot' version \"${springBootVersion}\"",
    "}",
    "java {",
    "    toolchain {",
    "        languageVersion = JavaLanguageVersion.of(21)",
    "    }",
    "}",
  ].join('\n'));
  fs.writeFileSync(path.join(dir, 'gradle.properties'), 'springBootVersion=3.5.6\n');
  fs.mkdirSync(path.join(dir, 'gradle', 'wrapper'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'gradle', 'wrapper', 'gradle-wrapper.properties'),
    'distributionUrl=https\\://services.gradle.org/distributions/gradle-8.11.1-bin.zip\n');

  const versions = javaScan.scan(dir);
  assert.equal(versions['Spring Boot'], '3.5.6');
  assert.equal(versions['Java'], '21');
  assert.equal(versions['Gradle'], '8.11.1');
  cleanup(dir);
});

test('java scan: repo sin build.gradle devuelve null (no es un repo Java)', () => {
  const dir = tmpRepo();
  assert.equal(javaScan.scan(dir), null);
  cleanup(dir);
});

test('npm scan: Angular/TypeScript desde dependencies/devDependencies, sin prefijo ^/~', () => {
  const dir = tmpRepo();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    dependencies: { '@angular/core': '^19.2.0' },
    devDependencies: { typescript: '~5.7.2' },
  }));
  const versions = npmScan.scan(dir);
  assert.equal(versions['Angular'], '19.2.0');
  assert.equal(versions['TypeScript'], '5.7.2');
  cleanup(dir);
});

test('npm scan: Node prefiere engines.node sobre @types/node cuando ambos existen', () => {
  const dir = tmpRepo();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    devDependencies: { '@types/node': '^20.12.12' },
    engines: { node: '>=22.0.0' },
  }));
  const versions = npmScan.scan(dir);
  assert.equal(versions['Node'], '>=22.0.0'.replace(/^[\^~v]/, ''));
  cleanup(dir);
});

test('npm scan: sin engines.node, usa @types/node como proxy', () => {
  const dir = tmpRepo();
  fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({
    devDependencies: { '@types/node': '^20.12.12' },
  }));
  const versions = npmScan.scan(dir);
  assert.equal(versions['Node'], '20.12.12');
  cleanup(dir);
});
