# Hallow Blueprint

Version: 0.1  
Status: Foundational Product Blueprint  
Product thesis: local-first self-improving autonomous agent runtime

## 1. Executive Summary

Hallow is a local-first operating environment for autonomous AI agents. It lets people run agents on their own machine, connect those agents to models, tools, files, browsers, apps, and communication channels, then allow the agents to learn from repeated work without surrendering all private data to a central backend.

Hallow is not just a chatbot, not just an agent framework, and not just a desktop wrapper around an LLM. Hallow is a runtime, memory vault, skill system, permission layer, scheduler, model router, and marketplace standard for agents that can live, work, remember, and improve over time.

The core idea:

```txt
User owns the memory.
Hallow owns the runtime standard.
Agents own the work loop.
Skills encode repeatable intelligence.
The cloud only coordinates what must be coordinated.
```

Hallow combines the best patterns from the current autonomous agent wave:

- OpenHuman-style personal memory and local privacy.
- Hermes-style local agent setup, skills, and self-improvement.
- Aeon-style scheduler, autonomous loops, quality scoring, and self-healing.
- OpenClaw-style gateway and multi-channel interaction.
- MCP-style tool connectivity.
- Modern model routing across OpenAI-compatible APIs, local models, and custom providers.
- A marketplace/protocol layer so outside developers can publish agents and skills under Hallow standards.

Hallow's differentiator is not one feature. It is the complete shape:

```txt
Local runtime + private memory + autonomous scheduler + self-improving skills
+ multi-model routing + sandboxed tools + public skill standard.
```

## 2. Product Identity

### Name

Hallow

### Meaning

Hallow means a protected, meaningful, almost sacred space. For this product, Hallow is the private space where a user's agents live, remember, work, and evolve.

The name works because the product is not only a tool. It is an environment. A private chamber for autonomous intelligence.

### Positioning

Hallow is the local-first runtime for self-improving autonomous agents.

### Short Description

Hallow lets you run private autonomous agents on your own machine. Agents can remember context, use tools, schedule work, learn from successful traces, and install new skills while keeping memory and execution under user control.

### One-Line Pitch

Hallow is where autonomous agents live on your machine, learn your workflows, and turn repeated work into reusable skills.

### Longer Pitch

Today's AI agents are powerful but scattered. Some have memory, some have tools, some can schedule tasks, some can use browsers, and some can run code. Most are either cloud-heavy, developer-only, or too manual for ordinary users.

Hallow unifies these pieces into a local-first runtime. A user installs Hallow, connects models, grants tool permissions, and creates agents that can operate in the background. Every action is traced. Every useful workflow can become a skill. Every skill can be improved. The user's memory remains local by default, while optional cloud services provide sync, marketplace discovery, remote relay, and team collaboration.

### Tagline Options

- The local-first runtime for self-improving agents.
- A private home for autonomous agents.
- Agents that remember, work, and evolve.
- Your machine, inhabited by agents.
- Where repeated work becomes intelligence.

## 3. Why Now

The agent ecosystem is exploding, but still fragmented.

Current market patterns:

- LLMs are becoming stronger at reasoning, planning, coding, browsing, and tool use.
- Model access is becoming multi-provider and OpenAI-compatible across many vendors.
- Local models through Ollama and LM Studio make private/offline workflows realistic.
- MCP is becoming a common tool connection layer.
- Desktop automation and browser agents are becoming practical.
- Users increasingly want AI that does work, not just answers questions.
- Developers want a standard way to build and distribute agent skills.
- Cloud-only memory products create trust, storage, and privacy concerns.

The opportunity:

```txt
Build the local-first layer that connects models, memory, tools, skills,
scheduling, permissions, and marketplace distribution into one coherent runtime.
```

## 4. Core Product Philosophy

### Local-First

Hallow should work even if the user never creates a Hallow cloud account. The first-class runtime is local.

Local-first means:

- Config lives on the user's machine.
- Memory lives on the user's machine by default.
- Agent traces live on the user's machine by default.
- Skills can be installed and run locally.
- Models can be local or remote.
- Cloud is optional, not mandatory.

### User-Owned Memory

Memory is the most sensitive and valuable part of an agent system. Hallow should treat memory as user property.

Default memory storage:

- SQLite for structured memory.
- Markdown for human-readable memory.
- Local vector store for embeddings.
- File attachments inside a local vault.

Cloud memory sync may exist later, but it must be opt-in and encrypted.

### Agents Improve Through Work

Agents should not only chat. They should improve by executing tasks repeatedly.

Every task produces:

- Trace.
- Result.
- Tool usage.
- Cost.
- Duration.
- Failure/success markers.
- Quality score.
- Reusable workflow candidates.
- Memory update suggestions.
- Skill update suggestions.

The improvement loop:

```txt
Task -> Plan -> Execute -> Trace -> Evaluate -> Reflect -> Save Memory
     -> Extract Skill -> Reuse -> Improve
```

### Permissioned Autonomy

Hallow should allow autonomous agents, but autonomy must be bounded by policy.

Agents can act automatically when:

- The action is inside allowed tool scope.
- The action is low risk.
- The agent has enough confidence.
- The user's policy permits it.
- The action can be audited.

Agents must request approval when:

- Writing outside allowed folders.
- Deleting files.
- Sending messages to external people.
- Spending money.
- Publishing content.
- Changing credentials.
- Installing packages.
- Running risky terminal commands.
- Accessing sensitive sources.

### Standards Over Lock-In

Hallow should be a platform, but not a prison.

It should support:

- OpenAI-compatible model endpoints.
- Local model runtimes.
- MCP tools.
- Plain Markdown skills.
- Human-readable config.
- Exportable memory.
- Git-based skill distribution.
- Optional cloud account, not mandatory cloud account.

## 5. Target Users

### Primary User: Power User

Someone who wants agents to handle daily digital work:

- Research.
- Summaries.
- Monitoring.
- Personal knowledge.
- Scheduling.
- Project tracking.
- Inbox triage.
- Content drafting.
- File organization.

They are not necessarily developers, but they are comfortable installing software and connecting accounts.

### Secondary User: Developer

Someone who wants to build and distribute agents or skills:

- Writes custom skills.
- Connects internal tools.
- Builds agent packs.
- Publishes to marketplace.
- Uses CLI and SDK.
- Runs local and cloud workflows.

### Third User: Team or Organization

Later-stage user:

- Shared skills.
- Shared policies.
- Team memory spaces.
- Admin controls.
- Audit logs.
- Enterprise connectors.
- Local or private cloud deployment.

## 6. Product Surface

Hallow should have four main surfaces:

### 6.1 Desktop App

Purpose:

- Main user experience.
- Agent dashboard.
- Memory browser.
- Skill library.
- Scheduler.
- Permission prompts.
- Trace viewer.
- Model settings.
- Gateway settings.

Desktop app should feel calm and powerful, not overloaded.

Primary views:

- Home
- Agents
- Tasks
- Memory
- Skills
- Schedule
- Tools
- Models
- Traces
- Settings

### 6.2 CLI

Purpose:

- Developer-first setup.
- Fast local operations.
- Skill creation.
- Agent creation.
- Model testing.
- Runtime health.
- Headless mode.

CLI examples:

```bash
npx hallow init
npx hallow setup
npx hallow doctor
npx hallow model add openai
npx hallow model add ollama
npx hallow model test
npx hallow agent create research
npx hallow agent run research "summarize this repo"
npx hallow skill create repo-pulse
npx hallow skill install github:user/skill-pack
npx hallow schedule add daily-brief --daily 08:00
npx hallow start
```

### 6.3 Local Web Console

Purpose:

- Browser-based local dashboard.
- Useful for users who do not want full desktop app.
- Runs at localhost.

Example:

```bash
hallow console start
```

Default URL:

```txt
http://localhost:4767
```

### 6.4 Optional Cloud

Purpose:

- Account identity.
- Marketplace discovery.
- License/subscription.
- Encrypted sync.
- Remote notifications.
- Team collaboration.
- Skill publishing.
- Agent pack distribution.
- Cloud relay for mobile or external channels.

Cloud must not be required for basic local use.

## 7. Local Folder Structure

Default local path:

```txt
~/.hallow/
```

Recommended structure:

```txt
~/.hallow/
  config.yaml
  .env
  identity.yaml
  policies/
    default.policy.yaml
    tools.policy.yaml
    internet.policy.yaml
    spending.policy.yaml
  agents/
    hallow/
      agent.yaml
      SOUL.md
      memory/
        MEMORY.md
        USER.md
        PROJECTS.md
      skills/
      traces/
      evals/
      inbox/
      outbox/
    research/
      agent.yaml
      SOUL.md
      memory/
      skills/
      traces/
  skills/
    daily-brief/
      SKILL.md
      skill.yaml
      examples/
      tests/
    repo-pulse/
      SKILL.md
      skill.yaml
  models/
    providers.yaml
    routing.yaml
  tools/
    registry.yaml
    mcp.json
  cron/
    jobs.yaml
  memory/
    global.sqlite
    vectors/
    attachments/
    exports/
  traces/
    global/
  logs/
    hallow.log
    audit.log
  cache/
  workspace/
  marketplace/
    installed.yaml
```

Design principle:

```txt
Every critical part should be inspectable by the user.
No mysterious cloud-only state for the local runtime.
```

## 8. Configuration

### 8.1 Global Config

File:

```txt
~/.hallow/config.yaml
```

Example:

```yaml
version: 1

profile: default

runtime:
  mode: local
  service_enabled: true
  workspace: ~/.hallow/workspace
  timezone: Asia/Jakarta
  max_concurrent_tasks: 3
  default_timeout_seconds: 300

memory:
  backend: sqlite_markdown
  root: ~/.hallow/memory
  vector_store: local
  embedding_model: openai:text-embedding-3-small
  auto_summarize: true
  auto_link_entities: true

models:
  config: ~/.hallow/models/providers.yaml
  routing: ~/.hallow/models/routing.yaml

skills:
  root: ~/.hallow/skills
  allow_auto_generation: true
  allow_auto_update: true
  auto_update_requires_eval: true
  min_successful_runs_before_skill: 3

tools:
  registry: ~/.hallow/tools/registry.yaml
  mcp_config: ~/.hallow/tools/mcp.json

security:
  policy_root: ~/.hallow/policies
  audit_log: ~/.hallow/logs/audit.log
  redact_secrets: true
  require_approval_for_dangerous_actions: true

gateway:
  local_console:
    enabled: true
    host: 127.0.0.1
    port: 4767
  telegram:
    enabled: false
    token_env: TELEGRAM_BOT_TOKEN
  discord:
    enabled: false
    token_env: DISCORD_BOT_TOKEN
  slack:
    enabled: false
    token_env: SLACK_BOT_TOKEN
```

### 8.2 Environment File

File:

```txt
~/.hallow/.env
```

Example:

```bash
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENROUTER_API_KEY=
GITHUB_TOKEN=
TELEGRAM_BOT_TOKEN=
DISCORD_BOT_TOKEN=
```

Rules:

- Never upload `.env` to marketplace.
- Never include `.env` in skill packs.
- Secrets should be redacted from traces.
- Agent memory must not store raw secrets.

## 9. Agent Manifest

Every agent should have an `agent.yaml`.

Example:

```yaml
schema: hallow.agent/v1

id: research
name: Research Agent
description: Tracks sources, investigates topics, and writes briefings.

personality:
  soul: ./SOUL.md
  tone: precise
  autonomy_style: cautious

model_policy:
  planning: route:smart
  execution: route:balanced
  summarization: route:cheap
  reflection: route:private
  vision: route:vision

memory:
  scope: agent
  read:
    - ./memory
    - ~/.hallow/memory/global.sqlite
  write:
    - ./memory
  auto_update: true

skills:
  enabled:
    - daily-brief
    - web-research
    - source-monitor
  allow_auto_skill_creation: true
  allow_auto_skill_update: true

tools:
  web:
    enabled: true
  browser:
    enabled: true
  filesystem:
    enabled: true
    roots:
      - ~/Documents
      - ~/Projects
  terminal:
    enabled: false
  github:
    enabled: true

autonomy:
  level: A2
  schedule_enabled: true
  max_background_tasks_per_day: 10
  can_start_tasks_without_user: true
  can_message_user: true
  can_message_external_people: false

learning:
  enabled: true
  reflect_after_task: true
  extract_reusable_workflows: true
  min_quality_score_for_memory: 0.78
  min_quality_score_for_skill_update: 0.85
  require_eval_before_activation: true

safety:
  approval_required:
    - file_delete
    - external_post
    - external_message
    - package_install
    - terminal_command
    - money_spend
  deny:
    - credential_exfiltration
    - hidden_external_send
    - destructive_file_operation
```

## 10. Agent Autonomy Levels

Hallow should define clear autonomy levels.

### A0: Manual

Agent only responds when user asks.

Allowed:

- Chat.
- Read approved context.
- Suggest actions.

Not allowed:

- Background tasks.
- Tool execution without explicit command.

### A1: Assisted

Agent can use tools during an active user session.

Allowed:

- Browse.
- Read files.
- Summarize.
- Draft.
- Run approved tools.

Needs approval:

- Writes.
- External sends.
- Terminal commands.

### A2: Scheduled

Agent can run scheduled tasks.

Allowed:

- Daily brief.
- Repo monitoring.
- Source monitoring.
- Reminder generation.
- Local file indexing.

Needs approval:

- External write actions.
- Risky file operations.

### A3: Autonomous Local

Agent can start low-risk tasks based on triggers.

Allowed:

- Monitor folders.
- Update private memory.
- Create draft reports.
- Trigger notifications.
- Run low-risk skills.

Needs approval:

- External posting.
- Deleting files.
- Spending money.
- Credential changes.

### A4: Autonomous External

Agent can perform selected external actions.

Allowed:

- Send approved message types.
- Open GitHub issues.
- Create pull requests.
- Publish drafts to specific channels.
- Interact with APIs under policy.

Needs strict policy:

- Rate limits.
- Allowlists.
- Audit logs.
- Rollback plans.

### A5: Delegated Operator

Agent can operate broad workflows with high trust.

Allowed:

- Multi-step external workflows.
- Team operations.
- Continuous monitoring and action.

Required:

- Explicit user opt-in.
- Strong audit.
- Sandboxing.
- Emergency stop.
- Scope-bound credentials.
- Periodic review.

Default should be A1 or A2. Hallow should not push users into unsafe autonomy.

## 11. Self-Improvement System

Hallow's agent intelligence should improve through a controlled learning loop.

### 11.1 Learning Loop

```txt
1. Receive task or trigger.
2. Select agent.
3. Load relevant memory.
4. Select model route.
5. Plan.
6. Execute with tools.
7. Record trace.
8. Evaluate output.
9. Reflect on result.
10. Update memory.
11. Detect reusable workflow.
12. Create or update skill draft.
13. Run skill test.
14. Promote skill if it passes policy.
```

### 11.2 Trace

Each task creates a trace.

Trace should include:

- Task ID.
- Agent ID.
- Trigger source.
- User instruction.
- Plan.
- Model calls.
- Tool calls.
- Tool results.
- Intermediate reasoning summary.
- Output.
- Error events.
- Duration.
- Token/cost estimate.
- Quality score.
- Safety flags.
- Reflection summary.

Trace file example:

```yaml
schema: hallow.trace/v1
id: trace_2026_05_19_001
agent_id: research
task: "Create daily AI research brief"
trigger: schedule:daily_08_00
started_at: "2026-05-19T08:00:00+07:00"
ended_at: "2026-05-19T08:04:17+07:00"
status: success
quality_score: 0.87
models:
  planning: openai:gpt-4.1
  execution: openrouter:anthropic/claude-sonnet
  summarization: ollama:qwen2.5
tools:
  - web.search
  - web.fetch
  - memory.write
artifacts:
  - ~/.hallow/agents/research/outbox/daily-brief-2026-05-19.md
reflection:
  reusable_workflow: true
  suggested_skill_update: daily-brief
```

### 11.3 Evaluation

Every important task should be scored.

Evaluation dimensions:

- Completeness.
- Correctness.
- Source quality.
- Tool efficiency.
- Cost efficiency.
- Safety.
- User preference alignment.
- Reusability.

Example:

```yaml
quality:
  completeness: 0.91
  correctness: 0.84
  source_quality: 0.88
  cost_efficiency: 0.72
  safety: 0.96
  preference_alignment: 0.81
  reusability: 0.89
  total: 0.86
```

### 11.4 Reflection

Reflection converts experience into useful future behavior.

Reflection questions:

- What worked?
- What failed?
- Which sources were reliable?
- Which steps repeated from previous tasks?
- Should memory be updated?
- Should a new skill be created?
- Should an existing skill be improved?
- Did the agent violate any policy?
- Can the next run be cheaper, faster, or safer?

### 11.5 Memory Update Rules

Memory updates must be controlled.

Allowed automatic memory:

- User preferences explicitly observed.
- Project facts from trusted sources.
- Stable workflows.
- Recurring source lists.
- Entity summaries.
- Task outcomes.

Require approval:

- Sensitive personal info.
- Financial data.
- Health/legal data.
- Credentials.
- External people's private info.
- Ambiguous conclusions.

Never store:

- Raw API keys.
- Passwords.
- Unredacted tokens.
- Full private conversations unless user opts in.

### 11.6 Skill Creation

If a workflow succeeds repeatedly, Hallow can create a skill.

Skill promotion condition:

```txt
successful_runs >= 3
average_quality_score >= 0.85
no_high_risk_policy_flags
test_case_passed == true
```

Auto-generated skills start as drafts.

```txt
skills/
  ai-research-brief/
    SKILL.md
    skill.yaml
    examples/
    tests/
    traces/
```

## 12. Skill Standard

Hallow skills should be simple enough to write by hand, but structured enough to test.

### 12.1 SKILL.md

Example:

```md
# Daily Research Brief

Use this skill when the user asks for a concise daily research brief or when the daily research schedule runs.

## Inputs

- topic
- source list
- date
- preferred length

## Workflow

1. Check trusted sources first.
2. Search for new high-signal items.
3. Fetch primary sources.
4. Summarize each item.
5. Rank by novelty and impact.
6. Produce a brief with citations.
7. Save output to outbox.
8. Write reusable source updates to memory.

## Quality Bar

- Prefer primary sources.
- Do not include unsourced claims.
- Separate facts from inference.
- Keep the final brief short unless requested.

## Failure Handling

- If sources are unavailable, report missing sources.
- If confidence is low, mark the item as uncertain.
```

### 12.2 skill.yaml

Example:

```yaml
schema: hallow.skill/v1
id: daily-research-brief
name: Daily Research Brief
version: 0.1.0
author: local
license: private

entry: SKILL.md

required_tools:
  - web.search
  - web.fetch
  - memory.read
  - memory.write

permissions:
  internet: true
  filesystem_write: scoped
  external_send: false
  terminal: false

models:
  recommended:
    planning: route:smart
    summarization: route:balanced

tests:
  - tests/basic.yaml

promotion:
  min_quality_score: 0.85
  min_successful_runs: 3
```

### 12.3 Skill Types

Hallow should support:

- Research skills.
- Coding skills.
- File organization skills.
- Browser automation skills.
- Communication skills.
- Monitoring skills.
- Data extraction skills.
- Personal assistant skills.
- Business workflow skills.
- Creative production skills.
- Agent coordination skills.

## 13. Model Router

Hallow should connect to many model providers.

### 13.1 Supported Providers

Initial provider types:

- OpenAI.
- Anthropic.
- Gemini.
- OpenRouter.
- Groq.
- Together.
- Hugging Face Inference.
- Ollama.
- LM Studio.
- llama.cpp server.
- Any OpenAI-compatible endpoint.

### 13.2 Model Provider Config

File:

```txt
~/.hallow/models/providers.yaml
```

Example:

```yaml
providers:
  openai:
    type: openai
    api_key_env: OPENAI_API_KEY

  openrouter:
    type: openai_compatible
    base_url: https://openrouter.ai/api/v1
    api_key_env: OPENROUTER_API_KEY

  ollama:
    type: ollama
    base_url: http://localhost:11434

  lmstudio:
    type: openai_compatible
    base_url: http://localhost:1234/v1
    api_key: local
```

### 13.3 Routing Config

File:

```txt
~/.hallow/models/routing.yaml
```

Example:

```yaml
routes:
  smart:
    primary: openai:gpt-4.1
    fallback:
      - openrouter:anthropic/claude-sonnet
      - gemini:gemini-2.5-pro

  balanced:
    primary: openai:gpt-4.1-mini
    fallback:
      - openrouter:qwen/qwen3
      - groq:llama-3.3-70b

  cheap:
    primary: groq:llama-3.3-70b
    fallback:
      - ollama:qwen2.5

  private:
    primary: ollama:qwen2.5
    fallback:
      - lmstudio:local-model

  coding:
    primary: openai:gpt-4.1
    fallback:
      - openrouter:anthropic/claude-sonnet

  vision:
    primary: openai:gpt-4.1

  long_context:
    primary: gemini:gemini-2.5-pro
    fallback:
      - openrouter:google/gemini-pro
```

### 13.4 Routing Modes

User-facing model modes:

- Local/private.
- Cost saver.
- Balanced.
- Maximum intelligence.
- Coding.
- Research.
- Creative.

Agent-facing model roles:

- Planning.
- Execution.
- Tool selection.
- Summarization.
- Reflection.
- Evaluation.
- Memory extraction.
- Vision.
- Code.
- Long context.

### 13.5 Router Decision Inputs

Router should consider:

- Task type.
- Risk level.
- Privacy level.
- Required modality.
- Context length.
- Expected cost.
- Latency requirement.
- User preference.
- Provider availability.
- Past model quality for similar tasks.

## 14. Tool System

Hallow tools are capabilities agents can use under policy.

### 14.1 Tool Categories

Core tools:

- Memory read.
- Memory write.
- File read.
- File write.
- Web search.
- Web fetch.
- Browser automation.
- Terminal.
- Git.
- GitHub.
- Calendar.
- Email.
- Notes.
- Notifications.
- Local app launcher.
- MCP server.

### 14.2 Tool Registry

File:

```txt
~/.hallow/tools/registry.yaml
```

Example:

```yaml
tools:
  web.search:
    enabled: true
    risk: low
    approval: auto

  web.fetch:
    enabled: true
    risk: low
    approval: auto

  filesystem.read:
    enabled: true
    risk: medium
    roots:
      - ~/Documents
      - ~/Projects
    approval: auto

  filesystem.write:
    enabled: true
    risk: medium
    roots:
      - ~/Documents/Hallow
      - ~/Projects
    approval: ask

  terminal.run:
    enabled: false
    risk: high
    approval: ask

  github.issue.create:
    enabled: true
    risk: medium
    approval: ask
```

### 14.3 MCP

Hallow should support MCP because it allows a broad ecosystem of tool servers.

MCP config:

```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "~/Documents"]
    },
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

### 14.4 Tool Sandboxing

Risky tools should run inside a sandbox.

Sandbox options:

- Local direct mode.
- Docker mode.
- Restricted subprocess.
- Browser context.
- Remote sandbox later.

Default:

```txt
Low-risk read tools: direct.
File writes: scoped.
Terminal/code execution: Docker or disabled.
External sends: approval required.
```

## 15. Scheduler

Hallow needs a scheduler so agents can work without repeated manual prompting.

File:

```txt
~/.hallow/cron/jobs.yaml
```

Example:

```yaml
jobs:
  daily_brief:
    agent: research
    skill: daily-research-brief
    schedule: "0 8 * * *"
    timezone: Asia/Jakarta
    input:
      topic: "AI agents, local-first AI, model routing"
    autonomy_level: A2
    output:
      type: notification
      channel: desktop

  repo_pulse:
    agent: developer
    skill: repo-pulse
    schedule: "0 18 * * 1-5"
    input:
      repo_path: "~/Projects/main-app"
    autonomy_level: A2
```

Scheduler capabilities:

- Cron.
- Interval.
- Event-based triggers.
- File change triggers.
- GitHub triggers.
- RSS/web source triggers.
- Email/calendar triggers.
- Manual trigger.

## 16. Memory System

Hallow memory should be layered.

### 16.1 Memory Layers

#### Working Memory

Short-term context for the current task.

#### Episodic Memory

What happened:

- Past tasks.
- Outcomes.
- Decisions.
- Interactions.

#### Semantic Memory

Stable knowledge:

- User preferences.
- Project facts.
- Source lists.
- Concepts.
- Contacts.

#### Procedural Memory

How to do things:

- Skills.
- Workflows.
- Tool patterns.
- Recovery strategies.

#### Reflective Memory

How the agent is improving:

- Mistakes.
- Evaluation history.
- Model performance.
- Skill changes.

### 16.2 Memory Storage

Recommended MVP storage:

- SQLite for records.
- Markdown for readable summaries.
- Local vector index for semantic search.
- JSON/YAML for config and traces.

Possible local vector options:

- sqlite-vss.
- LanceDB.
- Chroma local.
- Qdrant local.

MVP should choose the simplest reliable option:

```txt
SQLite + Markdown first.
Vector store second.
```

### 16.3 Memory Browser

Desktop app should let user:

- Search memory.
- See memory sources.
- Edit memory.
- Delete memory.
- Approve pending memory updates.
- Export memory.
- Import memory.
- View memory graph later.

### 16.4 Memory Privacy

Memory privacy levels:

- Public: safe to use anywhere.
- Private: local only unless approved.
- Sensitive: never leave local machine unless explicitly allowed.
- Secret: never send to model or tool.

Each memory item should include:

```yaml
id: mem_001
type: preference
content: "User prefers concise daily briefings."
source: trace_2026_05_19_001
confidence: 0.82
privacy: private
created_at: "2026-05-19T08:05:00+07:00"
updated_at: "2026-05-19T08:05:00+07:00"
```

## 17. Permission and Policy System

Hallow's autonomy only works if permission is clear.

### 17.1 Policy File

Example:

```yaml
schema: hallow.policy/v1

defaults:
  read_files: ask
  write_files: ask
  delete_files: deny
  web_search: allow
  web_fetch: allow
  terminal: ask
  external_message: ask
  external_post: ask
  spend_money: deny

allow:
  filesystem.read:
    roots:
      - ~/Documents/Hallow
      - ~/Projects
  filesystem.write:
    roots:
      - ~/Documents/Hallow
  web:
    domains:
      - github.com
      - huggingface.co
      - arxiv.org
      - reddit.com

deny:
  commands:
    - "rm -rf /"
    - "format"
    - "del /s"
  memory:
    - raw_api_keys
    - passwords

approval:
  always:
    - file_delete
    - package_install
    - external_post
    - external_message
    - money_spend
```

### 17.2 Risk Levels

Every action should have a risk level:

- R0: No external effect.
- R1: Read-only local or public web.
- R2: Local write inside approved folder.
- R3: External draft or API write.
- R4: External send/publish/delete.
- R5: Money, credentials, destructive operations.

### 17.3 Approval UX

Approval prompt should show:

- Agent.
- Action.
- Tool.
- Target.
- Risk.
- Reason.
- Preview.
- Allow once.
- Allow for this skill.
- Allow for this agent.
- Deny.

### 17.4 Emergency Stop

Hallow needs a global stop:

```bash
hallow stop --all
```

Desktop app should always have a visible stop button for running tasks.

## 18. Runtime Architecture

### 18.1 Components

```txt
Desktop App / Local Console / CLI
          |
          v
Hallow Runtime Service
          |
          +-- Agent Manager
          +-- Task Queue
          +-- Scheduler
          +-- Model Router
          +-- Memory Service
          +-- Skill Engine
          +-- Tool Gateway
          +-- Policy Engine
          +-- Trace Logger
          +-- Evaluator
          +-- Reflector
          +-- Notification Gateway
```

### 18.2 Hallow Runtime Service

The Hallow runtime service is a background process.

Responsibilities:

- Start at login if enabled.
- Manage agents.
- Run scheduled jobs.
- Maintain local API.
- Serve desktop and local console.
- Manage task queue.
- Handle notifications.
- Watch files/events.
- Enforce policy.
- Record logs and traces.

### 18.3 Local API

The Hallow runtime exposes a local API:

```txt
http://127.0.0.1:4767/api
```

Core endpoints:

```txt
GET  /health
GET  /agents
POST /agents
GET  /agents/:id
POST /agents/:id/run
GET  /tasks
POST /tasks
GET  /tasks/:id
POST /tasks/:id/cancel
GET  /skills
POST /skills/install
GET  /memory/search
POST /memory
GET  /traces
GET  /models
POST /models/test
GET  /tools
POST /approvals/:id/approve
POST /approvals/:id/deny
```

### 18.4 Event Bus

Internal events:

- task.created
- task.started
- task.step.completed
- task.failed
- task.completed
- trace.created
- memory.suggested
- memory.updated
- skill.suggested
- skill.updated
- approval.requested
- approval.resolved
- model.failed
- tool.failed
- policy.violation

### 18.5 Task Queue

MVP can use SQLite-backed queue.

Later options:

- BullMQ for cloud/team.
- NATS for distributed runtime.
- Temporal/Durable execution for enterprise.

For MVP:

```txt
SQLite queue is enough.
```

## 19. Agent Execution Flow

Example run:

```txt
1. Scheduler triggers daily_brief.
2. Hallow runtime creates task.
3. Agent Manager selects research agent.
4. Memory Service retrieves relevant memory.
5. Skill Engine loads daily-research-brief.
6. Policy Engine checks tools.
7. Model Router selects planning model.
8. Agent creates plan.
9. Tool Gateway executes web searches and fetches.
10. Trace Logger records each step.
11. Agent writes final brief.
12. Evaluator scores result.
13. Reflector suggests memory updates and skill improvements.
14. User receives desktop notification.
15. If quality is high, skill stats improve.
```

## 20. Multi-Agent System

Hallow should support multiple agents, but avoid making the MVP too complex.

### 20.1 Initial Agent Types

Default agents:

- Hallow Agent: general coordinator.
- Research Agent: web/source research.
- Builder Agent: coding and repo workflows.
- Archivist Agent: memory organization.
- Watcher Agent: monitoring and alerts.

### 20.2 Agent Collaboration

Agents can hand off tasks.

Example:

```txt
Hallow Agent receives "prepare weekly project report"
-> Research Agent gathers sources
-> Builder Agent checks repo status
-> Archivist Agent pulls memory
-> Hallow Agent writes final report
```

### 20.3 Agent Communication Standard

Internal agent messages:

```yaml
schema: hallow.message/v1
from: hallow
to: research
task_id: task_001
intent: gather_context
payload:
  topic: "local-first AI agent runtimes"
  max_sources: 12
constraints:
  cite_sources: true
  avoid_unsourced_claims: true
```

### 20.4 Agent Capability Discovery

Each agent declares capabilities:

```yaml
capabilities:
  - web_research
  - source_ranking
  - briefing
  - memory_update
```

Future compatibility:

- A2A-style capability discovery.
- Remote agent collaboration.
- Team/shared agent networks.

## 21. Gateway System

Gateways allow users to interact with Hallow from multiple channels.

### 21.1 Initial Gateways

MVP:

- Desktop app.
- Local web console.
- CLI.
- Desktop notification.

Post-MVP:

- Telegram.
- Discord.
- Slack.
- Email.
- WhatsApp via third-party integration.
- Browser extension.
- Mobile app.

### 21.2 Gateway Rules

Each gateway has permissions.

Example:

```yaml
telegram:
  enabled: true
  allowed_users:
    - "123456"
  allowed_commands:
    - ask
    - status
    - approve
    - run_skill
  can_send_files: false
  can_trigger_external_actions: false
```

## 22. Marketplace

Hallow marketplace should distribute skills, agents, connectors, and templates.

### 22.1 Marketplace Items

Types:

- Skill.
- Agent.
- Tool connector.
- Model route preset.
- Workflow template.
- Policy template.
- Memory template.
- Gateway plugin.

### 22.2 Marketplace Manifest

Example:

```yaml
schema: hallow.marketplace.item/v1
id: hallow.daily-brief
type: skill
name: Daily Brief
version: 0.1.0
author: Hallow
description: Creates a daily briefing from trusted sources.
license: MIT
repository: https://github.com/hallow/skills

permissions:
  internet: true
  filesystem_write: scoped
  terminal: false
  external_send: false

risk_level: R1

install:
  path: skills/daily-brief

compatibility:
  hallow: ">=0.1.0"
```

### 22.3 Marketplace Safety

Marketplace needs trust layers:

- Signed packages.
- Permission disclosure.
- User reviews.
- Test results.
- Verified publishers.
- Open source scan.
- Sandboxed install.
- Disable/remove anytime.

### 22.4 Monetization Later

Possible marketplace monetization:

- Paid skill packs.
- Team licenses.
- Verified publisher fee.
- Enterprise private marketplace.
- Hosted relay/sync subscription.

## 23. Desktop App Design Direction

Hallow should not feel like a crypto dashboard, social feed, or generic SaaS landing page.

It should feel like:

- Quiet.
- Local.
- Technical but approachable.
- Powerful.
- Private.
- Alive in the background.

### 23.1 Main Layout

Left sidebar:

- Home.
- Agents.
- Tasks.
- Memory.
- Skills.
- Schedule.
- Tools.
- Models.
- Traces.
- Settings.

Main content:

- Current agent status.
- Running tasks.
- Recent outputs.
- Pending approvals.
- Upcoming scheduled jobs.

Right side drawer:

- Agent detail.
- Memory context.
- Trace timeline.
- Approval panel.

### 23.2 Home Screen

Home should answer:

- What are my agents doing?
- What needs my approval?
- What did they finish?
- What is scheduled next?

No marketing copy inside app.

### 23.3 Agent Page

Agent page should show:

- Agent name.
- Autonomy level.
- Model route.
- Enabled skills.
- Tool permissions.
- Recent tasks.
- Quality trend.
- Memory updates.
- Stop/pause button.

### 23.4 Memory Page

Memory page should show:

- Search.
- Recent memory updates.
- Pending memory suggestions.
- Memory privacy labels.
- Source trace.
- Edit/delete controls.

### 23.5 Skill Page

Skill page should show:

- Installed skills.
- Draft skills.
- Skill quality stats.
- Permission requirements.
- Test result.
- Update history.

### 23.6 Trace Page

Trace page should show:

- Task timeline.
- Tool calls.
- Model calls.
- Cost.
- Output.
- Evaluation.
- Reflection.
- Policy events.

## 24. CLI Specification

### 24.1 init

```bash
hallow init
```

Creates:

- `~/.hallow/`
- default config.
- default policy.
- Hallow agent.
- initial memory files.

### 24.2 setup

```bash
hallow setup
```

Interactive setup:

```txt
Choose storage path
Choose model provider
Add API key or use local model
Choose autonomy default
Choose allowed folders
Enable Hallow runtime service
Enable local console
```

### 24.3 doctor

```bash
hallow doctor
```

Checks:

- Config validity.
- Model connectivity.
- Local database.
- File permissions.
- Tool availability.
- MCP servers.
- Scheduler.
- Runtime service status.

### 24.4 model

```bash
hallow model add openai
hallow model add openrouter
hallow model add ollama
hallow model list
hallow model test openai:gpt-4.1
hallow model route set smart openai:gpt-4.1
```

### 24.5 agent

```bash
hallow agent create research
hallow agent list
hallow agent run research "summarize this folder"
hallow agent pause research
hallow agent resume research
hallow agent logs research
```

### 24.6 skill

```bash
hallow skill create daily-brief
hallow skill list
hallow skill test daily-brief
hallow skill install github:user/skill
hallow skill publish daily-brief
```

### 24.7 runtime service

```bash
hallow start
hallow stop
hallow status
hallow logs
```

## 25. MVP Definition

The MVP must prove the core thesis:

```txt
A user can install Hallow locally, connect a model, create an agent,
run scheduled autonomous work, preserve memory locally, and improve a skill
from repeated successful traces.
```

### 25.1 MVP Must-Have

MVP features:

- CLI init/setup.
- Local config folder.
- Local runtime service.
- Local web console or desktop shell.
- Model router with at least:
  - OpenAI-compatible endpoint.
  - Ollama.
- One default agent.
- Memory storage with SQLite + Markdown.
- Basic skill system.
- Basic scheduler.
- Basic trace logging.
- Basic evaluator.
- Basic reflection.
- Tool permissions.
- File read/write scoped to workspace.
- Web search/fetch.
- Skill creation from template.
- One self-improvement path:
  - Run task repeatedly.
  - Score output.
  - Suggest skill update.
  - Save skill draft.

### 25.2 MVP Default Skills

Five initial skills:

1. Daily Brief
   - Summarizes selected topics/sources.

2. Repo Pulse
   - Reads a local repository and reports changes, TODOs, failing tests, and risks.

3. Research Digest
   - Investigates a topic and writes a cited summary.

4. File Triage
   - Organizes files in a scoped folder with approval.

5. Watcher
   - Monitors sources/folders and notifies user when something important changes.

### 25.3 MVP Non-Goals

Do not build these first:

- Full cloud sync.
- Mobile app.
- Complex marketplace payments.
- Enterprise admin.
- Multi-user team workspace.
- Fully autonomous external posting.
- Wallet/crypto actions.
- Large social platform.
- Overcomplicated multi-agent swarm.

## 26. Suggested Technical Stack

### 26.1 Core Runtime

Recommended:

- TypeScript.
- Node.js.
- SQLite.
- Fastify or Hono for local API.
- Zod for schema validation.
- Drizzle ORM or Kysely for database.
- pnpm workspace.

Why:

- Strong CLI/package ecosystem.
- Easy desktop/web sharing.
- Works well with MCP and OpenAI-compatible APIs.
- Easier for developer marketplace.

### 26.2 Desktop App

Recommended:

- Tauri if we want smaller native app.
- Electron if we want faster web compatibility.

MVP recommendation:

```txt
Start with local web console + CLI.
Wrap into Tauri desktop after runtime is stable.
```

### 26.3 UI

Recommended:

- Next.js or Vite React for console.
- Tailwind or plain CSS modules.
- Zustand or TanStack Query.
- Lucide icons.

### 26.4 Database

MVP:

- SQLite.

Tables:

- agents.
- tasks.
- task_events.
- traces.
- memories.
- skills.
- skill_runs.
- approvals.
- model_calls.
- tool_calls.
- schedules.
- settings.

### 26.5 Package Layout

Future repo:

```txt
hallow/
  apps/
    console/
    desktop/
  packages/
    cli/
    service/
    runtime/
    models/
    memory/
    skills/
    tools/
    policy/
    scheduler/
    sdk/
    ui/
  skills/
    daily-brief/
    repo-pulse/
    research-digest/
    file-triage/
    watcher/
  docs/
  examples/
```

## 27. Data Model

### 27.1 Agent

```ts
type Agent = {
  id: string
  name: string
  description?: string
  autonomyLevel: "A0" | "A1" | "A2" | "A3" | "A4" | "A5"
  manifestPath: string
  enabled: boolean
  createdAt: string
  updatedAt: string
}
```

### 27.2 Task

```ts
type Task = {
  id: string
  agentId: string
  skillId?: string
  status: "queued" | "running" | "waiting_approval" | "succeeded" | "failed" | "cancelled"
  trigger: "manual" | "schedule" | "event" | "gateway"
  input: unknown
  output?: unknown
  qualityScore?: number
  riskLevel: "R0" | "R1" | "R2" | "R3" | "R4" | "R5"
  createdAt: string
  startedAt?: string
  endedAt?: string
}
```

### 27.3 Memory

```ts
type MemoryItem = {
  id: string
  scope: "global" | "agent" | "project"
  agentId?: string
  type: "preference" | "fact" | "project" | "workflow" | "source" | "reflection"
  content: string
  sourceTraceId?: string
  confidence: number
  privacy: "public" | "private" | "sensitive" | "secret"
  createdAt: string
  updatedAt: string
}
```

### 27.4 Skill

```ts
type Skill = {
  id: string
  name: string
  version: string
  path: string
  status: "installed" | "draft" | "disabled"
  permissions: string[]
  qualityScore?: number
  successfulRuns: number
  failedRuns: number
  createdAt: string
  updatedAt: string
}
```

### 27.5 Approval

```ts
type Approval = {
  id: string
  taskId: string
  agentId: string
  action: string
  target: string
  riskLevel: "R0" | "R1" | "R2" | "R3" | "R4" | "R5"
  reason: string
  status: "pending" | "approved" | "denied" | "expired"
  createdAt: string
  resolvedAt?: string
}
```

## 28. Security Model

### 28.1 Core Threats

Hallow must defend against:

- Prompt injection.
- Tool abuse.
- Data exfiltration.
- Secret leakage.
- Malicious skills.
- Malicious MCP servers.
- Destructive commands.
- External spam.
- Model hallucination causing harmful action.
- Supply-chain attacks through marketplace packages.

### 28.2 Defenses

Required defenses:

- Tool permission policy.
- Scoped filesystem.
- Approval gates.
- Secret redaction.
- Prompt injection warnings for web content.
- Tool output isolation.
- Marketplace permission disclosure.
- Signed packages later.
- Audit logs.
- Sandboxed terminal.
- Emergency stop.

### 28.3 Web Content Handling

Web pages can contain prompt injection.

Rule:

```txt
Fetched web content is data, not instruction.
```

Agent system prompt must make this clear. Tool gateway should mark web content as untrusted.

### 28.4 Secrets

Secrets:

- Stored in `.env` or OS keychain.
- Never passed to model unless required and approved.
- Never written to memory.
- Redacted in traces.
- Hidden in UI logs.

## 29. Cloud Strategy

Hallow should be local-first, but cloud can still create business value.

### 29.1 What Stays Local

Default local:

- Memory.
- Traces.
- Agent config.
- Skill execution.
- Files.
- Schedules.
- Tool credentials.

### 29.2 What Cloud Can Do

Optional cloud:

- Account login.
- License/subscription.
- Skill marketplace.
- Remote notification relay.
- Encrypted backup.
- Encrypted sync between devices.
- Team workspace.
- Private marketplace.
- Hosted agent runtime for users who choose cloud.

### 29.3 Business Model

Possible:

- Free local runtime.
- Pro cloud sync.
- Pro marketplace features.
- Team admin.
- Enterprise private deployment.
- Paid verified skill marketplace.

## 30. Development Roadmap

### Phase 0: Foundation Blueprint

Deliverables:

- Product blueprint.
- Initial repo structure.
- CLI package skeleton.
- Runtime package skeleton.
- Manifest schemas.
- Example config.

### Phase 1: CLI + Local Runtime

Deliverables:

- `hallow init`.
- `hallow setup`.
- `hallow doctor`.
- Local config folder.
- SQLite database.
- Basic runtime service.
- Local API health endpoint.

Success:

```txt
User can install Hallow and start the runtime locally.
```

### Phase 2: Model Router

Deliverables:

- OpenAI-compatible provider.
- Ollama provider.
- Model test command.
- Route config.
- Fallback behavior.

Success:

```txt
User can connect a model and run a simple task.
```

### Phase 3: Agent + Skill Engine

Deliverables:

- Agent manifest.
- Default Hallow agent.
- Skill loader.
- Skill template.
- Manual skill run.

Success:

```txt
User can create an agent and run a skill.
```

### Phase 4: Memory + Trace

Deliverables:

- SQLite memory store.
- Markdown memory summaries.
- Trace logger.
- Task event log.
- Memory search.

Success:

```txt
Agent can remember useful context between runs.
```

### Phase 5: Scheduler + Autonomy

Deliverables:

- Cron jobs.
- Background runtime execution.
- Notifications.
- Autonomy levels.
- Approval queue.

Success:

```txt
Agent can run daily tasks without manual prompting.
```

### Phase 6: Reflection + Skill Improvement

Deliverables:

- Evaluator.
- Reflection step.
- Skill draft generation.
- Skill update suggestions.
- Skill tests.

Success:

```txt
Agent can improve a repeated workflow safely.
```

### Phase 7: Local Console

Deliverables:

- Agents page.
- Tasks page.
- Memory page.
- Skills page.
- Schedule page.
- Models page.
- Traces page.
- Approvals page.

Success:

```txt
User can observe and control Hallow visually.
```

### Phase 8: Marketplace Alpha

Deliverables:

- Skill package manifest.
- Install from GitHub.
- Local marketplace index.
- Permission disclosure.
- Basic verification.

Success:

```txt
Developer can share a Hallow skill.
```

## 31. First 30-Day Build Plan

### Week 1

Build:

- Monorepo skeleton.
- CLI init/setup/doctor.
- Config generator.
- SQLite schema.
- Local runtime health API.

Outcome:

```txt
Hallow can install and boot.
```

### Week 2

Build:

- Model router.
- OpenAI-compatible provider.
- Ollama provider.
- Agent manifest loader.
- Basic task runner.

Outcome:

```txt
Hallow can run an agent task with a selected model.
```

### Week 3

Build:

- Skill system.
- Daily Brief skill.
- Repo Pulse skill.
- Trace logger.
- Memory write/read.

Outcome:

```txt
Agent can use skills and remember outputs.
```

### Week 4

Build:

- Scheduler.
- Approval queue.
- Evaluator.
- Reflection summary.
- Local console MVP.

Outcome:

```txt
Agent can run scheduled work, score results, and suggest improvements.
```

## 32. First Demo Scenario

The first demo should be concrete.

### Demo Setup

User runs:

```bash
npx hallow init
npx hallow model add openrouter
npx hallow agent create research
npx hallow schedule add daily-ai-brief --skill daily-brief --daily 08:00
npx hallow start
```

### Demo Behavior

At 08:00:

1. Research Agent wakes up.
2. Loads memory about preferred sources.
3. Searches web/GitHub/Hugging Face.
4. Ranks findings.
5. Writes brief.
6. Saves trace.
7. Scores output.
8. Updates source memory.
9. Suggests improving Daily Brief skill.
10. Sends local notification.

### Demo Magic Moment

After three successful daily briefs:

```txt
Hallow suggests:
"I found a repeatable workflow for your AI trend brief.
I can save it as a skill and use it every morning."
```

That is the moment users understand Hallow:

```txt
The agent is not just answering.
It is learning how work gets done.
```

## 33. Competitive Differentiation

### Compared to Chatbots

Chatbots answer. Hallow works, remembers, schedules, and improves.

### Compared to Cloud Agent Platforms

Cloud platforms run agents remotely. Hallow runs them locally by default.

### Compared to Developer Frameworks

Frameworks help developers build agents. Hallow gives users a runtime where agents actually live.

### Compared to Personal AI Memory Apps

Memory apps remember. Hallow turns memory into action.

### Compared to Automation Tools

Automation tools repeat static workflows. Hallow converts successful agent traces into evolving skills.

## 34. Product Risks

### Risk: Too Broad

Mitigation:

- MVP focuses on local runtime, model router, memory, skills, scheduler, and one learning loop.

### Risk: Unsafe Autonomy

Mitigation:

- Default to low autonomy.
- Add approval gates.
- Enforce scoped tools.
- Use audit logs.

### Risk: Memory Becomes Messy

Mitigation:

- Require confidence scores.
- Use memory types.
- Provide memory review.
- Keep Markdown summaries human-editable.

### Risk: Skill Quality Is Poor

Mitigation:

- Draft status.
- Tests.
- Quality scoring.
- Promotion thresholds.
- User approval for important skills.

### Risk: Marketplace Security

Mitigation:

- Permission disclosure.
- Signed packages later.
- Verified publishers.
- Sandbox risky skills.

### Risk: Local Setup Is Too Hard

Mitigation:

- Interactive setup.
- Good defaults.
- Doctor command.
- Local model optional, not required.
- Desktop setup wizard later.

## 35. Engineering Principles

Hallow should be built with these principles:

- Local-first, cloud-optional.
- Human-readable config.
- Observable execution.
- Permissioned autonomy.
- Skills over hidden prompts.
- Trace everything important.
- Never hide risky actions.
- Prefer standards and open formats.
- Make developer extension easy.
- Keep the first product small but real.

## 36. Open Questions

Important questions to decide later:

- Should the first desktop app be Tauri or Electron?
- Should the first local console use Next.js or Vite?
- Should vector memory start with SQLite-only or local Qdrant/LanceDB?
- Should marketplace packages be Git repos first or registry packages first?
- Should Hallow cloud launch with accounts or wait until local MVP is strong?
- Should skills support executable code in MVP or only Markdown workflow instructions?
- Should agent reflection be fully automatic or require review during alpha?
- Should the runtime support multi-user team mode from the beginning or later?

## 37. Recommended First Technical Decision

Start with:

```txt
TypeScript monorepo.
CLI-first.
Local runtime service.
SQLite database.
Markdown skills.
OpenAI-compatible model provider.
Ollama provider.
Local web console.
No cloud dependency in MVP.
```

This gives the fastest path to a working product without losing the larger vision.

## 38. North Star

Hallow should become the private operating layer for autonomous AI work.

The north star experience:

```txt
Install Hallow.
Connect models.
Create agents.
Give them bounded permissions.
Let them work.
Watch them learn.
Own the memory.
Share the skills.
```

The product wins if users say:

```txt
My agents live here.
They know my work.
They get better every week.
And the memory is mine.
```
