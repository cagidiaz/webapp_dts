param([switch]$UnsignedTest)
$ErrorActionPreference='Stop'
$taskRoot=[IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$taskCompiler=Join-Path $env:WINDIR 'Microsoft.NET/Framework/v4.0.30319/csc.exe'
if(-not(Test-Path -LiteralPath $taskCompiler)){throw 'Se requiere .NET Framework 4.x para compilar el componente Windows.'}
$taskOutput=if($UnsignedTest){Join-Path $taskRoot 'frontend/scratch/outlook-classic-unsigned'}else{Join-Path $taskRoot 'frontend/public/downloads/outlook-classic'}
New-Item -ItemType Directory -Path $taskOutput -Force | Out-Null
$taskExe=Join-Path $taskOutput 'dTS.OutlookClassic.exe'
$taskTarget=if($UnsignedTest){'/target:exe'}else{'/target:winexe'}
$taskArguments=@('/nologo',$taskTarget,'/platform:anycpu','/optimize+',('/out:'+$taskExe),'/reference:System.Net.Http.dll','/reference:System.Web.Extensions.dll','/reference:System.Security.dll','/reference:System.Windows.Forms.dll','/reference:System.Drawing.dll','/reference:Microsoft.CSharp.dll')
if($UnsignedTest){$taskArguments+='/define:DEBUG'}
$taskArguments+=(Join-Path $PSScriptRoot 'OutlookClassic.cs')
& $taskCompiler @taskArguments
if($LASTEXITCODE -ne 0){throw 'Falló la compilación del componente Windows.'}
if($UnsignedTest){Write-Output ('Compilación de pruebas sin publicar: '+$taskExe);return}
$taskBatches=@()
foreach($taskAction in @(@('Instalar_Outlook_dTS.bat','--install'),@('Vincular_Outlook_dTS.bat','--pair'),@('Desinstalar_Outlook_dTS.bat','--uninstall'))){
 $taskBatch=Join-Path $taskOutput $taskAction[0]
 $taskContent="@echo off`r`nsetlocal DisableDelayedExpansion`r`n`"%~dp0dTS.OutlookClassic.exe`" "+$taskAction[1]+"`r`nif errorlevel 1 (`r`n  echo No se pudo completar la operacion. Revisa el aviso del componente.`r`n  pause`r`n  exit /b 1`r`n)`r`n"
 [IO.File]::WriteAllText($taskBatch,$taskContent,[Text.Encoding]::ASCII)
 $taskBatches+=$taskBatch
}
$taskReadme=Join-Path $taskOutput 'LEER-ANTES.txt'
[IO.File]::WriteAllText($taskReadme,"dTS Outlook Classic 1.1.2 - Uso interno, sin firma Authenticode.`r`nExtraer TODO el ZIP y ejecutar Instalar_Outlook_dTS.bat con el usuario habitual de Windows, sin administrador.`r`nEl BAT necesita dTS.OutlookClassic.exe en la misma carpeta.`r`nRequiere Outlook Classic, SQL de fase 4 aplicado y backend desplegado con Classic habilitado para la cuenta.`r`nConfirmar en el CRM el codigo mostrado por el componente. Para volver a vincular: Vincular_Outlook_dTS.bat.`r`nPara retirar: Desinstalar_Outlook_dTS.bat y revocar el equipo en el CRM.`r`nWindows puede mostrar un aviso de editor desconocido. No se modifican politicas de seguridad.`r`n")
$taskHash=(Get-FileHash -LiteralPath $taskExe -Algorithm SHA256).Hash.ToLowerInvariant()
$taskManifest=Join-Path $taskOutput 'package.json'
[ordered]@{version='1.1.2';sha256=$taskHash;file='dTS.OutlookClassic.exe';signed=$false;distribution='internal'} | ConvertTo-Json | Set-Content -LiteralPath $taskManifest -Encoding utf8
Compress-Archive -LiteralPath (@($taskExe,$taskReadme,$taskManifest)+$taskBatches) -DestinationPath (Join-Path $taskOutput 'OutlookClassic.zip') -Force
Write-Output 'Paquete interno sin firma generado. No se ha instalado, desplegado ni registrado el protocolo.'
