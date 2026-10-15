$ErrorActionPreference = 'Stop'
$reviewRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$portableRoot = [IO.Path]::GetFullPath((Join-Path $reviewRoot 'frontend/scratch/pg-portable'))
if (-not $portableRoot.StartsWith($reviewRoot + [IO.Path]::DirectorySeparatorChar)) { throw 'Ruta de revisión incorrecta' }
$binRoot = Join-Path $portableRoot 'runtime/pgsql/bin'
$dataRoot = Join-Path $portableRoot ('data-' + [Guid]::NewGuid().ToString('N'))
$logPath = Join-Path $portableRoot ('postgres-' + [Guid]::NewGuid().ToString('N') + '.log')
$pgControl = Join-Path $binRoot 'pg_ctl.exe'
$sqlClient = Join-Path $binRoot 'psql.exe'
$databaseClient = Join-Path $binRoot 'createdb.exe'
$postgresServer = Join-Path $binRoot 'postgres.exe'
$schemaPath = Join-Path $portableRoot 'review-schema.sql'
$apiDatabase = 'dts_crm_api_review'
$apiUrl = 'postgresql://crm_review:local_review_only@127.0.0.1:55436/dts_crm_api_review'
$savedEnvironment = @{}
$environmentKeys = @('DATABASE_URL','JWT_SECRET','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','CRM_PROSPECTS_PILOT_ENABLED','CRM_CUTS_AUTOMATION_ENABLED','CRM_OUTLOOK_PILOT_ENABLED','DTS_REVIEW_API_INTEGRATION')
foreach ($key in $environmentKeys) { $savedEnvironment[$key] = [Environment]::GetEnvironmentVariable($key, 'Process') }
$started = $false
$serverProcess = $null
function Assert-NativeSuccess { if ($LASTEXITCODE -ne 0) { throw "Falló la operación PostgreSQL aislada: $LASTEXITCODE" } }
function Assert-ReviewPortFree {
  $client = [Net.Sockets.TcpClient]::new()
  $occupied = $false
  try { $client.Connect('127.0.0.1', 55436); $occupied = $true }
  catch [Net.Sockets.SocketException] { }
  finally { $client.Dispose() }
  if ($occupied) { throw 'El puerto local de pruebas 55436 ya está ocupado; no se modificará ese servicio' }
}
if (-not (Test-Path -LiteralPath $pgControl)) { throw 'Faltan los binarios portátiles de PostgreSQL' }
Assert-ReviewPortFree
try {
  & (Join-Path $binRoot 'initdb.exe') -D $dataRoot -U crm_review -A trust --encoding=UTF8 --locale=C
  Assert-NativeSuccess
  $serverProcess = Start-Process -FilePath $postgresServer -ArgumentList @('-D', $dataRoot, '-h', '127.0.0.1', '-p', '55436') -WindowStyle Hidden -RedirectStandardOutput ($logPath + '.out') -RedirectStandardError ($logPath + '.err') -PassThru
  $started = $true
  $ready = $false
  for ($attempt = 0; $attempt -lt 120; $attempt++) {
    if ($serverProcess.HasExited) { throw "PostgreSQL aislado terminó al arrancar: $([string](Get-Content -LiteralPath ($logPath + '.err') -ErrorAction SilentlyContinue))" }
    $probe = & $sqlClient -h 127.0.0.1 -p 55436 -U crm_review -d postgres -Atc 'SELECT 1' 2>$null
    if ($LASTEXITCODE -eq 0 -and $probe -eq '1') { $ready = $true; break }
    Start-Sleep -Milliseconds 250
  }
  if (-not $ready) { throw "PostgreSQL aislado no abrió el puerto reservado. Registro: $([string](Get-Content -LiteralPath ($logPath + '.err') -ErrorAction SilentlyContinue))" }
  & (Join-Path $binRoot 'createdb.exe') -h 127.0.0.1 -p 55436 -U crm_review dts_crm_review
  Assert-NativeSuccess
  & $sqlClient -h 127.0.0.1 -p 55436 -U crm_review -d dts_crm_review -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'bootstrap.sql')
  Assert-NativeSuccess
  & $sqlClient -h 127.0.0.1 -p 55436 -U crm_review -d dts_crm_review -v ON_ERROR_STOP=1 -f (Join-Path $reviewRoot 'backend/prisma/proposals/2026-10-13-cortes-pipeline-piloto.sql')
  Assert-NativeSuccess
  & $sqlClient -h 127.0.0.1 -p 55436 -U crm_review -d dts_crm_review -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'verify-cuts.sql')
  Assert-NativeSuccess
  Write-Output 'PASS: propuesta SQL y comprobaciones reales completadas en PostgreSQL aislado.'
  & $sqlClient -h 127.0.0.1 -p 55436 -U crm_review -d dts_crm_review -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'verify-offer-contact-migration.sql')
  Assert-NativeSuccess

  & $databaseClient -h 127.0.0.1 -p 55436 -U crm_review $apiDatabase
  Assert-NativeSuccess
  & $sqlClient -h 127.0.0.1 -p 55436 -U crm_review -d $apiDatabase -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"'
  Assert-NativeSuccess
  $backendRoot = Join-Path $reviewRoot 'backend'
  Push-Location $backendRoot
  try {
    $env:DATABASE_URL = $apiUrl
    & (Join-Path $backendRoot 'node_modules/.bin/prisma.cmd') migrate diff --from-empty --to-schema '.\prisma\schema.prisma' --script -o $schemaPath
    Assert-NativeSuccess
  } finally { Pop-Location }
  $schemaSql = Get-Content -LiteralPath $schemaPath -Raw
  # El esquema de la app depende de auth.users; el resto de auth pertenece a Supabase
  # y contiene expresiones propias de la plataforma que no forman parte de esta prueba.
  $schemaSql = [regex]::Replace($schemaSql, '(?ms)^-- CreateEnum\r?\nCREATE TYPE "auth"\..*?;\r?\n', '')
  $schemaSql = [regex]::Replace($schemaSql, '(?ms)^-- CreateTable\r?\nCREATE TABLE "auth"\..*?^\);\r?\n', '')
  $schemaSql = [regex]::Replace($schemaSql, '(?ms)^CREATE (?:UNIQUE )?INDEX .*? ON "auth"\."[^"]*".*?;\r?\n', '')
  $schemaSql = [regex]::Replace($schemaSql, '(?ms)^-- AddForeignKey\r?\nALTER TABLE "auth"\..*?;\r?\n', '')
  $schemaSql = [regex]::Replace($schemaSql, '(?m)^(CREATE SCHEMA IF NOT EXISTS "auth";\r?\n)', '$1CREATE TABLE "auth"."users" ("id" UUID NOT NULL PRIMARY KEY, "email" TEXT);' + [Environment]::NewLine)
  Set-Content -LiteralPath $schemaPath -Value $schemaSql -Encoding utf8
  & $sqlClient -h 127.0.0.1 -p 55436 -U crm_review -d $apiDatabase -v ON_ERROR_STOP=1 -f $schemaPath
  Assert-NativeSuccess
  & $sqlClient -h 127.0.0.1 -p 55436 -U crm_review -d $apiDatabase -v ON_ERROR_STOP=1 -f (Join-Path $reviewRoot 'backend/prisma/proposals/2026-10-14-recrear-seguimiento-sin-owner.sql')
  Assert-NativeSuccess
  & $sqlClient -h 127.0.0.1 -p 55436 -U crm_review -d $apiDatabase -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'api-fixtures.sql')
  Assert-NativeSuccess

  $env:DATABASE_URL = $apiUrl
  $env:JWT_SECRET = 'isolated-crm-review-only-secret'
  $env:SUPABASE_URL = 'http://127.0.0.1:1'
  $env:SUPABASE_SERVICE_ROLE_KEY = 'local-review-no-network-key'
  $env:CRM_PROSPECTS_PILOT_ENABLED = 'true'
  $env:CRM_CUTS_AUTOMATION_ENABLED = 'false'
  $env:CRM_OUTLOOK_PILOT_ENABLED = 'false'
  $env:DTS_REVIEW_API_INTEGRATION = '1'
  Push-Location $backendRoot
  try {
    & npm.cmd test -- --runInBand modules/quotes/pipeline-cuts.http.integration.spec.ts
    Assert-NativeSuccess
  } finally { Pop-Location }
  Write-Output 'PASS: endpoints HTTP, JWT, matriz de permisos, cortes, informes y ámbitos con esquema Prisma aislado.'
} finally {
  if ($started) {
    & $pgControl -D $dataRoot -m fast -w stop
    Assert-NativeSuccess
    if ($serverProcess -and -not $serverProcess.HasExited) { Wait-Process -Id $serverProcess.Id -Timeout 20 }
  }
  foreach ($key in $environmentKeys) { [Environment]::SetEnvironmentVariable($key, $savedEnvironment[$key], 'Process') }
}
