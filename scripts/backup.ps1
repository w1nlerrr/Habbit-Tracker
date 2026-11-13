# ─────────────────────────────────────────────────────────────
#  Скрипт резервного копирования базы данных (pg_dump, custom format)
#  Запуск: powershell -ExecutionPolicy Bypass -File scripts\backup.ps1
#  Параметры: -OutputDir <папка>, -KeepDays <дней хранения>
# ─────────────────────────────────────────────────────────────
[CmdletBinding()]
param(
    [string]$OutputDir,
    [int]$KeepDays = 0
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
$pgDump = if ($pgBin) { Join-Path $pgBin 'pg_dump.exe' } else { 'pg_dump' }
$pgHost = Get-Setting 'PG_HOST' '127.0.0.1'
$pgPort = Get-Setting 'PG_PORT' '5432'
$pgDatabase = Get-Setting 'PG_DATABASE' 'habit_tracker'
$pgUser = Get-Setting 'PG_OWNER_USER' 'ht_owner'
$pgPassword = Get-Setting 'PG_OWNER_PASSWORD' ''

if (-not $pgPassword) {
    throw 'PG_OWNER_PASSWORD is empty in .env'
}

if (-not $OutputDir) {
    $OutputDir = Get-Setting 'BACKUP_DIR' (Join-Path $projectRoot 'data\backups')
}

$retentionDays = if ($KeepDays -gt 0) { $KeepDays } else { [int](Get-Setting 'BACKUP_KEEP_DAYS' '14') }

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$fileName = "habit_tracker-$stamp.dump"
$filePath = Join-Path $OutputDir $fileName

$env:PGPASSWORD = $pgPassword
try {
    Write-Host "Creating backup: $filePath"

    & $pgDump -h $pgHost -p $pgPort -U $pgUser -Fc -f $filePath $pgDatabase
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump failed with exit code $LASTEXITCODE"
    }

    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $filePath).Hash.ToLower()
    "$hash  $fileName" | Set-Content -LiteralPath "$filePath.sha256" -Encoding ASCII

    $sizeMb = [math]::Round((Get-Item -LiteralPath $filePath).Length / 1MB, 2)
    Write-Host "Backup created: $fileName ($sizeMb MB)"
    Write-Host "SHA-256: $hash"
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

# Ротация: удаляем копии старше срока хранения.
$cutoff = (Get-Date).AddDays(-$retentionDays)
Get-ChildItem -LiteralPath $OutputDir -Filter 'habit_tracker-*.dump' |
    Where-Object { $_.LastWriteTime -lt $cutoff } |
    ForEach-Object {
        Write-Host "Removing expired backup: $($_.Name)"
        Remove-Item -LiteralPath $_.FullName -Force
        $sidecar = "$($_.FullName).sha256"
        if (Test-Path -LiteralPath $sidecar) {
            Remove-Item -LiteralPath $sidecar -Force
        }
    }

Write-Host 'Done.'
