# Hallow Gap Closure Checklist

Tanggal: 2026-05-20

Target: menutup kelemahan Hallow terhadap OpenHuman, Hermes, Aeon, OpenClaw, dan gap umum marketplace/security/product surface.

## OpenHuman Gap

- [x] Onboarding report: `hallow onboarding`
- [x] Memory tree: `hallow memory tree`
- [x] Obsidian-style vault export: `hallow memory export --obsidian`
- [x] Local console now shows Agent OS surface cards.
- [x] Browser observation snapshot: `hallow browser observe --url https://example.com`
- [x] Browser observation artifacts in `observations/browser/*.md`.
- [x] Browser observation API endpoint: `/api/browser/observe`
- [ ] Desktop app native.
- [x] OAuth connector pack plus generic background auto-fetch schedules: `hallow integration autofetch run|add`.
- [x] Chrome DevTools live browser session adapter: `hallow browser session`.
- [x] Optional embedding/vector providers: `hallow embedding configure`.

## Hermes Gap

- [x] MCP registry: `hallow mcp add/list`
- [x] MCP stdio/HTTP config standard.
- [x] MCP include/exclude tool filtering.
- [x] MCP discovery report: `hallow mcp discover`
- [x] MCP endpoints: `/api/mcp`, `/api/mcp/discover`
- [x] Live MCP stdio initialize + `tools/list`: `hallow mcp probe <server>`
- [x] Live MCP stdio `tools/call`: `hallow mcp call <server> <tool> --path .`
- [x] MCP call artifacts in `tools/mcp-calls/mcp_*.yaml`.
- [x] MCP live API endpoints: `/api/mcp/probe`, `/api/mcp/call`
- [x] Hallow as MCP stdio server: `hallow mcp serve`
- [x] Hallow MCP tools: readiness, memory search, security audit, browser observe, web auth status, sandbox smoke.
- [x] HTTP MCP live handshake/probe/call.
- [x] Process backend selection for local/Docker/WSL/Node-permission execution.
- [x] External skill directories and local skill hub: `hallow skill source add`, `hallow skill hub`, `hallow skill install-hub`.

## Aeon Gap

- [x] Quality report: `hallow autonomy quality`
- [x] Heartbeat report: `hallow autonomy heartbeat`
- [x] Reactive repair trigger: `hallow autonomy react`
- [x] Skill health status: untested/healthy/degraded/repair_needed/promotion_ready.
- [x] Fleet instance skeleton: `hallow fleet spawn/list`
- [x] Rolling 30-run degradation policy per skill.
- [x] Cost/token tracking per agent run: `hallow usage report`.
- [x] Fully automatic skill repair loop with repeated eval until healthy/max rounds: `hallow autonomy heal`.
- [ ] Multi-agent fleet orchestration across repos/devices.

## OpenClaw Gap

- [x] Gateway channel registry: `hallow gateway channels`
- [x] Local webhook ingestion: `hallow gateway ingest`
- [x] Pairing/allowlist policy per channel.
- [x] Hashed node/device pairing tokens: `hallow gateway pair`, `hallow gateway pairings`.
- [x] Gateway API endpoints: `/api/gateway/status`, `/api/gateway/inbox`, `/api/gateway/ingest`
- [x] Security audit command: `hallow security audit`
- [x] Sandbox profile: `hallow security sandbox`
- [x] Dedicated browser profile web login: `hallow web-auth login <provider>`.
- [x] Web auth API endpoints: `/api/web-auth/status`, `/api/web-auth/login`, `/api/web-auth/open`.
- [x] Real outbound adapter implementations for Telegram, Slack, Discord, WhatsApp, Teams, email, and web webhook; live parity still depends on provider credentials.
- [ ] Voice/canvas/mobile presence.
- [x] Node/device ingress behind pairing token and channel allowlist.

## Shared Gaps

- [x] Marketplace signed metadata: `hallow marketplace sign/verify/list`
- [x] Marketplace local index.
- [x] Package digest verification for agent and skill packages.
- [x] Security audit linked into readiness.
- [x] Local sandbox runner: `hallow sandbox smoke` and `hallow sandbox run`.
- [x] Sandbox run artifacts in `sandbox/runs/*.yaml`.
- [x] Readiness expanded to MCP, memory tree, quality loop, gateway, security, marketplace.
- [x] Web-login policy denies cookie export/token extraction/password capture.
- [x] Public marketplace registry service surface: `hallow marketplace serve`, `/api/marketplace/registry`.
- [x] Cryptographic Ed25519 keypair signing for marketplace packages.
- [x] Docker/WSL/Node-permission hard sandbox runner support.
- [x] One-command install scripts plus desktop shell generation: `scripts/install.ps1`, `scripts/install.sh`, `hallow desktop setup`.

## Current Verified Commands

```bash
corepack pnpm typecheck
corepack pnpm build
corepack pnpm hallow --home .hallow-dev readiness
corepack pnpm hallow --home .hallow-dev onboarding
corepack pnpm hallow --home .hallow-dev security audit
corepack pnpm hallow --home .hallow-dev memory tree
corepack pnpm hallow --home .hallow-dev mcp discover
corepack pnpm hallow --home .hallow-dev mcp probe filesystem
corepack pnpm hallow --home .hallow-dev mcp call filesystem list_directory --path .
corepack pnpm hallow --home .hallow-dev sandbox smoke
corepack pnpm hallow --home .hallow-dev browser observe --url https://example.com --max-chars 2000
corepack pnpm hallow --home .hallow-dev browser session --url https://example.com --launch --port 9224 --wait-ms 1000
corepack pnpm hallow --home .hallow-dev web-auth status
corepack pnpm hallow --home .hallow-dev autonomy quality
corepack pnpm hallow --home .hallow-dev autonomy heartbeat --dry-run
corepack pnpm hallow --home .hallow-dev autonomy heal --dry-run --max-rounds 1
corepack pnpm hallow --home .hallow-dev gateway status
corepack pnpm hallow --home .hallow-dev gateway pairings --channel local-webhook
corepack pnpm hallow --home .hallow-dev skill hub
corepack pnpm hallow --home .hallow-dev marketplace verify --path examples/agents/research-smoke
corepack pnpm hallow --home .hallow-dev marketplace verify --path examples/skills/marketplace-smoke
```
