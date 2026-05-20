$ErrorActionPreference = "Stop"

$primaryUrl = if ($env:HALLOW_INSTALL_SOURCE_URL) {
  $env:HALLOW_INSTALL_SOURCE_URL
} else {
  "https://raw.githubusercontent.com/Hallow-agent/Hallow/main/scripts/install.ps1"
}

$fallbackUrl = if ($env:HALLOW_INSTALL_FALLBACK_URL) {
  $env:HALLOW_INSTALL_FALLBACK_URL
} else {
  "https://raw.githubusercontent.com/Hallow-agent/Hallow/main/Hallow/scripts/install.ps1"
}

if (-not $env:HALLOW_PROJECT_SUBDIR) {
  $env:HALLOW_PROJECT_SUBDIR = ""
}

Write-Host "==> Fetching Hallow installer" -ForegroundColor Cyan
try {
  $installer = Invoke-RestMethod -UseBasicParsing $primaryUrl
} catch {
  Write-Host "==> Primary installer was unavailable, trying fallback" -ForegroundColor Cyan
  $installer = Invoke-RestMethod -UseBasicParsing $fallbackUrl
}

Invoke-Expression $installer
