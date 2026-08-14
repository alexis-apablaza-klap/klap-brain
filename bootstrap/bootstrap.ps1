# Arranque en frio (solo Windows): verifica que Node y Docker existan antes
# de que "npm link" pueda funcionar. Toda la logica real del CLI vive
# en Node (bin/klap.js); este script SOLO resuelve el problema del huevo y
# la gallina (necesitas Node para correr klap, pero klap no puede
# instalarse solo).

$ErrorActionPreference = 'Stop'

function Test-Cmd($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

Write-Host "klap-brain — bootstrap (Windows)`n"

if (Test-Cmd 'node') {
    $nodeVersion = (node --version)
    Write-Host "[OK] Node $nodeVersion"
} else {
    Write-Host "[!!] Node no encontrado. Instala Node >= 18: https://nodejs.org (o 'winget install OpenJS.NodeJS.LTS')"
    exit 1
}

if (Test-Cmd 'docker') {
    Write-Host "[OK] Docker encontrado"
} else {
    Write-Host "[!!] Docker no encontrado. Instala Docker Desktop: https://www.docker.com/products/docker-desktop"
    Write-Host "     (klap funciona sin Docker salvo para 'klap graph *' — la proyeccion Neo4j)"
}

if (Test-Cmd 'git') {
    Write-Host "[OK] git encontrado"
} else {
    Write-Host "[!!] git no encontrado — necesario para 'klap scan --repos-dir'"
}

Write-Host "`nListo. Ahora: npm link (desde esta carpeta — symlink, no copia; 'git pull' alcanza a 'klap' sin reinstalar) y luego 'klap doctor'."
