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

  @(
    "@echo off",
    "if ""%HALLOW_HOME%""=="""" set ""HALLOW_HOME=$HomeDir""",
    "node ""$cliPath"" %*"
  ) -join "`r`n" | Set-Content -Encoding ASCII $cmdPath

  @(
    '$ErrorActionPreference = "Stop"',
    "if (-not `$env:HALLOW_HOME) { `$env:HALLOW_HOME = '$($HomeDir.Replace("'", "''"))' }",
    "& node '$($cliPath.Replace("'", "''"))' @args"
  ) -join "`r`n" | Set-Content -Encoding ASCII $ps1Path
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
    corepack pnpm hallow --home $HallowHome init
    corepack pnpm hallow --home $HallowHome desktop setup
  }
} finally {
  Pop-Location
}

$binDir = Join-Path $InstallRoot "bin"
Write-Step "Writing launcher into $binDir"
Write-Launchers -BinDir $binDir -ProjectDir $projectDir -HomeDir $HallowHome

if (-not $NoPath) {
  Add-UserPath -PathToAdd $binDir
}

Write-Host ""
Write-Host "Hallow installed." -ForegroundColor Green
Write-Host "Project: $projectDir"
Write-Host "Home:    $HallowHome"
Write-Host "Command: hallow"
Write-Host ""

if (-not $SkipSetup) {
  Push-Location $projectDir
  try {
    corepack pnpm hallow --home $HallowHome terminal
  } finally {
    Pop-Location
  }
  Write-Host ""
}

Write-Host "Open a new terminal, then run:"
Write-Host "  hallow terminal"
Write-Host "  hallow setup"
Write-Host "  hallow doctor"
Write-Host "  hallow start"
Write-Host ""
