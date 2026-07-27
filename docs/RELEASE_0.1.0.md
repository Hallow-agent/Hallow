# Hallow 0.1.0 — Operator Preview Upgrade

Hallow 0.1.0 turns the original local runtime prototype into a clearer, installable Agent OS preview with a stronger operator experience, verifiable demonstrations, and the Guardian specialization.

## What changed

### A product-shaped local runtime

- one-command installers for Windows, macOS, Linux, WSL2, and Termux;
- managed background lifecycle with `start`, `status`, `open`, `stop`, `update`, and `uninstall`;
- an operator shell, desktop workspace, local documentation, and readiness proof;
- persistent conversations, session continuation, search, archive, and branching.

### Durable agent work

- structured local memory with SQLite, Markdown, JSONL, index, tree, and export surfaces;
- task queue, schedules, retries, cancellation, and checkpoints;
- bounded tool loops, workspace write approvals, browser observation, and MCP registration;
- reusable agent and skill packages with verification, tests, reflection, review, promotion, and rollback.

### Control and recovery

- explicit risk lanes and approval records for sensitive actions;
- security audit, API token guard, configurable sandbox backends, and tool policy;
- traces, quality reports, heartbeat, reactive repair, supervised heal loops, and post-repair readiness checks;
- paired gateway lanes with allowlists and send-mode policy.

### Hallow Guardian

Guardian is Hallow's blockchain intelligence specialization. It adds:

- canonical identity resolution for RWAs;
- recorded and live market evidence lanes;
- arbitrary-contract memecoin inspection without ticker trust;
- deterministic spend, reserve, slippage, exposure, freshness, and allowlist policy;
- immutable plans, exact human approval, and tamper-evident receipts;
- deliberate read-only and dry-run behavior with transaction broadcasting disabled.

### Public product experience

- redesigned main website and Guardian evidence lab;
- an official eclipse brand mark and new repository hero art;
- terminal-led commercial product film with English narration and captions;
- documentation that separates shipped capability, safety boundary, and roadmap.

## Compatibility

Existing runtime data under `~/.hallow/` is preserved by the installer update path. The release remains an alpha preview; review the current limits in the main README and production readiness guide before connecting sensitive systems.

## Verification

The release is expected to pass:

```bash
corepack pnpm test
corepack pnpm installer:check
corepack pnpm audit:prod
```

See [CHANGELOG.md](../CHANGELOG.md) for the concise release history.
