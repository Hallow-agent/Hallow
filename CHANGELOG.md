# Changelog

## Hallow 0.3.0 - Autonomic Commerce

This release gives Hallow a guarded machine-commerce loop for paid agent services on Arc.

- added defensive x402 discovery and PAYMENT-REQUIRED decoding;
- added Arc USDC network, asset, scheme, recipient, per-payment, and daily-budget enforcement;
- added exact approval generation for payments above the autonomous threshold;
- added an isolated signer interface that executes ready intents without exposing or storing payment signatures;
- added tamper-evident commerce receipts with response and authorization hashes;
- added a persistent local commerce policy, evidence artifacts, and append-only economic ledger;
- added `hallow economy status|inspect|plan|autopilot` and governed model tools;
- blocked private-network targets, credential-bearing URLs, redirects, oversized headers, and oversized paid responses by default.

Read the [full 0.3.0 release notes](./docs/RELEASE_0.3.0.md).

## Hallow 0.2.0 - Arc Agent Economy Preview

This release focuses Hallow on trustworthy agent work and settlement on Arc.

- added live Arc Testnet status and reference-contract verification with official RPC failover;
- added ERC-8004 Agent Passport inspection for identity, ownership, and reputation context;
- added ERC-8183-compatible job planning with budgets, expiry, provider registration, independent evaluation, and human approval gates;
- added privacy-preserving Work Receipts that commit to job intent, deliverables, and evidence without publishing private content;
- exposed Arc capabilities through the CLI and model tool surface;
- replaced the previous chain-specific market experience with a dedicated Arc Agent Economy site, documentation, and example skill;
- kept transaction signing and broadcasting disabled while the integration remains testnet-only.

Read the [full 0.2.0 release notes](./docs/RELEASE_0.2.0.md).

## Hallow 0.1.0 - Operator Preview Upgrade

This release turns the first prototype into a clearer installable Agent OS preview.

- redesigned the public Hallow and Guardian product experience;
- added the official eclipse mark, repository hero art, and terminal-led product film;
- expanded persistent conversations, memory, tools, skills, tasks, schedules, gateways, approvals, traces, security checks, and recovery surfaces;
- added Hallow Guardian for evidence-backed RWA and memecoin inspection, deterministic policy, exact consent, and receipts;
- kept Guardian transaction broadcasting deliberately disabled;
- documented shipped capability, current limits, contribution standards, and release verification.

Read the [full 0.1.0 upgrade notes](./docs/RELEASE_0.1.0.md).

## Hallow 001 / 0.0.1 - Public Preview

Hallow 001 introduced the initial local agent OS preview.

This version includes:

- local runtime and CLI installer flow
- desktop and docs shell
- agent and skill manifests
- workspace file import for sourced agent runs
- fail-closed agent execution when required context is missing
- memory vault with SQLite, Markdown, JSONL mirror, local index, and tree export
- model catalog and multi-provider routing
- MCP stdio/HTTP registry foundation
- gateway channels, pairing, allowlist, and send policy
- OAuth connector and web-auth profile definitions
- autonomy loop, quality reports, heartbeat, reactive repair, and heal commands
- marketplace signing metadata and package verification
- sandbox profile, approval queue, shared-secret local API guard, and security audit
- production readiness and security documentation

Known preview limits:

- no native desktop installer yet
- hosted marketplace is still static/export based
- live channel adapters require user-provided provider tokens
- OAuth/web-login flows require manual local setup
- sandbox strength depends on the user's machine and available backend

Future releases will continue toward a fuller agent ecosystem: native installer, hosted package registry, deeper sandboxing, richer gateway adapters, stronger desktop UX, and more autonomous agent loops.
