[CmdletBinding()]
param(
  [string]$RepoUrl = $(if ($env:HALLOW_REPO_URL) { $env:HALLOW_REPO_URL } else { "https://github.com/Hallow-agent/Hallow.git" }),
  [string]$Branch = $(if ($env:HALLOW_BRANCH) { $env:HALLOW_BRANCH } else { "main" }),
  [string]$ProjectSubdir = $(if ($env:HALLOW_PROJECT_SUBDIR) { $env:HALLOW_PROJECT_SUBDIR } else { "" }),
  [string]$InstallRoot = $(if ($env:HALLOW_INSTALL_ROOT) { $env:HALLOW_INSTALL_ROOT } else { Join-Path $env:LOCALAPPDATA "hallow" }),
  [string]$HallowHome = $(if ($env:HALLOW_HOME) { $env:HALLOW_HOME } else { Join-Path $env:USERPROFILE ".hallow" }),
  [switch]$SkipBuild,
  [switch]$SkipSetup,
  [switch]$NoPath
)

$ErrorActionPreference = "Stop"

function Write-Step {
  param([string]$Message)
  Write-Host "==> $Message" -ForegroundColor Cyan
}

function Test-Command {
  param([string]$Name)
  return [bool](Get-Command $Name -ErrorAction SilentlyContinue)
}

function Ensure-Command {
  param(
    [string]$Name,
    [string]$InstallId,
    [string]$Reason
  )
  if (Test-Command $Name) {
    return
  }

  if (Test-Command winget) {
    Write-Step "$Name not found. Installing $InstallId with winget for $Reason"
    winget install --id $InstallId --exact --silent --accept-package-agreements --accept-source-agreements
  }

  if (-not (Test-Command $Name)) {
    throw "$Name is required for Hallow. Install it, open a new terminal, then rerun this installer."
  }
}

function Get-NodeMajor {
  if (-not (Test-Command node)) {
    return 0
  }

  $version = (& node -p "process.versions.node").Trim()
  return [int]($version.Split(".")[0])
}

function Find-HallowProject {
  param([string]$Root, [string]$Subdir)

  $candidates = @()
  if ($Subdir) {
    $candidates += (Join-Path $Root $Subdir)
  }
  $candidates += $Root
  $candidates += (Join-Path $Root "Hallow")
  $candidates += (Join-Path $Root "hallow")

  foreach ($candidate in $candidates) {
    $packagePath = Join-Path $candidate "package.json"
    $workspacePath = Join-Path $candidate "pnpm-workspace.yaml"
    if ((Test-Path $packagePath) -and (Test-Path $workspacePath)) {
      $package = Get-Content $packagePath -Raw | ConvertFrom-Json
      if ($package.name -eq "hallow") {
        return (Resolve-Path $candidate).Path
      }
    }
  }

  throw "Could not find the Hallow project under $Root. Pass -ProjectSubdir if the repo stores it in a subfolder."
}

function Add-UserPath {
  param([string]$PathToAdd)

  $current = [Environment]::GetEnvironmentVariable("Path", "User")
  $items = @()
  if ($current) {
    $items = $current.Split(";") | Where-Object { $_ }
  }

  if ($items -contains $PathToAdd) {
    return
  }

  [Environment]::SetEnvironmentVariable("Path", ($items + $PathToAdd -join ";"), "User")
}

function Write-Launchers {
  param(
    [string]$BinDir,
    [string]$ProjectDir,
    [string]$HomeDir
  )

  New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
  $cliPath = Join-Path $ProjectDir "packages\cli\dist\index.js"
  $cmdPath = Join-Path $BinDir "hallow.cmd"
  $ps1Path = Join-Path $BinDir "hallow.ps1"
  $terminalCmdPath = Join-Path $BinDir "hallow-terminal.cmd"

  @(
    "@echo off",
    "setlocal EnableExtensions",
    "title Hallow Agent OS 001",
    "color 0F",
    "if ""%HALLOW_HOME%""=="""" set ""HALLOW_HOME=$HomeDir""",
    "set ""HALLOW_CLI=$cliPath""",
    "if ""%~1""=="""" (",
    "  cls",
    "  node ""%HALLOW_CLI%"" terminal",
    "  exit /b %ERRORLEVEL%",
    ")",
    "node ""%HALLOW_CLI%"" %*",
    "exit /b %ERRORLEVEL%"
  ) -join "`r`n" | Set-Content -Encoding ASCII $cmdPath

  @(
    "@echo off",
    "title Hallow Agent OS 001",
    "color 0F",
    "call ""$cmdPath"" terminal"
  ) -join "`r`n" | Set-Content -Encoding ASCII $terminalCmdPath

  @(
    '$ErrorActionPreference = "Stop"',
    '$Host.UI.RawUI.WindowTitle = "Hallow Agent OS 001"',
    'try { $Host.UI.RawUI.BackgroundColor = "Black"; $Host.UI.RawUI.ForegroundColor = "White"; Clear-Host } catch {}',
    "if (-not `$env:HALLOW_HOME) { `$env:HALLOW_HOME = '$($HomeDir.Replace("'", "''"))' }",
    "if (`$args.Count -eq 0) { & node '$($cliPath.Replace("'", "''"))' terminal } else { & node '$($cliPath.Replace("'", "''"))' @args }"
  ) -join "`r`n" | Set-Content -Encoding ASCII $ps1Path
}

function Invoke-HallowCli {
  param(
    [string]$ProjectDir,
    [string]$HomeDir,
    [string[]]$CliArgs
  )

  $cliPath = Join-Path $ProjectDir "packages\cli\dist\index.js"
  & node $cliPath --home $HomeDir @CliArgs
  if ($LASTEXITCODE -ne 0) {
    throw "hallow $($CliArgs -join ' ') failed with exit code $LASTEXITCODE"
  }
}

Write-Host ""
Write-Host "Hallow Installer" -ForegroundColor Green
Write-Host "Local-first runtime for autonomous agents"
Write-Host ""

$InstallRoot = [System.IO.Path]::GetFullPath($InstallRoot)
$HallowHome = [System.IO.Path]::GetFullPath($HallowHome)

Ensure-Command node "OpenJS.NodeJS.LTS" "Node.js 22+ runtime"
Ensure-Command git "Git.Git" "repository install/update"
Ensure-Command corepack "OpenJS.NodeJS.LTS" "pnpm package manager activation"

if ((Get-NodeMajor) -lt 22) {
  throw "Hallow requires Node.js 22+. Upgrade Node, open a new terminal, then rerun this installer."
}

Write-Step "Enabling Corepack / pnpm"
$env:COREPACK_ENABLE_DOWNLOAD_PROMPT = "0"
corepack prepare pnpm@10.11.0 --activate

$scriptProject = $null
if ($PSScriptRoot) {
  $candidate = Resolve-Path (Join-Path $PSScriptRoot "..")
  try {
    $scriptProject = Find-HallowProject -Root $candidate.Path -Subdir ""
  } catch {
    $scriptProject = $null
  }
}

if ($scriptProject) {
  $projectDir = $scriptProject
  Write-Step "Using local checkout: $projectDir"
} else {
  New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
  $sourceDir = Join-Path $InstallRoot "source"
  if (Test-Path (Join-Path $sourceDir ".git")) {
    Write-Step "Updating existing checkout: $sourceDir"
    git -C $sourceDir fetch --prune origin
    git -C $sourceDir checkout $Branch
    git -C $sourceDir pull --ff-only origin $Branch
  } else {
    if (Test-Path $sourceDir) {
      throw "$sourceDir exists but is not a git checkout. Move it away or set -InstallRoot."
    }
    Write-Step "Cloning $RepoUrl#$Branch into $sourceDir"
    git clone --branch $Branch --depth 1 $RepoUrl $sourceDir
  }
  $projectDir = Find-HallowProject -Root $sourceDir -Subdir $ProjectSubdir
}

Write-Step "Installing dependencies"
Push-Location $projectDir
try {
  corepack pnpm install --frozen-lockfile

  if (-not $SkipBuild) {
    Write-Step "Building Hallow"
    corepack pnpm build
  }

  if (-not $SkipSetup) {
    Write-Step "Initializing Hallow home at $HallowHome"
    Invoke-HallowCli -ProjectDir $projectDir -HomeDir $HallowHome -CliArgs @("init") | Out-Null
    $desktopOutput = Invoke-HallowCli -ProjectDir $projectDir -HomeDir $HallowHome -CliArgs @("desktop", "setup")
    $desktopUrl = ($desktopOutput | Where-Object { $_ -like "URL:*" } | Select-Object -First 1) -replace "^URL:\s*", ""
    if ($desktopUrl) {
      Write-Host "Desktop: $desktopUrl"
    } else {
      Write-Host "Desktop: ready"
    }
    Write-Step "Running install health check"
    $doctorOutput = Invoke-HallowCli -ProjectDir $projectDir -HomeDir $HallowHome -CliArgs @("doctor")
    $failed = @($doctorOutput | Where-Object { $_ -like "FAIL *" })
    if ($failed.Count -gt 0) {
      $doctorOutput | ForEach-Object { Write-Host $_ }
      throw "Hallow doctor reported $($failed.Count) failed check(s)."
    }
    $okCount = @($doctorOutput | Where-Object { $_ -like "OK *" }).Count
    Write-Host "Doctor: OK ($okCount checks)"
  }
} finally {
  Pop-Location
}

$binDir = Join-Path $InstallRoot "bin"
Write-Step "Writing launcher into $binDir"
Write-Launchers -BinDir $binDir -ProjectDir $projectDir -HomeDir $HallowHome

if (-not $NoPath) {
  Add-UserPath -PathToAdd $binDir
  if (($env:Path -split ";") -notcontains $binDir) {
    $env:Path = "$binDir;$env:Path"
  }
}

Write-Host ""
Write-Host "Hallow installed." -ForegroundColor Green
Write-Host "Project: $projectDir"
Write-Host "Home:    $HallowHome"
Write-Host "Command: hallow"
Write-Host "Direct:  $binDir\hallow.cmd"
Write-Host ""
Write-Host "Run now:"
Write-Host "  `"$binDir\hallow.cmd`""
Write-Host "  `"$binDir\hallow.cmd`" start"
Write-Host ""
Write-Host "After opening a new terminal:"
Write-Host "  hallow"
Write-Host "  hallow start"
Write-Host ""
