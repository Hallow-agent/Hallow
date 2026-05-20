# Hallow Demo Mode

Tanggal: 2026-05-19

Demo mode adalah jalur khusus untuk membuktikan Hallow sebagai working local agent OS alpha. Targetnya bukan mengklaim produk production sempurna, tetapi membuat demo yang 100% bisa dijalankan ulang secara lokal.

## One Command Demo

```bash
corepack pnpm hallow --home .hallow-dev demo run
```

Expected proof:

```txt
Demo ready: 100% (strong)
Security: hardened
MCP tools: 14
MCP call: ok
Browser artifact: .hallow-dev\observations\browser\...
Report: .hallow-dev\demo\DEMO_REPORT.md
```

## What The Demo Runs

- Initializes local runtime.
- Configures filesystem MCP server.
- Signs example agent and skill packages.
- Builds memory tree and Obsidian-style vault.
- Runs security audit.
- Probes live MCP stdio server with `initialize` and `tools/list`.
- Calls live MCP tool `list_directory`.
- Creates browser observation artifact from `https://example.com`.
- Ingests a local gateway event into the task queue.
- Runs dry-run heartbeat and quality check.
- Writes `.hallow-dev/demo/DEMO_REPORT.md`.

## Demo Commands

```bash
corepack pnpm hallow --home .hallow-dev demo setup
corepack pnpm hallow --home .hallow-dev demo run
corepack pnpm hallow --home .hallow-dev demo checklist
corepack pnpm hallow --home .hallow-dev readiness
corepack pnpm hallow --home .hallow-dev mcp probe filesystem
corepack pnpm hallow --home .hallow-dev mcp call filesystem list_directory --path .
corepack pnpm hallow --home .hallow-dev browser observe --url https://example.com --max-chars 2000
corepack pnpm hallow --home .hallow-dev security audit
```

## What To Show In A Recording

1. Run `corepack pnpm hallow --home .hallow-dev demo run`.
2. Open `.hallow-dev/demo/DEMO_REPORT.md`.
3. Show the MCP call output or artifact in `.hallow-dev/tools/mcp-calls/`.
4. Show browser snapshot artifact in `.hallow-dev/observations/browser/`.
5. Run `corepack pnpm hallow --home .hallow-dev readiness`.

## Demo Claim

Use this exact claim:

```txt
Hallow demo alpha is a working local-first autonomous agent runtime.
It can run locally, keep memory locally, discover/call MCP tools,
create browser observation artifacts, route gateway events into tasks,
audit security posture, and verify/sign agent and skill packages.
```

Do not claim yet:

- Native desktop app is finished.
- OAuth/channel adapters are production-ready.
- Chrome DevTools/Playwright live control is finished.
- Hard sandbox runner for untrusted packages is finished.
- Public marketplace registry is live.
