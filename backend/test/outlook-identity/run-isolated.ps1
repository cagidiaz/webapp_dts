$ErrorActionPreference = 'Stop'
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$portable = Join-Path $workspace 'frontend/scratch/pg-portable'
$bin = Join-Path $portable 'runtime/pgsql/bin'
$cluster = [IO.Path]::GetFullPath((Join-Path $portable ('outlook-identity-' + [Guid]::NewGuid().ToString('N'))))
if (-not $cluster.StartsWith($portable + [IO.Path]::DirectorySeparatorChar,[StringComparison]::OrdinalIgnoreCase)) { throw 'Ruta fuera de la carpeta aislada' }
if (-not (Test-Path -LiteralPath (Join-Path $bin 'initdb.exe'))) { throw 'Faltan los binarios PostgreSQL portátiles ya usados por las pruebas del proyecto' }
$portCheck = [Net.Sockets.TcpClient]::new()
$occupied = $false
try { $portCheck.Connect('127.0.0.1',55438); $occupied = $true } catch [Net.Sockets.SocketException] { } finally { $portCheck.Dispose() }
if ($occupied) { throw 'El puerto de pruebas 55438 está ocupado; no se tocará ese servicio' }
function Assert-Exit { if ($LASTEXITCODE -ne 0) { throw "Falló una operación PostgreSQL aislada: $LASTEXITCODE" } }
$server = $null
try {
  & (Join-Path $bin 'initdb.exe') -D $cluster -U outlook_review -A trust --no-locale --encoding=UTF8
  Assert-Exit
  $server = Start-Process -FilePath (Join-Path $bin 'postgres.exe') -ArgumentList @('-D',('"'+$cluster+'"'),'-h','127.0.0.1','-p','55438') -WindowStyle Hidden -PassThru -RedirectStandardOutput ($cluster+'.stdout.log') -RedirectStandardError ($cluster+'.stderr.log')
  $ready = $false
  for ($attempt=0;$attempt -lt 20;$attempt++) {
    & (Join-Path $bin 'pg_isready.exe') -h 127.0.0.1 -p 55438 -U outlook_review -d postgres -q
    if ($LASTEXITCODE -eq 0) { $ready = $true; break }
    if ($server.HasExited) { throw 'El servidor aislado no ha podido iniciar' }
    Start-Sleep -Milliseconds 500
  }
  if (-not $ready) { throw 'Tiempo agotado al iniciar la base aislada' }
  & (Join-Path $bin 'createdb.exe') -h 127.0.0.1 -p 55438 -U outlook_review outlook_identity_review
  Assert-Exit
  & (Join-Path $bin 'psql.exe') -h 127.0.0.1 -p 55438 -U outlook_review -d outlook_identity_review -v ON_ERROR_STOP=1 -f (Join-Path $PSScriptRoot 'verify-migration.sql')
  Assert-Exit
  Write-Output 'PASS: SQL de identidad de correos comprobado exclusivamente en PostgreSQL local aislado.'
} finally {
  if ($server -and -not $server.HasExited) {
    & (Join-Path $bin 'pg_ctl.exe') -D $cluster -m fast -w stop
    Assert-Exit
  }
}
