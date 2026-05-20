# Hallow Install

Hallow follows the Hermes-style install model:

- one command installs the local runtime;
- the installer clones or updates the repo;
- dependencies are installed with Corepack/pnpm;
- Hallow is built locally;
- `~/.hallow` / `%USERPROFILE%\.hallow` is initialized;
- `hallow doctor` runs before the installer exits;
- a global `hallow` launcher is written into the user path.

This is intentionally simpler than shipping a large native app first. The desktop shell still runs from the local runtime.

Requirement: Node.js 22+ and Git. The installer can install Git/Node with common package managers on some systems, but a clean manual Node.js 22+ install is the safest path.

## Windows

PowerShell:

```powershell
irm https://hallow-agent.xyz/install.ps1 | iex
```

Raw GitHub fallback:

```powershell
iex (irm https://raw.githubusercontent.com/Hallow-agent/Hallow/main/scripts/install.ps1)
```

Local checkout:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1
```

Useful options:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -Branch main
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -ProjectSubdir path\to\Hallow
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -HallowHome "$env:USERPROFILE\.hallow-dev"
powershell -ExecutionPolicy Bypass -File .\scripts\install.ps1 -SkipSetup
```

The Windows installer writes launchers to:

```txt
%LOCALAPPDATA%\hallow\bin\hallow.cmd
%LOCALAPPDATA%\hallow\bin\hallow.ps1
```

Open a new terminal after install, then run:

```powershell
hallow setup
hallow doctor
hallow start
```

## Linux / macOS / WSL2 / Termux

```bash
curl -fsSL https://hallow-agent.xyz/install.sh | bash
```

Raw GitHub fallback:

```bash
curl -fsSL https://raw.githubusercontent.com/Hallow-agent/Hallow/main/scripts/install.sh | bash
```

Local checkout:

```bash
bash scripts/install.sh
```

Useful environment overrides:

```bash
HALLOW_BRANCH=main bash scripts/install.sh
HALLOW_PROJECT_SUBDIR=path/to/Hallow bash scripts/install.sh
HALLOW_HOME="$HOME/.hallow-dev" bash scripts/install.sh
HALLOW_SKIP_SETUP=1 bash scripts/install.sh
```

The POSIX installer writes:

```txt
~/.local/bin/hallow
```

If `hallow` is not found, add this to your shell profile:

```bash
export PATH="$HOME/.local/bin:$PATH"
```

Configure or refresh the local runtime:

```bash
hallow setup
hallow doctor
hallow start
```

## Model Keys

Hallow can run with local models first. For hosted models, put keys in the local Hallow home, never in Git:

```bash
cp .env.example ~/.hallow/.env
```

Then fill only the providers you use, for example `OPENROUTER_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY`.

## What This Is Not

This is not yet a self-contained native `.exe`, `.app`, AppImage, or APK.

Current target:

```txt
Hermes-style installer + global CLI + local desktop shell.
```

Later target:

```txt
Thin GUI installer / tray app that calls this installer and manages the local runtime.
```
