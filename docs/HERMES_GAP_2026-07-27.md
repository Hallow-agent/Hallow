# Hallow vs NousResearch Hermes Agent — Gap Audit 2026-07-27

## Verdict

### Gate update: conversational core shipped

The 34/100 baseline below was the pre-remediation audit. The implementation on this branch moves the measured internal estimate to **62/100**. Hallow now has a canonical SQLite conversation store, resume/search/branch operations, bounded context compaction, streaming provider adapters, native iterative tool calls, automatic memory retrieval and explicit memory save, approval-gated workspace writes, bounded child-agent delegation, direct terminal answers with cancellation, provider setup, and sender-stable local-webhook conversations. These claims are covered by the repository regression suite and live OpenRouter smoke tests.

The remaining eight points to the 70/100 gate are intentionally not claimed yet. They require process/container-isolated child agents, an isolated terminal tool, native service recovery, outbound gateway delivery/retry continuity, and substantially broader regression coverage.

Hallow has a credible runtime foundation, but it is not yet a credible Hermes replacement. The current Hallow repository is strongest as a local agent operating-system specification with working storage, policy, manifests, routes, readiness checks, and many command surfaces. Hermes is already a mature daily-use agent with an iterative tool loop, streaming terminal UX, persistent conversations, provider onboarding, real gateway operation, isolation backends, delegation, media, and extensive regression coverage.

The biggest gap is **not the website, installer, number of commands, or provider catalog**. It is the execution core.

Pre-remediation Hallow execution was:

```text
parse memory:/file:/URL tags
  -> run a fixed pre-plan
  -> call one model once
  -> write result to an artifact
```

The current branch now implements the central path of the target execution architecture:

```text
load session + memory + skills
  -> stream model response
  -> receive native tool calls
  -> enforce policy / approval
  -> execute tools, possibly in parallel
  -> append tool results
  -> repeat until final answer or bounded stop
  -> persist messages, usage, trace, learning candidates
```

## Evidence from the repositories

| Repository signal | Hallow | Hermes |
| --- | ---: | ---: |
| Primary source files | 16 TypeScript files | 3,452 Python files in the current recursive tree |
| Approximate primary source LOC | 27,161 TypeScript lines | Not used as a quality score; the repository is much larger and includes a broad plugin/skill ecosystem |
| Test files detected | 1 example skill test | Approximately 2,450 test files |
| Documentation files | 12 under `docs/` | Approximately 390 in the recursive docs tree |
| Bundled/ecosystem skill files | 4 installed in the audited Hallow home | Approximately 901 skill-path files in the current Hermes tree |

Repository size alone does not prove quality, but the test and subsystem distribution explains the maturity difference. Hallow concentrates most logic in `packages/runtime/src/index.ts` and `packages/cli/src/index.ts`; Hermes separates agent runtime, transports, providers, sessions, gateways, security, service management, plugins, and tests.

## Capability scorecard

Scores are an internal product-readiness assessment, not a universal benchmark.

| Capability | Hallow | Hermes | Honest gap |
| --- | ---: | ---: | --- |
| Installation and update | 7/10 | 9/10 | Hallow now has staged one-command install, logs, update, lifecycle, and dry-run. It still builds from source and lacks signed prebuilt releases/native desktop packages. |
| Provider onboarding | 6/10 | 9/10 | Hallow now has masked one-step provider setup, route promotion, connection testing, catalog, and local/provider presets. OS credential vaults and OAuth provider auth remain. |
| Conversational agent loop | 8/10 | 9/10 | Hallow now runs a bounded native model-tool-result loop across OpenAI-compatible, Anthropic, and Ollama adapters. Parallel tool execution and richer recovery remain. |
| Terminal experience | 7/10 | 9/10 | Hallow streams answer tokens and tool events, prints the actual answer, resumes a live session, and supports cancellation. Multiline editing, completion, and redirect ergonomics remain. |
| Sessions and context | 7/10 | 9/10 | SQLite stores full messages/tool calls with list, search, resume, archive, branch, gateway continuity, and bounded local compaction. FTS5 and model-written compression summaries remain. |
| Memory | 7/10 | 9/10 | Preferences/projects and semantic matches enter every turn automatically; the model can save explicitly requested durable memory. Provider plugins and deeper user modeling remain. |
| Tools and MCP | 7/10 | 9/10 | The model can iteratively search/save memory, list/read/write workspace files, fetch/observe web pages, call MCP, and delegate. Unsafe terminal execution remains intentionally unavailable to the model. |
| Skills and learning | 5/10 | 8/10 | Hallow has signed manifests, tests, metrics, improve/review/promote/rollback commands. The learning loop is not yet grounded in rich sessions and real repeated agent execution. |
| Delegation and parallel work | 4/10 | 9/10 | Hallow can create bounded child sessions with separate traces and no nested delegation. Process/container isolation, parallel fan-out, budgets, and shared cancellation remain. |
| Scheduler and autonomy | 6/10 | 8/10 | Tasks and schedules now execute through the iterative session-aware core. Strong unattended isolation and delivery escalation remain. |
| Messaging gateway | 5/10 | 9/10 | Paired local-webhook senders now preserve one conversation and can synchronously run/return an answer. Production outbound retry/delivery continuity remains. |
| Browser and media | 3/10 | 8/10 | Hallow can fetch pages and capture CDP artifacts. Hermes integrates browser, image generation, TTS, transcription, voice, and media routing into the agent loop. |
| Security and isolation | 5/10 | 9/10 | Hallow has approvals, API token, package signing, risk levels, and Docker/WSL/Node permission profiles. Hermes has deeper command analysis, file protection, credential filtering, session isolation, and hardened backend execution. |
| Service operation | 5/10 | 9/10 | Hallow now manages a detached process with PID/logs. Hermes includes native service managers, gateway recovery, shutdown forensics, and broader operational tooling. |
| Tests and reliability | 3/10 | 10/10 | The core now has deterministic coverage for adapters, streaming, sessions, compaction, cancellation, tools, approvals, delegation, memory, and gateway continuity. Coverage is still far below the 100-test gate. |
| Documentation and ecosystem | 3/10 | 10/10 | Hallow documents its foundation. Hermes has full user/developer/reference docs, migration, plugins, platform guides, skills ecosystem, and community feedback. |

Weighted internal readiness estimate:

```text
Hallow baseline: 34 / 100
Hallow current branch: 62 / 100
Hermes today:  91 / 100
```

Hallow's previous `100% strong` readiness score measures whether **Hallow's own current checklist** is populated. It must not be interpreted as 100% parity with Hermes. The CLI now labels it `foundation readiness` to make that scope explicit; its criteria should continue to be recalibrated as the real agent loop ships.

## What Hallow genuinely does well

1. **Local-first state is explicit.** Runtime paths, traces, config, memory, approval state, and generated desktop artifacts are inspectable.
2. **Agent and skill packaging is deliberate.** Manifests, permissions, signatures, verification, promotion, and rollback form a useful standardization layer.
3. **Operational evidence is first-class.** Doctor, security audit, trace artifacts, readiness, usage, and quality reports are good primitives.
4. **Memory has multiple inspectable representations.** SQLite plus YAML/Markdown/Obsidian-style outputs can become a differentiator once attached to a real conversational loop.
5. **The system is dependency-light.** Node's built-in HTTP and SQLite keep the runtime understandable, although this currently comes at the cost of mature libraries and modularity.

## Gap-closing roadmap

### Phase A — make Hallow a real agent

This phase matters more than every other surface combined.

- Add a canonical SQLite session/message store.
- Add `hallow chat`, `hallow sessions list`, `hallow --continue`, and session resume.
- Change model adapters from text-only completion to streaming events plus native tool-call schemas.
- Build a bounded iterative loop: model -> tool -> result -> model -> final.
- Expose filesystem, terminal, web, memory, MCP, browser, and skills through the same tool registry.
- Stream assistant text and tool events directly in the terminal.
- Support cancellation with `Ctrl+C` and persist partial turns safely.
- Write at least 100 tests around loop termination, tool errors, approvals, retries, and session persistence before adding more integrations.

Exit criterion: a user can install Hallow, configure one provider, ask it to inspect a repository, watch real tool calls, receive the answer in the terminal, close the terminal, and resume the same conversation.

### Phase B — make first run trustworthy

- Replace report-style `setup` with an interactive provider/onboarding wizard.
- Offer OpenRouter, OpenAI, Anthropic, Google, Ollama, and a generic compatible endpoint first.
- Store secrets through an OS credential backend or encrypted local vault.
- Test the selected route during setup.
- Finish on the first live conversation instead of a metrics dashboard.
- Publish signed prebuilt release artifacts so installation does not build the monorepo.

Exit criterion: clean machine to first successful live answer in under three minutes.

### Phase C — memory and learning that affect behavior

- Retrieve relevant memories automatically per turn rather than requiring `memory:` tags.
- Persist full conversation messages and build FTS5 session search.
- Add context-window accounting and compression with a pre-compression memory pass.
- Ground skill improvement in real session/tool evidence.
- Add progressive skill disclosure and automatic skill selection.
- Separate proposed memory/skill mutations from confirmed changes.

Exit criterion: repeated tasks measurably improve while all learned mutations remain reviewable and reversible.

### Phase D — isolation, delegation, and unattended work

- Add isolated subagents with bounded context, tool scope, cost, time, and cancellation.
- Add native Docker execution first; WSL/SSH/remote backends second.
- Route scheduler jobs through the same tested agent loop.
- Add per-job delivery and failure escalation.
- Install native OS services for reboot recovery.

Exit criterion: one scheduled multi-step task can run unattended in isolation, deliver its result, and leave a complete trace.

### Phase E — gateway and product surface

- Ship one production-quality messaging adapter first, not eight partial adapter declarations.
- Preserve the same session across terminal, desktop, and the chosen gateway.
- Turn the desktop into a real conversation/session/approval interface.
- Add gateway-specific authorization, delivery ledger, retries, and media handling.

Exit criterion: a user can start work in the terminal, continue it from one messaging platform, and audit the same session on desktop.

## What not to do

- Do not add more provider names before the current adapters support streaming and tools.
- Do not add more gateway channel declarations before one channel works end-to-end.
- Do not call readiness “100%” without naming the benchmark scope.
- Do not build more cinematic website sections as a substitute for product execution.
- Do not copy Hermes module-for-module. Reproduce the user outcomes with Hallow's local-first, inspectable architecture.

## Immediate engineering order

```text
1. session/message database
2. streaming provider event model
3. iterative native tool loop
4. terminal answer + tool stream
5. provider onboarding
6. 100+ core regression tests
7. automatic memory + session search
8. isolated subagents
9. one real gateway
10. native service + signed releases
```

Until items 1–6 ship, every additional “feature surface” increases apparent breadth but does not materially close the Hermes gap.
