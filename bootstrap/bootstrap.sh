#!/usr/bin/env bash
# Arranque en frio (Linux/macOS): verifica que Node y Docker existan antes
# de que "npm install -g" pueda funcionar. Toda la logica real del CLI vive
# en Node (bin/klap.js); este script SOLO resuelve el problema del huevo y
# la gallina.
set -euo pipefail

echo "klap-brain — bootstrap (Linux/macOS)"
echo

if command -v node >/dev/null 2>&1; then
  echo "[OK] Node $(node --version)"
else
  echo "[!!] Node no encontrado. Instala Node >= 18: https://nodejs.org"
  exit 1
fi

if command -v docker >/dev/null 2>&1; then
  echo "[OK] Docker encontrado"
else
  echo "[!!] Docker no encontrado."
  echo "     (klap funciona sin Docker salvo para 'klap graph *' — la proyeccion Neo4j)"
fi

if command -v git >/dev/null 2>&1; then
  echo "[OK] git encontrado"
else
  echo "[!!] git no encontrado — necesario para 'klap scan --repos-dir'"
fi

echo
echo "Listo. Ahora: npm install -g . (desde esta carpeta) y luego 'klap doctor'."
