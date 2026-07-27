# Changelog

## Hallow 0.1.0 - Operator Preview Upgrade

This release turns the first prototype into a clearer installable Agent OS preview.

- redesigned the public Hallow and Guardian product experience;
- added the official eclipse mark, repository hero art, and terminal-led product film;
- expanded persistent conversations, memory, tools, skills, tasks, schedules, gateways, approvals, traces, security checks, and recovery surfaces;
- added Hallow Guardian for evidence-backed RWA and memecoin inspection, deterministic policy, exact consent, and receipts;
- kept Guardian transaction broadcasting deliberately disabled;
- documented shipped capability, current limits, contribution standards, and release verification.

Read the [full 0.1.0 upgrade notes](./docs/RELEASE_0.1.0.md).

## Hallow 001 / 0.0.1 - First Public Preview

Hallow's first public preview is the initial local-first agent OS release.

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
