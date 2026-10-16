$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '../../..'))
$taskPortable=Join-Path $taskRoot 'frontend/scratch/pg-portable'
$taskBin=Join-Path $taskPortable 'runtime/pgsql/bin'
$taskCluster=Join-Path $taskPortable ('classic-'+[Guid]::NewGuid().ToString('N'))
$taskProbe=[Net.Sockets.TcpClient]::new();$taskOccupied=$false
try{$taskProbe.Connect('127.0.0.1',55439);$taskOccupied=$true}catch [Net.Sockets.SocketException]{}finally{$taskProbe.Dispose()}
if($taskOccupied){throw 'El puerto aislado 55439 está ocupado; no se tocará ese servicio.'}
$taskServer=$null
$taskPreviousFlag=$env:DTS_CLASSIC_SQL_TEST;$taskPreviousUrl=$env:DTS_CLASSIC_SQL_URL
try {
 & (Join-Path $taskBin 'initdb.exe') -D $taskCluster -U classic_review -A trust --no-locale --encoding=UTF8
 if($LASTEXITCODE -ne 0){throw 'No se pudo crear la base aislada.'}
 $taskServer=Start-Process -FilePath (Join-Path $taskBin 'postgres.exe') -ArgumentList @('-D',('"'+$taskCluster+'"'),'-h','127.0.0.1','-p','55439') -WindowStyle Hidden -PassThru -RedirectStandardOutput ($taskCluster+'.stdout.log') -RedirectStandardError ($taskCluster+'.stderr.log')
 $taskReady=$false
 for($taskAttempt=0;$taskAttempt -lt 40;$taskAttempt++){
  & (Join-Path $taskBin 'pg_isready.exe') -h 127.0.0.1 -p 55439 -U classic_review -d postgres -q
  if($LASTEXITCODE -eq 0){$taskReady=$true;break};Start-Sleep -Milliseconds 250
 }
 if(-not $taskReady){throw 'No arrancó el PostgreSQL aislado.'}
 & (Join-Path $taskBin 'createdb.exe') -h 127.0.0.1 -p 55439 -U classic_review classic_review
 if($LASTEXITCODE -ne 0){throw 'No se pudo crear el esquema aislado.'}
 $env:DTS_CLASSIC_SQL_TEST='1';$env:DTS_CLASSIC_SQL_URL='postgresql://classic_review@127.0.0.1:55439/classic_review'
 Push-Location (Join-Path $taskRoot 'backend')
 try{& npm.cmd test -- --runInBand classic-sql.integration.spec.ts;if($LASTEXITCODE -ne 0){throw 'Fallaron las pruebas de Classic.'}}finally{Pop-Location}
}finally{
 if($taskServer -and -not $taskServer.HasExited){& (Join-Path $taskBin 'pg_ctl.exe') -D $taskCluster -m fast -w stop}
 $env:DTS_CLASSIC_SQL_TEST=$taskPreviousFlag;$env:DTS_CLASSIC_SQL_URL=$taskPreviousUrl
}
