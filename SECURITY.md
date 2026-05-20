# Security Policy

Hallow is a local-first agent runtime. Treat every agent, skill, gateway message, browser session, and model provider as a permissioned surface.

## Supported Version

| Version | Status |
| --- | --- |
| 0.1.x | Active hardening / public preview |

## Default Security Posture

- The local console binds to `127.0.0.1` by default.
- State-changing local API calls require `X-Hallow-Token` or `Authorization: Bearer`.
- `filesystem.write` requires approval by default.
- `terminal.run` is disabled by default.
- External gateway send is disabled by default.
- Browser/web-auth policy denies cookie export, token extraction, and password capture.
- Gateway pairing tokens are stored as hashes.
- Package signing metadata is verified before marketplace/package trust decisions.

## Secrets

Do not commit real API keys, OAuth tokens, gateway tokens, browser cookies, or `.hallow` runtime state.

Use:

```bash
cp .env.example ~/.hallow/.env
```

For source/dev runs:

```bash
cp .env.example .hallow-dev/.env
```

## Local Audit Commands

```bash
hallow doctor
hallow readiness
hallow security audit
hallow security api-token status
hallow tool list
hallow perfect checklist
```

For source checkouts:

```bash
corepack pnpm check
corepack pnpm audit:prod
```

## Reporting

Before public disclosure, open a private issue or contact the project maintainer with:

- affected version or commit
- operating system
- command or endpoint involved
- expected impact
- reproduction steps without real secrets

If a secret was exposed, rotate it immediately. Hallow cannot revoke provider-side credentials for you.
