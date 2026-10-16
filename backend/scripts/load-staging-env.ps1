# load-staging-env.ps1 - dot-source this to load backend/.env.staging into the
# CURRENT PowerShell session, so `npm start` and the check scripts talk to
# STAGING without re-pasting secrets. Nothing secret is ever printed.
#
#   cd "C:\Users\afrah\Shikhor Academy\uttoron-coaching\backend"
#   . .\scripts\load-staging-env.ps1
#
# backend/.env.staging is git-ignored; this .ps1 contains no secrets.

$envFile = Join-Path $PSScriptRoot '..\.env.staging'
if (-not (Test-Path -LiteralPath $envFile)) {
  Write-Host "NOT FOUND: $envFile" -ForegroundColor Red
  Write-Host "Create it: Copy-Item .env.staging.example .env.staging  then fill REAL values."
  return
}

$loaded = @()
$placeholder = $false
Get-Content -LiteralPath $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -eq '' -or $line.StartsWith('#')) { return }
  $idx = $line.IndexOf('=')
  if ($idx -lt 1) { return }
  $key = $line.Substring(0, $idx).Trim()
  $val = $line.Substring($idx + 1).Trim()
  if (($val.StartsWith('"') -and $val.EndsWith('"')) -or ($val.StartsWith("'") -and $val.EndsWith("'"))) {
    if ($val.Length -ge 2) { $val = $val.Substring(1, $val.Length - 2) }
  }
  Set-Item -Path ("Env:" + $key) -Value $val
  $loaded += $key
  if ($val -like 'REPLACE*') { $placeholder = $true }
}

Write-Host ("Loaded into this session: " + ($loaded -join ', ')) -ForegroundColor Green
Write-Host "(values are not shown)"
if ($placeholder) {
  Write-Host "WARNING: some values still say REPLACE_... - edit backend\.env.staging with real values first." -ForegroundColor Yellow
}
