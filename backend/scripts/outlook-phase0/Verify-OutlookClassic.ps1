[CmdletBinding()]
param(
  [string]$ReportPath,
  [switch]$OpenExact,
  [switch]$OpenWeb,
  [switch]$AllowClassicLaunch
)
$ErrorActionPreference = 'Stop'

# Windows PowerShell 5.1 is required for classic COM attachment. Never install or register anything.
if ($PSVersionTable.PSEdition -eq 'Core') { throw 'Ejecutar con Windows PowerShell (powershell.exe), no con pwsh.' }
$office = Get-ItemProperty -LiteralPath 'Registry::HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Office\ClickToRun\Configuration' -ErrorAction SilentlyContinue
$result = [ordered]@{
  officeVersion = $office.VersionToReport
  officePlatform = $office.Platform
  classicRunning = [bool](Get-Process -Name OUTLOOK -ErrorAction SilentlyContinue)
  newOutlookRunning = [bool](Get-Process -Name olk -ErrorAction SilentlyContinue)
  classicVerified = $false
  classicOpened = $false
  webLaunchRequested = $false
  classicLaunchRequested = $false
  classicConnectionMethod = $null
  accountsConfigured = $null
  matchingStores = $null
}
if (-not $ReportPath) {
  if ($OpenExact -or $OpenWeb) { throw 'La apertura requiere un informe de Graph verificado.' }
  $result | ConvertTo-Json -Compress; return
}
$report = Get-Content -LiteralPath $ReportPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ($report.schemaVersion -ne 1 -or $report.stage -ne 'phase0') { throw 'Formato de informe no válido.' }
if ($OpenWeb) {
  $web = [uri]$report.message.webLink
  if ($web.Scheme -ne 'https' -or $web.UserInfo -or -not $web.IsDefaultPort -or $web.Host -notin @('outlook.office.com','outlook.office365.com','outlook.cloud.microsoft')) { throw 'Destino web no permitido.' }
  # Default handler may be the browser or its installed PWA; a launch is not proof of opening the message.
  # This is the interactive result requested by the user, so the browser must be visible.
  Start-Process -FilePath $web.AbsoluteUri -WindowStyle Normal
  $result.webLaunchRequested = $true
  if (-not $OpenExact) { $result | ConvertTo-Json -Compress; return }
}
if (-not $result.classicRunning -and -not ($AllowClassicLaunch -and $OpenExact)) { throw 'Outlook Classic debe estar abierto o autorizarse su arranque con -AllowClassicLaunch -OpenExact.' }
$entryId = [string]$report.message.mapiEntryId
$email = [string]$report.mailbox.email
$internetId = [string]$report.message.internetMessageId
if ($entryId -notmatch '^(?:[0-9A-Fa-f]{2})+$' -or -not $email -or -not $internetId) { throw 'Referencia exacta incompleta.' }

$outlook = $null; $session = $null; $accounts = $null; $account = $null; $store = $null; $mail = $null
try {
  if ($result.classicRunning) {
    try {
      $outlook = [Runtime.InteropServices.Marshal]::GetActiveObject('Outlook.Application')
      $result.classicConnectionMethod = 'RunningObjectTable'
    } catch {
      # Outlook may not be in the ROT immediately after startup. Its documented
      # singleton COM activation attaches to the current instance without choosing a mailbox.
      if (-not (Get-Process -Name OUTLOOK -ErrorAction SilentlyContinue)) { throw 'Classic se ha cerrado durante la comprobación; repetir con la sesión preparada.' }
      $outlook = New-Object -ComObject Outlook.Application
      $result.classicConnectionMethod = 'ExistingSingleton'
    }
  }
  else {
    $outlook = New-Object -ComObject Outlook.Application
    $result.classicLaunchRequested = $true
    $result.classicConnectionMethod = 'LaunchSingleton'
  }
  $session = $outlook.GetNamespace('MAPI')
  $accounts = $session.Accounts
  $result.accountsConfigured = $accounts.Count
  $storeIds = @()
  for ($i=1; $i -le $accounts.Count; $i++) {
    $account = $accounts.Item($i)
    try {
      if ([string]::Equals([string]$account.SmtpAddress, $email, [StringComparison]::OrdinalIgnoreCase)) {
        $store = $account.DeliveryStore
        try { if ($store) { $storeIds += [string]$store.StoreID } }
        finally { if ($store) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($store); $store = $null } }
      }
    } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($account); $account = $null }
  }
  $result.matchingStores = $storeIds.Count
  if ($storeIds.Count -ne 1) { throw 'No hay un único almacén de Outlook para el buzón solicitado. No se elegirá una cuenta por defecto.' }
  $mail = $session.GetItemFromID($entryId, $storeIds[0])
  if (-not $mail -or $mail.Class -ne 43) { throw 'La referencia no corresponde a un correo.' }
  $property = $mail.PropertyAccessor
  try {
    try { $actualInternetId = [string]$property.GetProperty('http://schemas.microsoft.com/mapi/proptag/0x1035001F') }
    catch { $actualInternetId = [string]$property.GetProperty('http://schemas.microsoft.com/mapi/proptag/0x1035001E') }
  } finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($property) }
  if (-not [string]::Equals($actualInternetId, $internetId, [StringComparison]::Ordinal)) { throw 'El mensaje no coincide. Se cancela la apertura.' }
  $result.classicVerified = $true
  if ($OpenExact) { $mail.Display(); $result.classicOpened = $true }
  $result | ConvertTo-Json -Compress
} finally {
  foreach ($com in @($mail,$accounts,$session,$outlook)) { if ($null -ne $com -and [Runtime.InteropServices.Marshal]::IsComObject($com)) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($com) } }
  # Do not call Outlook.Quit; the user's session remains open.
}
