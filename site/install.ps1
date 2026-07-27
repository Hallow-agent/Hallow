[CmdletBinding()]
param(
  [string]$RepoUrl = $(if ($env:HALLOW_REPO_URL) { $env:HALLOW_REPO_URL } else { "https://github.com/Hallow-agent/Hallow.git" }),
  [string]$Branch = $(if ($env:HALLOW_BRANCH) { $env:HALLOW_BRANCH } else { "main" }),
  [string]$ProjectSubdir = $(if ($env:HALLOW_PROJECT_SUBDIR) { $env:HALLOW_PROJECT_SUBDIR } else { "" }),
  [string]$InstallRoot = $(if ($env:HALLOW_INSTALL_ROOT) { $env:HALLOW_INSTALL_ROOT } else { Join-Path $env:LOCALAPPDATA "hallow" }),
  [string]$HallowHome = $(if ($env:HALLOW_HOME) { $env:HALLOW_HOME } else { Join-Path $env:USERPROFILE ".hallow" }),
  [switch]$SkipBuild,
  [switch]$SkipSetup,
  [switch]$NoPath,
  [switch]$NoStart,
  [switch]$NoOpen,
  [switch]$VerifyOnly,
  [switch]$DryRun
)

$ErrorActionPreference = "Stop"
$script:Phase = 0
$script:TotalPhases = 8
$script:StartedAt = Get-Date
$script:LogPath = $null

try {
  [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
  $OutputEncoding = [Console]::OutputEncoding
} catch {}

function Write-Banner {
  Write-Host ""
  Write-Host "  H   H   AAAAA   L       L        OOOOO   W       W" -ForegroundColor White
  Write-Host "  H   H   A   A   L       L       O     O  W   W   W" -ForegroundColor White
  Write-Host "  HHHHH   AAAAA   L       L       O     O  W  WWW  W" -ForegroundColor White
  Write-Host "  H   H   A   A   L       L       O     O   WW   WW" -ForegroundColor DarkGray
  Write-Host "  H   H   A   A   LLLLL   LLLLL    OOOOO     W W" -ForegroundColor DarkGray
  Write-Host ""
  Write-Host "  AGENT OS 001" -ForegroundColor Cyan -NoNewline
  Write-Host "  /  PRIVATE RUNTIME INSTALLER" -ForegroundColor DarkGray
  Write-Host "  -----------------------------------------------------" -ForegroundColor DarkGray
}

function Write-Phase {
  param([string]$Title, [string]$Detail = "")
  $script:Phase += 1
  Write-Host ""
  Write-Host ("  [{0:00}/{1:00}] " -f $script:Phase, $script:TotalPhases) -ForegroundColor DarkGray -NoNewline
  Write-Host $Title.ToUpperInvariant() -ForegroundColor Cyan
  if ($Detail) { Write-Host "          $Detail" -ForegroundColor DarkGray }
}

function Write-Ok {
  param([string]$Message)
  Write-Host "          OK  " -ForegroundColor Green -NoNewline
  Write-Host $Message
}

function Write-Note {
  param([string]$Message)
  Write-Host "          - $Message" -ForegroundColor DarkGray
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Refresh-SessionPath {
  $machine = [Environment]::GetEnvironmentVariable("Path", "Machine")
  $user = [Environment]::GetEnvironmentVariable("Path", "User")
  $env:Path = (@($machine, $user) | Where-Object { $_ }) -join ";"
}

function Invoke-Tool {
  param([string]$Command, [string[]]$Arguments = @(), [string]$Label = $Command, [switch]$Visible)
  if ($DryRun) {
    Write-Note "DRY RUN  $Command $($Arguments -join ' ')"
    return @()
  }
  $output = @(& $Command @Arguments 2>&1)
  $exitCode = $LASTEXITCODE
  if ($script:LogPath) {
    Add-Content -LiteralPath $script:LogPath -Value ("`n> {0} {1}" -f $Command, ($Arguments -join " ")) -Encoding UTF8
    if ($output.Count -gt 0) { Add-Content -LiteralPath $script:LogPath -Value $output -Encoding UTF8 }
  }
  if ($Visible -and $output.Count -gt 0) { $output | ForEach-Object { Write-Host $_ } }
  if ($exitCode -ne 0) {
    $tail = @($output | Select-Object -Last 14) -join "`n"
    throw "$Label failed with exit code $exitCode.`n$tail"
  }
  return $output
}

function Install-WingetPackage {
  param([string]$Id, [string]$Label)
  if (-not (Test-Command winget)) {
    throw "$Label is required and winget is unavailable. Install Node.js 22+ from https://nodejs.org, then rerun this installer."
  }
  Write-Note "Installing $Label with winget"
  Invoke-Tool winget @("install", "--id", $Id, "--exact", "--silent", "--accept-package-agreements", "--accept-source-agreements") "$Label installation" | Out-Null
  Refresh-SessionPath
}

function Get-NodeMajor {
  if (-not (Test-Command node)) { return 0 }
  try { return [int]((& node -p "process.versions.node.split('.')[0]").Trim()) } catch { return 0 }
}

function Find-HallowProject {
  param([string]$Root, [string]$Subdir)
  $candidates = @()
  if ($Subdir) { $candidates += (Join-Path $Root $Subdir) }
  $candidates += $Root
  $candidates += (Join-Path $Root "Hallow")
  $candidates += (Join-Path $Root "hallow")
  foreach ($candidate in $candidates) {
    $packagePath = Join-Path $candidate "package.json"
    if ((Test-Path -LiteralPath $packagePath) -and (Test-Path -LiteralPath (Join-Path $candidate "pnpm-workspace.yaml"))) {
      try {
        $package = Get-Content -LiteralPath $packagePath -Raw | ConvertFrom-Json
        if ($package.name -eq "hallow") { return [System.IO.Path]::GetFullPath($candidate) }
      } catch {}
    }
  }
  return $null
}

function Assert-SafeInstallRoot {
  param([string]$Path)
  $root = [System.IO.Path]::GetPathRoot($Path)
  if (-not $Path -or $Path -eq $root -or $Path.Length -lt ($root.Length + 4)) {
    throw "Unsafe install root: $Path"
  }
}

function Add-UserPath {
  param([string]$PathToAdd)
  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  $items = @()
  if ($current) { $items = @($current.Split(";") | Where-Object { $_ }) }
  if ($items -notcontains $PathToAdd) {
    [Environment]::SetEnvironmentVariable("Path", (($items + $PathToAdd) -join ";"), "User")
  }
  if (($env:Path -split ";") -notcontains $PathToAdd) { $env:Path = "$PathToAdd;$env:Path" }
}

function Write-Launchers {
  param([string]$BinDir, [string]$ProjectDir, [string]$HomeDir, [string]$RootDir)
  New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
  $cliPath = Join-Path $ProjectDir "packages\cli\dist\index.js"
  $cmdPath = Join-Path $BinDir "hallow.cmd"
  $ps1Path = Join-Path $BinDir "hallow.ps1"
  $uninstallPath = Join-Path $RootDir "uninstall.ps1"
  @(
    "@echo off",
    "setlocal EnableExtensions",
    "if ""%HALLOW_HOME%""=="""" set ""HALLOW_HOME=$HomeDir""",
    "if /I ""%~1""==""update"" (powershell -NoProfile -ExecutionPolicy Bypass -Command ""`$ProgressPreference='SilentlyContinue'; irm https://hallow-agent.xyz/install.ps1 ^| iex"" & exit /b %ERRORLEVEL%)",
    "if /I ""%~1""==""uninstall"" (powershell -NoProfile -ExecutionPolicy Bypass -File ""$uninstallPath"" & exit /b %ERRORLEVEL%)",
    "node ""$cliPath"" %*",
    "exit /b %ERRORLEVEL%"
  ) -join "`r`n" | Set-Content -LiteralPath $cmdPath -Encoding ASCII
  @(
    '$ErrorActionPreference = "Stop"',
    "if (-not `$env:HALLOW_HOME) { `$env:HALLOW_HOME = '$($HomeDir.Replace("'", "''"))' }",
    "if (`$args.Count -gt 0 -and `$args[0] -eq 'update') { `$ProgressPreference='SilentlyContinue'; irm https://hallow-agent.xyz/install.ps1 | iex; exit `$LASTEXITCODE }",
    "if (`$args.Count -gt 0 -and `$args[0] -eq 'uninstall') { & '$($uninstallPath.Replace("'", "''"))'; exit `$LASTEXITCODE }",
    "& node '$($cliPath.Replace("'", "''"))' @args",
    'exit $LASTEXITCODE'
  ) -join "`r`n" | Set-Content -LiteralPath $ps1Path -Encoding UTF8
  @(
    '[CmdletBinding()] param([switch]$Purge)',
    '$ErrorActionPreference = "Stop"',
    "`$installRoot = '$($RootDir.Replace("'", "''"))'",
    "`$homeDir = '$($HomeDir.Replace("'", "''"))'",
    "`$launcher = '$($cmdPath.Replace("'", "''"))'",
    'if (Test-Path -LiteralPath $launcher) { & $launcher stop 2>$null | Out-Null }',
    'Write-Host "Removing Hallow application files..." -ForegroundColor Cyan',
    '$userPath = [Environment]::GetEnvironmentVariable("Path", "User")',
    '$binDir = Join-Path $installRoot "bin"',
    'if ($userPath) { [Environment]::SetEnvironmentVariable("Path", (($userPath.Split(";") | Where-Object { $_ -and $_ -ne $binDir }) -join ";"), "User") }',
    'if ($Purge -and (Test-Path -LiteralPath $homeDir)) { Remove-Item -LiteralPath $homeDir -Recurse -Force }',
    'Start-Process powershell -WindowStyle Hidden -ArgumentList @("-NoProfile", "-Command", "Start-Sleep -Milliseconds 400; Remove-Item -LiteralPath ''$installRoot'' -Recurse -Force")',
    'Write-Host "Hallow removed. Runtime data was " -NoNewline; Write-Host $(if ($Purge) { "purged." } else { "kept at $homeDir" }) -ForegroundColor Green'
  ) -join "`r`n" | Set-Content -LiteralPath $uninstallPath -Encoding UTF8
}

function Invoke-Hallow {
  param([string]$ProjectDir, [string]$HomeDir, [string[]]$Arguments, [switch]$Visible)
  $cliPath = Join-Path $ProjectDir "packages\cli\dist\index.js"
  return Invoke-Tool node (@($cliPath, "--home", $HomeDir) + $Arguments) "hallow $($Arguments -join ' ')" -Visible:$Visible
}

function Get-ArchiveUrl {
  if ($RepoUrl -notmatch '^https://github\.com/([^/]+)/([^/.]+)(?:\.git)?$') { return $null }
  return "https://codeload.github.com/$($Matches[1])/$($Matches[2])/zip/refs/heads/$([Uri]::EscapeDataString($Branch))"
}

Write-Banner
$InstallRoot = [System.IO.Path]::GetFullPath($InstallRoot)
$HallowHome = [System.IO.Path]::GetFullPath($HallowHome)
Assert-SafeInstallRoot $InstallRoot
if ($DryRun) {
  Write-Host "  DRY RUN - no files or environment settings will be changed." -ForegroundColor Yellow
  Write-Note "Source:  $RepoUrl#$Branch"
  Write-Note "Install: $InstallRoot"
  Write-Note "Home:    $HallowHome"
}

try {
  Write-Phase "Preflight" "Windows, paths, and install mode"
  if (-not $DryRun) {
    New-Item -ItemType Directory -Force -Path (Join-Path $InstallRoot "logs") | Out-Null
    $script:LogPath = Join-Path $InstallRoot ("logs\install-{0}.log" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
    Set-Content -LiteralPath $script:LogPath -Value "Hallow installer log`nStarted: $(Get-Date -Format o)" -Encoding UTF8
  }
  Write-Ok "Install root verified"

  Write-Phase "Runtime" "Node.js 22+ and pnpm 10.11"
  if ((Get-NodeMajor) -lt 22) {
    if ($DryRun) { Write-Note "Would install Node.js 22+" } else { Install-WingetPackage "OpenJS.NodeJS.LTS" "Node.js LTS" }
  }
  if (-not $DryRun -and (Get-NodeMajor) -lt 22) { throw "Node.js 22+ is not visible in this terminal. Restart Windows once, then rerun the installer." }
  if (-not (Test-Command pnpm)) {
    if ($DryRun) { Write-Note "Would install pnpm 10.11.0 with npm" } else {
      Invoke-Tool npm @("install", "--global", "pnpm@10.11.0") "pnpm installation" | Out-Null
      Refresh-SessionPath
    }
  }
  if (-not $DryRun -and -not (Test-Command pnpm)) { throw "pnpm installation completed but pnpm is not available on PATH." }
  if (-not $DryRun) { Write-Ok "Node $(& node --version) / pnpm $(& pnpm --version)" } else { Write-Ok "Runtime plan validated" }

  Write-Phase "Source" $(if ($VerifyOnly) { "Using the installed build" } else { "Staged update from $Branch" })
  $scriptProject = $null
  if ($PSScriptRoot) {
    $candidateRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot ".."))
    $scriptProject = Find-HallowProject $candidateRoot ""
  }
  $sourceDir = Join-Path $InstallRoot "source"
  $projectDir = $null
  $stagedRoot = $null
  $stageDir = $null
  if ($scriptProject -and -not $VerifyOnly) {
    $projectDir = $scriptProject
    Write-Ok "Local checkout selected: $projectDir"
  } elseif ($VerifyOnly) {
    $projectDir = Find-HallowProject $sourceDir $ProjectSubdir
    if (-not $projectDir) { throw "No installed Hallow build found under $sourceDir." }
    Write-Ok "Installed source found"
  } elseif ($DryRun) {
    $projectDir = $sourceDir
    Write-Ok "Source staging plan validated"
  } else {
    $archiveUrl = Get-ArchiveUrl
    if (-not $archiveUrl) { throw "The zero-dependency installer currently supports GitHub repository URLs. Repo: $RepoUrl" }
    $stageDir = Join-Path $InstallRoot ("stage-{0}" -f $PID)
    $zipPath = Join-Path $stageDir "hallow.zip"
    New-Item -ItemType Directory -Force -Path $stageDir | Out-Null
    Write-Note "Downloading $RepoUrl#$Branch"
    $ProgressPreference = "SilentlyContinue"
    Invoke-WebRequest -UseBasicParsing -Uri $archiveUrl -OutFile $zipPath
    Expand-Archive -LiteralPath $zipPath -DestinationPath (Join-Path $stageDir "unpacked") -Force
    $stagedRoot = Get-ChildItem -LiteralPath (Join-Path $stageDir "unpacked") -Directory | Select-Object -First 1 -ExpandProperty FullName
    $projectDir = Find-HallowProject $stagedRoot $ProjectSubdir
    if (-not $projectDir) { throw "Downloaded archive does not contain the Hallow workspace." }
    Write-Ok "Source downloaded and inspected"
  }

  Write-Phase "Dependencies" "Locked, reproducible workspace install"
  if (-not $VerifyOnly -and -not $DryRun) {
    Push-Location $projectDir
    try { Invoke-Tool pnpm @("install", "--frozen-lockfile", "--prefer-offline") "Dependency installation" | Out-Null } finally { Pop-Location }
  }
  Write-Ok $(if ($VerifyOnly) { "Existing dependency set retained" } else { "Dependencies ready" })

  Write-Phase "Build" "Core, models, runtime, and CLI"
  if (-not $VerifyOnly -and -not $SkipBuild -and -not $DryRun) {
    Push-Location $projectDir
    try { Invoke-Tool pnpm @("build") "Hallow build" | Out-Null } finally { Pop-Location }
  }
  if (-not $DryRun -and -not (Test-Path -LiteralPath (Join-Path $projectDir "packages\cli\dist\index.js"))) { throw "Build completed without packages/cli/dist/index.js." }
  Write-Ok $(if ($SkipBuild) { "Existing build selected" } else { "Build verified" })

  if ($stagedRoot -and -not $DryRun) {
    $relativeProject = $projectDir.Substring($stagedRoot.Length).TrimStart('\')
    $nextSource = Join-Path $InstallRoot "source.next"
    $previousSource = Join-Path $InstallRoot "source.previous"
    if (Test-Path -LiteralPath $nextSource) { Remove-Item -LiteralPath $nextSource -Recurse -Force }
    Move-Item -LiteralPath $stagedRoot -Destination $nextSource
    if (Test-Path -LiteralPath $previousSource) { Remove-Item -LiteralPath $previousSource -Recurse -Force }
    if (Test-Path -LiteralPath $sourceDir) { Move-Item -LiteralPath $sourceDir -Destination $previousSource }
    Move-Item -LiteralPath $nextSource -Destination $sourceDir
    $projectDir = if ($relativeProject) { Join-Path $sourceDir $relativeProject } else { $sourceDir }
    if ($stageDir -and (Test-Path -LiteralPath $stageDir)) { Remove-Item -LiteralPath $stageDir -Recurse -Force }
  }

  Write-Phase "Workspace" "Private state and local desktop shell"
  if (-not $SkipSetup -and -not $DryRun) {
    Invoke-Hallow $projectDir $HallowHome @("init") | Out-Null
    Invoke-Hallow $projectDir $HallowHome @("desktop", "setup") | Out-Null
    $doctor = @(Invoke-Hallow $projectDir $HallowHome @("doctor"))
    if (@($doctor | Where-Object { "$_" -like "FAIL *" }).Count -gt 0) { throw "Hallow doctor reported failed checks." }
  }
  Write-Ok $(if ($SkipSetup) { "Setup skipped by request" } else { "Runtime home initialized and checked" })

  Write-Phase "Command" "Global launcher, update, and uninstall"
  $binDir = Join-Path $InstallRoot "bin"
  if (-not $DryRun) {
    Write-Launchers $binDir $projectDir $HallowHome $InstallRoot
    if (-not $NoPath) { Add-UserPath $binDir }
  }
  Write-Ok "hallow command ready"

  Write-Phase "Launch" "Managed background runtime"
  $launcher = Join-Path $binDir "hallow.cmd"
  $shouldStart = -not $NoStart -and -not $SkipSetup -and $env:HALLOW_INSTALL_NO_LAUNCH -ne "1"
  if ($shouldStart -and -not $DryRun) {
    & $launcher start --quiet
    if ($LASTEXITCODE -ne 0) { throw "Hallow runtime failed to start." }
    if (-not $NoOpen) { & $launcher open }
    Write-Ok "Runtime online"
  } else {
    Write-Ok "Launch skipped; run hallow open when ready"
  }

  $elapsed = [math]::Round(((Get-Date) - $script:StartedAt).TotalSeconds, 1)
  Write-Host ""
  Write-Host "  +----------------------------------------------------+" -ForegroundColor Green
  Write-Host "  |  HALLOW IS READY                                   |" -ForegroundColor Green
  Write-Host "  +----------------------------------------------------+" -ForegroundColor DarkGray
  Write-Host "  |  hallow          operator terminal                 |"
  Write-Host "  |  hallow open     start + open desktop              |"
  Write-Host "  |  hallow doctor   verify the local runtime          |"
  Write-Host "  |  hallow update   upgrade safely                    |"
  Write-Host "  +----------------------------------------------------+" -ForegroundColor Green
  Write-Host ""
  Write-Host "  Desktop  http://127.0.0.1:4767/desktop" -ForegroundColor White
  Write-Host "  Home     $HallowHome" -ForegroundColor DarkGray
  if ($script:LogPath) { Write-Host "  Log      $script:LogPath" -ForegroundColor DarkGray }
  Write-Host "  Done in  ${elapsed}s" -ForegroundColor DarkGray
  Write-Host ""
} catch {
  Write-Host ""
  Write-Host "  INSTALLATION STOPPED" -ForegroundColor Red
  Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
  if ($script:LogPath) { Write-Host "  Full log: $script:LogPath" -ForegroundColor Yellow }
  Write-Host "  Fix the reported item, then run the same command again; the installer is resumable." -ForegroundColor DarkGray
  exit 1
}
