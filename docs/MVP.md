# Hallow MVP

This MVP proves the first local-first loop:

```txt
init local home -> create Hallow agent -> configure models -> run task
-> write output -> write trace -> write memory event
```

## Commands

```bash
corepack pnpm install
corepack pnpm build
corepack pnpm hallow init
corepack pnpm hallow doctor
corepack pnpm hallow readiness
corepack pnpm hallow model list
corepack pnpm hallow agent list
corepack pnpm hallow agent verify examples/agents/research-smoke
corepack pnpm hallow agent install examples/agents/research-smoke --force
corepack pnpm hallow skill verify examples/skills/marketplace-smoke
corepack pnpm hallow skill install examples/skills/marketplace-smoke --force
corepack pnpm hallow task create --agent hallow --skill daily-brief --prompt "prepare a queued local brief"
corepack pnpm hallow task create --prompt "retryable task" --max-attempts 3 --retry-delay-seconds 60
corepack pnpm hallow task list
corepack pnpm hallow task run-due --limit 3
corepack pnpm hallow skill test daily-brief
corepack pnpm hallow skill stats daily-brief
corepack pnpm hallow skill reflect daily-brief
corepack pnpm hallow skill improve daily-brief
corepack pnpm hallow skill review daily-brief
corepack pnpm hallow skill promote daily-brief
corepack pnpm hallow skill rollback daily-brief
corepack pnpm hallow skill confirm daily-brief --dry-run
corepack pnpm hallow memory add --type preference --content "User prefers concise agent reports" --tags user,style
corepack pnpm hallow memory suggest --type fact --content "User may prefer local-first memory approval" --reason "Needs confirmation"
corepack pnpm hallow memory suggestions
corepack pnpm hallow memory approve <suggestion_id>
corepack pnpm hallow memory show <memory_id>
corepack pnpm hallow memory update <memory_id> --confidence 0.9 --tags user,style,confirmed
corepack pnpm hallow memory search agent
corepack pnpm hallow memory delete <memory_id> --yes
corepack pnpm hallow memory rebuild
corepack pnpm hallow memory index
corepack pnpm hallow memory stats
corepack pnpm hallow memory export
corepack pnpm hallow tool list
corepack pnpm hallow tool write --path notes/hello.md --content "Hello from Hallow"
corepack pnpm hallow approval approve <approval_id>
corepack pnpm hallow tool write --path notes/hello.md --content "Hello from Hallow" --approval <approval_id>
corepack pnpm hallow tool read --path notes/hello.md
corepack pnpm hallow tool fetch --url https://example.com
corepack pnpm hallow tool fetch --url https://example.com --save web/example.md
corepack pnpm hallow schedule add daily-brief --agent hallow --skill daily-brief --daily 08:00 --prompt "prepare a daily brief"
corepack pnpm hallow schedule add source-watch --agent hallow --cron "*/15 * * * *" --prompt "check watched sources"
corepack pnpm hallow autonomy policy show
corepack pnpm hallow autonomy policy set --auto-promote true --confirm-promotions false --max-skill-tests 1 --max-task-runs 3
corepack pnpm hallow autonomy tick --skill daily-brief --max-skill-tests 1
corepack pnpm hallow autonomy tick --skill daily-brief --auto-promote --max-skill-tests 1
corepack pnpm hallow autonomy tick --skill daily-brief --auto-promote --confirm-promotions --max-skill-tests 1
corepack pnpm hallow autonomy loop --iterations 2 --interval-seconds 0 --no-schedules --no-improve
corepack pnpm hallow autonomy loop-status
corepack pnpm hallow autonomy stop
corepack pnpm hallow autonomy clear-lock
corepack pnpm hallow autonomy tick --dry-run --no-tests
corepack pnpm hallow approval create external-post --target "x.com/hallow" --risk R4
corepack pnpm hallow notification list
corepack pnpm hallow notification read <notification_id>
corepack pnpm hallow model health
corepack pnpm hallow model health --test
corepack pnpm hallow agent run hallow "make a starter plan for my local agent OS"
corepack pnpm hallow agent run hallow "Summarize context. memory:concise file:notes/hello.md https://example.com"
```

For safe testing inside the repo:

```bash
$env:HALLOW_HOME=".hallow-dev"
corepack pnpm hallow init
corepack pnpm hallow agent run hallow "test local fallback"
```

## What Exists Now

- TypeScript monorepo.
- `@hallow/core` for paths, manifests, YAML, and defaults.
- `@hallow/models` for provider registry, routes, provider tests, and text generation.
- `@hallow/runtime` for local home initialization, agents, skills, traces, memory events, and local API.
- `@hallow/cli` for the first `hallow` commands.
- Readiness report through `hallow readiness` and `GET /api/readiness` for compare preparation.
- Onboarding report through `hallow onboarding` and `GET /api/onboarding`.
- MCP registry foundation through `hallow mcp add/list/discover`, with stdio/HTTP config and include/exclude tool filters.
- Live MCP stdio handshake through `hallow mcp probe <server>`, including `initialize` and `tools/list`.
- Live MCP stdio tool invocation through `hallow mcp call <server> <tool>`, with trace artifacts.
- Marketplace alpha agent package verification and local install through `hallow agent verify/install <path>`.
- Marketplace signed package metadata through `hallow marketplace sign/verify/list`.
- Schedule persistence in `cron/jobs.yaml`.
- Five-field cron schedules through `hallow schedule add --cron "*/15 * * * *"` plus deterministic `schedule run-due --now`.
- Autonomous tick reports in `autonomy/ticks/*.yaml` and `autonomy/LATEST.yaml`.
- Autonomous loop state in `autonomy/LOOP.yaml`, active lock heartbeat in `autonomy/RUNNING.yaml`, and stop flag in `autonomy/STOP`.
- Persistent autonomy policy in `autonomy/policy.yaml`.
- Model inventory and optional provider health checks through CLI/API/console.
- Approval queue persistence in `approvals/queue.yaml`.
- Local notification queue in `notifications/queue.yaml` for approvals, memory review decisions, and task outcomes.
- Notification CLI/API lifecycle for listing unread work and marking it read.
- Durable task queue persistence in `tasks/queue.yaml`.
- Task retry policy with attempts, retry delay, next run time, and due task runner.
- Skill tests through `hallow skill test <id>`.
- Marketplace alpha skill package verification and local install through `hallow skill verify/install <path>`.
- Skill learning metrics in `skills/<id>/metrics.yaml`.
- Skill reflection reports in `skills/<id>/REFLECTION.md`.
- Skill improvement drafts in `skills/<id>/SKILL.draft.md`, versioned drafts, and improvement records.
- Skill improvement reviews that block promotion until metrics and draft checks pass. Add `--strict` for CI-style failure.
- Skill promotion and rollback with backups, version bumps, audit records, and memory events.
- Skill confirmation records after promotion, including task, trace, output, quality, and rollback guidance.
- Quality reports, heartbeat reports, and reactive repair triggers through `hallow autonomy quality`, `hallow autonomy heartbeat`, and `hallow autonomy react`.
- Fleet instance skeleton through `hallow fleet spawn/list`.
- Structured memory vault commands through `hallow memory add/list/search/export`.
- SQLite memory store in `memory/global.sqlite`, with JSONL mirror and Markdown summary kept for auditability.
- Local token-vector memory index in `memory/index.yaml`, used to rank memory search without cloud storage.
- Memory tree in `memory/tree.yaml` and Obsidian-style vault export in `memory/obsidian/`.
- Memory review/edit/delete lifecycle through `hallow memory show/update/delete/rebuild` and item-level local API endpoints.
- Pending memory suggestions in `memory/suggestions.yaml`, with CLI/API approval or denial before entering the vault.
- Human-readable memory summaries in `memory/MEMORY.md`.
- Tool gateway commands through `hallow tool list/check/read/write`.
- Workspace file write approvals through `hallow approval`.
- Web source fetching through `hallow tool fetch`.
- Web content is stored as untrusted source data, not agent instruction.
- Tool audit events in `logs/audit.log`.
- Security audit and sandbox profile through `hallow security audit` and `hallow security sandbox`.
- Gateway channel registry, allowlists, pairing defaults, local webhook ingestion, and inbox through `hallow gateway`.
- Browser observation snapshots through `hallow browser observe`, stored as local artifacts and memory.
- Agent planning heuristic for `memory:<query>`, `file:<workspace-path>`, and URL fetches.
- Agent run plan artifacts in `agents/<id>/traces/*.plan.yaml`.
- Trace detail API through `GET /api/traces/<trace_id>` plus artifact output reads through `GET /api/artifacts?path=...` for compare/debug evidence.
- Autonomous tick v1 can run due schedules, test one learning skill, draft skill improvements, review promotion readiness, optionally auto-promote ready drafts, optionally confirm promoted skills, and record memory.
- Autonomy policy can persist defaults for schedules, due task runs, tests, auto-promotion, confirmation, skill allowlists, and dry-run mode.
- Autonomy loop runner can execute repeated ticks with bounded iterations, intervals, loop state, and a local stop flag.
- Local web console at `hallow start`, with actions for queuing tasks, running due work, approval decisions, memory suggestion review, skill package verify/install, notifications, model checks, trace/artifact links, and autonomy ticks.
- Local web console also exposes Agent OS surface cards for MCP, gateway, security, quality, and marketplace readiness.

## Current User-Facing Language

The product and default agent are called **Hallow**.

The background process is called **Hallow runtime service**. It is not the agent name.

Use:

```bash
hallow start
hallow status
hallow logs
```

## Next Build Slice

1. Add browser automation adapters behind policy gates.
2. Add richer console views for traces, skill marketplace install, and model/provider health.
3. Upgrade local token-vector memory ranking to optional embedding providers/vector database adapters.
4. Add notification gateway adapters for optional external delivery of completed autonomous work.
5. Add signed package metadata for marketplace alpha.
