# Hallow vs NousResearch Hermes Agent — Gap Audit 2026-07-27

## Verdict

Hallow has a credible runtime foundation, but it is not yet a credible Hermes replacement. The current Hallow repository is strongest as a local agent operating-system specification with working storage, policy, manifests, routes, readiness checks, and many command surfaces. Hermes is already a mature daily-use agent with an iterative tool loop, streaming terminal UX, persistent conversations, provider onboarding, real gateway operation, isolation backends, delegation, media, and extensive regression coverage.

The biggest gap is **not the website, installer, number of commands, or provider catalog**. It is the execution core.

Current Hallow execution is:

```text
parse memory:/file:/URL tags
  -> run a fixed pre-plan
  -> call one model once
  -> write result to an artifact
```

The target execution architecture is:

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
| Provider onboarding | 3/10 | 9/10 | Hallow has a provider catalog and routing YAML, but not a polished wizard, OAuth path, credential lifecycle, or instant first successful chat. |
| Conversational agent loop | 2/10 | 9/10 | Hallow uses fixed prompt-tag planning plus one completion. Hermes has a real iterative tool-calling conversation loop. |
| Terminal experience | 3/10 | 9/10 | Hallow has a styled operator REPL, but no streamed answer body, multiline editor, history, autocomplete, interrupt/redirect, resume, or rich tool stream. |
| Sessions and context | 1/10 | 9/10 | Hallow stores task traces but has no canonical conversation/session database, resume, FTS history, context compression, or session branching. |
| Memory | 5/10 | 9/10 | Hallow has SQLite memory, mirrors, indexing, suggestions, tree, and Obsidian export. It does not yet integrate memory continuously into a multi-turn loop or support provider plugins/user modeling at Hermes depth. |
| Tools and MCP | 4/10 | 9/10 | Hallow has policy-gated file/web/MCP/browser surfaces. The model cannot yet select and iterate over those tools natively during conversation. |
| Skills and learning | 5/10 | 8/10 | Hallow has signed manifests, tests, metrics, improve/review/promote/rollback commands. The learning loop is not yet grounded in rich sessions and real repeated agent execution. |
| Delegation and parallel work | 2/10 | 9/10 | Hallow has fleet/task records, not isolated child-agent execution with scoped contexts and tools. |
| Scheduler and autonomy | 5/10 | 8/10 | Hallow has tasks, schedules, retry state, heartbeat, quality, and repair loops. The jobs still execute through the limited one-shot agent core. |
| Messaging gateway | 3/10 | 9/10 | Hallow has channels, pairing, allowlists, queues, and adapter records. Hermes has mature live multi-platform conversation continuity and delivery. |
| Browser and media | 3/10 | 8/10 | Hallow can fetch pages and capture CDP artifacts. Hermes integrates browser, image generation, TTS, transcription, voice, and media routing into the agent loop. |
| Security and isolation | 5/10 | 9/10 | Hallow has approvals, API token, package signing, risk levels, and Docker/WSL/Node permission profiles. Hermes has deeper command analysis, file protection, credential filtering, session isolation, and hardened backend execution. |
| Service operation | 5/10 | 9/10 | Hallow now manages a detached process with PID/logs. Hermes includes native service managers, gateway recovery, shutdown forensics, and broader operational tooling. |
| Tests and reliability | 1/10 | 10/10 | This is Hallow's most dangerous engineering deficit after the agent loop. Feature count without regression coverage will become unmaintainable. |
| Documentation and ecosystem | 3/10 | 10/10 | Hallow documents its foundation. Hermes has full user/developer/reference docs, migration, plugins, platform guides, skills ecosystem, and community feedback. |

Weighted internal readiness estimate:

```text
Hallow today:  34 / 100
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
