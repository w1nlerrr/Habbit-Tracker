# ─────────────────────────────────────────────────────────────
#  Скрипт восстановления базы данных из резервной копии (pg_restore)
#  Запуск: powershell -ExecutionPolicy Bypass -File scripts\restore.ps1 -File <путь.dump>
#  Параметр -Force отключает интерактивное подтверждение.
# ─────────────────────────────────────────────────────────────
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$File,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $projectRoot '.env'

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Configuration file not found: $envFile"
}

$config = @{}
Get-Content -LiteralPath $envFile | ForEach-Object {
    if ($_ -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $config[$Matches[1]] = $Matches[2].Trim()
    }
}

function Get-Setting([string]$name, [string]$defaultValue) {
    if ($config.ContainsKey($name) -and $config[$name]) { return $config[$name] }
    return $defaultValue
}

$pgBin = Get-Setting 'PG_BIN' ''
$pgRestore = if ($pgBin) { Join-Path $pgBin 'pg_restore.exe' } else { 'pg_restore' }
$psql = if ($pgBin) { Join-Path $pgBin 'psql.exe' } else { 'psql' }

$pgHost = Get-Setting 'PG_HOST' '127.0.0.1'
$pgPort = Get-Setting 'PG_PORT' '5432'
$pgDatabase = Get-Setting 'PG_DATABASE' 'habit_tracker'
$pgUser = Get-Setting 'PG_OWNER_USER' 'ht_owner'
$pgPassword = Get-Setting 'PG_OWNER_PASSWORD' ''

if (-not $pgPassword) {
    throw 'PG_OWNER_PASSWORD is empty in .env'
}

if (-not (Test-Path -LiteralPath $File)) {
    throw "Backup file not found: $File"
}

$resolvedFile = (Resolve-Path -LiteralPath $File).Path
$hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $resolvedFile).Hash.ToLower()

$sidecar = "$resolvedFile.sha256"
if (Test-Path -LiteralPath $sidecar) {
    $expected = ((Get-Content -LiteralPath $sidecar -Raw).Trim() -split '\s+')[0].ToLower()
    if ($expected -and $expected -ne $hash) {
        throw "Checksum mismatch: expected $expected, actual $hash"
    }
    Write-Host "Checksum verified: $hash"
}
else {
    Write-Host "Warning: checksum file not found, calculated SHA-256: $hash"
}

if (-not $Force) {
    $answer = Read-Host 'All current data will be replaced. Type "yes" to continue'
    if ($answer -ne 'yes') {
        Write-Host 'Cancelled.'
        exit 1
    }
}

$env:PGPASSWORD = $pgPassword
try {
    Write-Host "Restoring from: $resolvedFile"

    & $pgRestore -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase --clean --if-exists --no-owner --no-privileges $resolvedFile
    if ($LASTEXITCODE -ne 0) {
        throw "pg_restore failed with exit code $LASTEXITCODE"
    }

    Write-Host 'Running smoke check...'
    & $psql -h $pgHost -p $pgPort -U $pgUser -d $pgDatabase -X -A -t -c 'select count(*) from users; select count(*) from habits;'
    if ($LASTEXITCODE -ne 0) {
        throw "Smoke check failed with exit code $LASTEXITCODE"
    }
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host 'Restore completed successfully.'
