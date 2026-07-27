# Hallow Production Readiness

Status: local production-prep pass complete for public preview.

This document defines the minimum gate before Hallow is promoted from local demo to public install.

## Release Gate

Run these commands from the repo root:

```bash
corepack pnpm install --frozen-lockfile
corepack pnpm check
corepack pnpm audit:prod
corepack pnpm hallow --home .hallow-dev doctor
corepack pnpm hallow --home .hallow-dev readiness
corepack pnpm hallow --home .hallow-dev security audit
corepack pnpm hallow --home .hallow-dev demo checklist
corepack pnpm hallow --home .hallow-dev perfect checklist
```

Required result:

- TypeScript build passes.
- Production dependency audit reports no known vulnerabilities.
- Doctor has no failed checks.
- Foundation readiness is `100% strong`.
- Security audit is `hardened`.
- Demo checklist is `100% strong`.
- Perfect checklist is `100% perfect`.

## Public Install Gate

Hallow's public Windows install command is:

```cmd
powershell -nop -ep bypass -c "irm https://hallow-agent.xyz/install.ps1|iex"
```

macOS, Linux, WSL2, and Termux use:

```bash
curl -fsSL https://hallow-agent.xyz/install.sh | bash
```

PowerShell-native fallback:

```powershell
irm https://hallow-agent.xyz/install.ps1 | iex
```

Before publishing those commands, confirm:

- `https://github.com/Hallow-agent/Hallow.git` is public and contains the full source.
- `main` contains `scripts/install.sh`, `scripts/install.ps1`, `package.json`, `pnpm-lock.yaml`, and all workspace packages.
- `https://hallow-agent.xyz/install.sh` returns the self-contained Bash installer.
- `https://hallow-agent.xyz/install.ps1` returns the self-contained PowerShell installer.
- `https://hallow-agent.xyz/install.cmd` returns the CMD wrapper.
- A clean machine with Node.js 22+ can install, build, run `hallow doctor`, and launch `hallow start`.

## Runtime Boundary

Hallow is local-first. A public website or Vercel deployment is only the face and installer host. Users run the runtime on their own machines, so Hallow does not need a central Supabase/VPS backend for the normal local agent OS path.

Use a VPS only for optional hosted services:

- public marketplace index
- release metadata
- docs mirror
- telemetry-free update checks
- community package registry

Do not host user memory, browser profiles, API keys, or agent traces by default.

## Security Gate

Production defaults must stay conservative:

- Local console host: `127.0.0.1`.
- State-changing local API requests require the Hallow API token.
- Browser web-auth denies cookie export, token extraction, and password capture.
- `filesystem.write` approval remains `ask`.
- `terminal.run` remains disabled unless the user explicitly enables it.
- Gateway external send remains disabled unless configured.
- Secrets live in `~/.hallow/.env` or another local Hallow home, not in Git.

Secret scan before release:

```bash
rg -n "sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[0-9A-Za-z_]{30,}|BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY" \
  -g "!node_modules/**" \
  -g "!packages/*/dist/**" \
  -g "!.hallow-dev/**" \
  -g "!.git/**"
```

Expected result: no real credentials.

## Installer Contract

Installers must:

- fail if Node.js major version is below 22
- install or request `git`
- enable Corepack and pnpm
- clone/update the official repo
- install dependencies with the lockfile
- build the workspace
- initialize the Hallow home
- run `hallow doctor`
- write a `hallow` launcher
- never print real API keys or runtime tokens

## Public Preview Scope

Public preview is ready when the local release gate passes and the repo/domain are published. It is not yet a fully hosted cloud product.

Known non-blocking preview limitations:

- No native desktop app installer yet.
- Hosted marketplace persistence is still static/export based.
- OAuth/web-login providers require user-side setup and manual login.
- Live gateway breadth depends on user-provided provider tokens.
- Hard sandboxing varies by platform: WSL/Docker/Node-permission support depends on the user's machine.

## Maintainer Release Steps

1. Run the release gate.
2. Confirm `.env`, `.hallow`, `.hallow-dev`, `.vercel`, logs, archives, and build output are not committed.
3. Commit the source.
4. Push to `Hallow-agent/Hallow`.
5. Redeploy the `site` folder to Vercel.
6. Test the public install command on a clean environment.
7. Create a GitHub release tag.
8. Post only after a clean install + `hallow doctor` proof exists.
