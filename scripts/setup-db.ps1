# ─────────────────────────────────────────────────────────────
#  Создание базы данных и ролей (однократная настройка)
#  Требует прав суперпользователя PostgreSQL (параметры в .env).
#  Запуск: powershell -ExecutionPolicy Bypass -File scripts\setup-db.ps1
# ─────────────────────────────────────────────────────────────
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $projectRoot '.env'

if (-not (Test-Path -LiteralPath $envFile)) {
    throw "Configuration file not found: $envFile. Copy .env.example to .env first."
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
$psql = if ($pgBin) { Join-Path $pgBin 'psql.exe' } else { 'psql' }

$pgHost = Get-Setting 'PG_HOST' '127.0.0.1'
$pgPort = Get-Setting 'PG_PORT' '5432'
$superUser = Get-Setting 'PG_SUPERUSER_USER' ''
$superPassword = Get-Setting 'PG_SUPERUSER_PASSWORD' ''

if (-not $superUser -or -not $superPassword) {
    throw 'PG_SUPERUSER_USER / PG_SUPERUSER_PASSWORD are required in .env'
}

$ownerPass = Get-Setting 'PG_OWNER_PASSWORD' ''
$appPass = Get-Setting 'PG_APP_PASSWORD' ''
$readonlyPass = Get-Setting 'PG_READONLY_PASSWORD' ''
$backupPass = Get-Setting 'PG_BACKUP_PASSWORD' ''

if (-not $ownerPass -or -not $appPass -or -not $readonlyPass -or -not $backupPass) {
    throw 'Database role passwords are not set in .env'
}

$sqlFile = Join-Path $projectRoot 'apps\server\sql\00_roles.sql'
if (-not (Test-Path -LiteralPath $sqlFile)) {
    throw "SQL file not found: $sqlFile"
}

$env:PGPASSWORD = $superPassword
$env:PGCLIENTENCODING = 'UTF8'
try {
    Write-Host "Applying roles and database setup as '$superUser'..."

    # psql пишет NOTICE в stderr; при ErrorActionPreference=Stop PowerShell
    # превращает это в исключение. Перехватываем вывод и проверяем код возврата.
    $previousPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    $psqlOutput = & $psql -X -h $pgHost -p $pgPort -U $superUser -d postgres -v ON_ERROR_STOP=1 `
        -v "owner_pass=$ownerPass" `
        -v "app_pass=$appPass" `
        -v "readonly_pass=$readonlyPass" `
        -v "backup_pass=$backupPass" `
        -f $sqlFile 2>&1
    $psqlExitCode = $LASTEXITCODE
    $ErrorActionPreference = $previousPreference

    $psqlOutput | ForEach-Object { Write-Host $_ }

    if ($psqlExitCode -ne 0) {
        throw "psql failed with exit code $psqlExitCode"
    }
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
}

Write-Host 'Database and roles are ready.'
