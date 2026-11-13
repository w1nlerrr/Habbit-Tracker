# ─────────────────────────────────────────────────────────────
#  Первичная настройка проекта на новом компьютере.
#  Вызывается автоматически из start.bat, если нет файла .env.
#
#  Что делает:
#   1. находит PostgreSQL (PATH, реестр, стандартные каталоги);
#   2. спрашивает логин/пароль суперпользователя PostgreSQL;
#   3. генерирует .env со случайными паролями ролей и JWT-секретами;
#   4. создаёт базу habit_tracker и роли (ht_owner/ht_app/ht_readonly/ht_backup);
#   5. устанавливает зависимости, собирает проект, применяет миграции и демо-данные.
#
#  Неинтерактивный режим (для автотестов):
#    bootstrap.ps1 -SuperUser postgres -SuperPassword *** -SkipSeed
# ─────────────────────────────────────────────────────────────
[CmdletBinding()]
param(
    [string]$SuperUser = '',
    [string]$SuperPassword = '',
    [switch]$SkipSeed,
    [switch]$Force
)

$ErrorActionPreference = 'Stop'

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$envFile = Join-Path $projectRoot '.env'
$envExample = Join-Path $projectRoot '.env.example'

function Write-Step([string]$message) {
    Write-Host ''
    Write-Host "==> $message" -ForegroundColor Cyan
}

function New-Secret([int]$length = 24) {
    $bytes = New-Object byte[] 32
    $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
    try { $rng.GetBytes($bytes) } finally { $rng.Dispose() }
    $base = [Convert]::ToBase64String($bytes).Replace('+', '').Replace('/', '').Replace('=', '')
    if ($base.Length -lt $length) { return $base }
    return $base.Substring(0, $length)
}

function Resolve-PgBin {
    $psql = Get-Command psql.exe -ErrorAction SilentlyContinue
    if ($psql) { return (Split-Path -Parent $psql.Source) }

    # Служба PostgreSQL знает путь к своим утилитам: "...\bin\pg_ctl.exe" runservice ...
    $services = Get-CimInstance Win32_Service -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -like 'postgresql*' }
    foreach ($service in $services) {
        if ($service.PathName -match '^"?(?<base>[A-Za-z]:\\[^"]*?)\\bin\\pg_ctl\.exe"?') {
            $candidate = Join-Path $Matches['base'] 'bin'
            if (Test-Path -LiteralPath (Join-Path $candidate 'psql.exe')) { return $candidate }
        }
    }

    $installations = Get-ItemProperty 'HKLM:\SOFTWARE\PostgreSQL\Installations\*' -ErrorAction SilentlyContinue
    foreach ($installation in $installations) {
        $base = $installation.BaseDirectory
        if ($base) {
            $candidate = Join-Path $base 'bin'
            if (Test-Path -LiteralPath (Join-Path $candidate 'psql.exe')) { return $candidate }
        }
    }

    $searchRoots = @('C:\Program Files\PostgreSQL', 'D:\Program Files\PostgreSQL', 'D:\PostgreSQL')
    foreach ($root in $searchRoots) {
        if (-not (Test-Path -LiteralPath $root)) { continue }
        $found = Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue |
            ForEach-Object { Join-Path $_.FullName 'bin' } |
            Where-Object { Test-Path -LiteralPath (Join-Path $_ 'psql.exe') } |
            Select-Object -First 1
        if ($found) { return $found }
    }

    # Нестандартная установка: ищем каталоги вида D:\post\18\bin.
    foreach ($drive in @('C:\', 'D:\')) {
        $candidates = Get-ChildItem -LiteralPath $drive -Directory -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '(?i)^post' }
        foreach ($candidateDir in $candidates) {
            $bins = Get-ChildItem -LiteralPath $candidateDir.FullName -Directory -ErrorAction SilentlyContinue |
                ForEach-Object { Join-Path $_.FullName 'bin' } |
                Where-Object { Test-Path -LiteralPath (Join-Path $_ 'psql.exe') }
            if ($bins) { return ($bins | Select-Object -First 1) }
        }
    }

    return ''
}

if ((Test-Path -LiteralPath $envFile) -and -not $Force) {
    Write-Host 'Configuration .env already exists. Nothing to do.'
    exit 0
}

if (-not (Test-Path -LiteralPath $envExample)) {
    throw "Template not found: $envExample"
}

Write-Step 'Поиск PostgreSQL'
$pgBin = Resolve-PgBin
if (-not $pgBin) {
    throw 'PostgreSQL utilities (psql.exe) not found. Install PostgreSQL 16+ and run start.bat again.'
}
Write-Host "PostgreSQL: $pgBin"

Write-Step 'Параметры суперпользователя PostgreSQL'
if (-not $SuperUser) {
    $entered = Read-Host 'Имя суперпользователя PostgreSQL (Enter = postgres)'
    $SuperUser = if ($entered) { $entered } else { 'postgres' }
}
if (-not $SuperPassword) {
    $secure = Read-Host "Пароль пользователя $SuperUser" -AsSecureString
    $SuperPassword = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto(
        [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    )
}
if (-not $SuperPassword) {
    throw 'Password is required.'
}

Write-Step 'Генерация .env'
$ownerPass = New-Secret 24
$appPass = New-Secret 24
$readonlyPass = New-Secret 24
$backupPass = New-Secret 24
$accessSecret = New-Secret 48
$refreshSecret = New-Secret 48

$template = Get-Content -LiteralPath $envExample -Raw

$replacements = @{
    'postgresql://ht_app:CHANGE_ME@127.0.0.1:5432/habit_tracker?schema=public' = "postgresql://ht_app:$appPass@127.0.0.1:5432/habit_tracker?schema=public"
    'postgresql://ht_owner:CHANGE_ME@127.0.0.1:5432/habit_tracker?schema=public' = "postgresql://ht_owner:$ownerPass@127.0.0.1:5432/habit_tracker?schema=public"
    'PG_OWNER_PASSWORD=CHANGE_ME' = "PG_OWNER_PASSWORD=$ownerPass"
    'PG_APP_PASSWORD=CHANGE_ME' = "PG_APP_PASSWORD=$appPass"
    'PG_READONLY_PASSWORD=CHANGE_ME' = "PG_READONLY_PASSWORD=$readonlyPass"
    'PG_BACKUP_PASSWORD=CHANGE_ME' = "PG_BACKUP_PASSWORD=$backupPass"
    'PG_SUPERUSER_USER=postgres' = "PG_SUPERUSER_USER=$SuperUser"
    'PG_SUPERUSER_PASSWORD=CHANGE_ME' = "PG_SUPERUSER_PASSWORD=$SuperPassword"
    'JWT_ACCESS_SECRET=change-me-please-32-characters-min' = "JWT_ACCESS_SECRET=$accessSecret"
    'JWT_REFRESH_SECRET=change-me-please-32-characters-min' = "JWT_REFRESH_SECRET=$refreshSecret"
    'PG_BIN=D:\post\18\bin' = "PG_BIN=$pgBin"
    'SERVE_CLIENT=false' = 'SERVE_CLIENT=true'
}

foreach ($key in $replacements.Keys) {
    $template = $template.Replace($key, $replacements[$key])
}

[System.IO.File]::WriteAllText($envFile, $template, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "Created: $envFile"

Write-Step 'Создание базы данных и ролей'
& (Join-Path $PSScriptRoot 'setup-db.ps1')
if ($LASTEXITCODE -ne 0) {
    throw 'Database setup failed. Check PostgreSQL credentials in .env and try again.'
}

Write-Step 'Установка зависимостей (npm install)'
# npm пишет предупреждения в stderr — не считаем их ошибками, проверяем код возврата.
# Важно: для установки и сборки нужны devDependencies, поэтому NODE_ENV
# принудительно переводится в development (start.bat выставляет production
# только для запуска сервера).
$previousPreference = $ErrorActionPreference
$previousNodeEnv = $env:NODE_ENV
$ErrorActionPreference = 'Continue'
$env:NODE_ENV = 'development'
Push-Location $projectRoot
try {
    & npm install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { throw "npm install failed with exit code $LASTEXITCODE" }

    Write-Step 'Сборка проекта'
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw "Build failed with exit code $LASTEXITCODE" }

    Write-Step 'Применение миграций'
    & npm run db:deploy -w @habit/server
    if ($LASTEXITCODE -ne 0) { throw "Migration failed with exit code $LASTEXITCODE" }

    if (-not $SkipSeed) {
        Write-Step 'Загрузка демонстрационных данных'
        & npm run db:seed -w @habit/server
        if ($LASTEXITCODE -ne 0) {
            Write-Warning 'Demo data was not loaded (you can skip this step).'
        }
    }
}
finally {
    Pop-Location
    $env:NODE_ENV = $previousNodeEnv
    $ErrorActionPreference = $previousPreference
}

Write-Host ''
Write-Host 'Setup completed. Starting the application...' -ForegroundColor Green
