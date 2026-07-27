# Hallow Comparison Report

Tanggal: 2026-05-19
Status Hallow yang dibandingkan: local build `.hallow-dev` dengan readiness `100% (strong)`.

Report ini membandingkan Hallow dengan Aeon, OpenHuman, Hermes Agent, dan OpenClaw berdasarkan dokumentasi publik yang dicek pada tanggal di atas, plus kondisi build Hallow lokal saat ini.

## Sumber Publik

- Aeon: https://github.com/aaronjmars/aeon
- OpenHuman: https://github.com/tinyhumansai/openhuman
- Hermes Agent: https://github.com/NousResearch/hermes-agent
- Hermes MCP docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp
- Hermes skills docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/skills
- Hermes memory docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/memory
- Hermes cron docs: https://hermes-agent.nousresearch.com/docs/user-guide/features/cron
- OpenClaw: https://github.com/openclaw/openclaw
- OpenClaw docs: https://docs.openclaw.ai/
- OpenClaw security docs: https://docs.openclaw.ai/security

## Executive Verdict

Hallow tidak perlu menjadi clone dari OpenHuman, Hermes, Aeon, atau OpenClaw. Posisi yang paling kuat adalah:

```txt
Hallow = local-first agent runtime + memory vault + skill/agent standard
       + autonomous scheduler + model router + policy-gated tool layer.
```

Artinya Hallow harus menjadi "rumah dan standar kerja" untuk agent otonom lokal. User menjalankan agent di mesin sendiri, memory tetap lokal, skill bisa dipasang seperti package, agent bisa belajar dari trace, dan platform hanya menjadi standar, registry, sync opsional, serta marketplace.

Hallow sudah layak dibandingkan di level konsep dan foundation runtime. Hallow belum layak menang di level polish produk, jumlah integrasi, sandbox keras, MCP ecosystem, dan desktop observation layer.

## Posisi Tiap Produk

| Produk | Inti Produk | Kekuatan Besar | Celah Untuk Hallow |
|---|---|---|---|
| Hallow | Local-first runtime untuk self-improving autonomous agents | Runtime lokal, CLI/API/console, memory vault, agent package verifier, skill package verifier, autonomy loop, scheduler, approval safety, traces, model routing | Belum punya desktop app matang, browser/desktop observation, MCP-native discovery, sandbox keras, marketplace publik |
| OpenHuman | Personal AI agent lokal dengan UI bersih dan memory personal | UI-first, onboarding pendek, memory tree, Obsidian-style vault, integrations/OAuth, local-first positioning | Hallow bisa lebih kuat di standardisasi agent/skill dan developer/runtime layer |
| Hermes Agent | Local agent framework dengan MCP, skills, messaging, cron, subagent, terminal backends | MCP sangat kuat, skill system matang, process/backend options, cron lewat chat/CLI, session search | Hallow bisa lebih opinionated sebagai OS agent lokal dan marketplace standard |
| Aeon | Autonomous scheduled agent framework | Scheduler, self-healing, quality scoring, reactive triggers, skill repair, "configure once" | Hallow bisa membawa pola Aeon ke local-first runtime yang lebih general |
| OpenClaw | Personal assistant/gateway multi-channel | Banyak channel, gateway model, node/device actions, security hardening docs, pairing/allowlists | Hallow bisa lebih aman sejak awal dengan policy standard, package verification, dan local memory ownership |

## Feature Matrix

Score: 1 lemah, 5 kuat. Ini adalah penilaian arah produk, bukan benchmark formal.

| Axis | Hallow | OpenHuman | Hermes | Aeon | OpenClaw |
|---|---:|---:|---:|---:|---:|
| Local-first ownership | 5 | 5 | 4 | 3 | 4 |
| Memory architecture | 4 | 5 | 4 | 3 | 3 |
| Autonomous scheduler | 4 | 3 | 4 | 5 | 3 |
| Self-improving skills | 4 | 3 | 4 | 5 | 3 |
| Agent/skill package standard | 4 | 2 | 4 | 3 | 3 |
| MCP/tool ecosystem | 2 | 3 | 5 | 3 | 3 |
| Channel gateway | 2 | 4 | 4 | 3 | 5 |
| Security/policy posture | 4 | 3 | 4 | 3 | 4 |
| UI/product polish | 2 | 5 | 3 | 3 | 4 |
| Developer extensibility | 4 | 3 | 5 | 4 | 4 |

## Hallow Yang Sudah Kuat

Readiness lokal terakhir:

```txt
Hallow foundation readiness: 100% (strong)
17/17 doctor checks passing
2 agents installed
4 skills installed
3 providers, 4 routes
93 memory items, 93 indexed
14 tasks, 3 schedules
22 traces with artifact links
0 pending approvals
console action API enabled
```

Kekuatan nyata Hallow saat ini:

- CLI-first runtime sudah ada untuk init, doctor, readiness, status, start, logs.
- Agent standard sudah ada lewat `agent verify` dan `agent install`.
- Skill standard sudah ada lewat `skill verify`, `skill install`, `skill test`, `skill reflect`, `skill improve`, `skill review`, `skill promote`, `skill rollback`, dan `skill confirm`.
- Memory vault sudah punya SQLite, JSONL mirror, Markdown summary, suggestions queue, approval/deny lifecycle, export, stats, dan local token-vector index.
- Autonomy loop sudah punya policy, tick, loop, stop flag, lock file, scheduler, task queue, retry, and trace evidence.
- Tool layer sudah policy-aware untuk read/write/fetch, approvals, audit log, dan untrusted web content handling.
- Model layer sudah multi-provider dengan routes dan health checks.
- Runtime console sudah punya API untuk actions, tasks, schedules, approvals, memory reviews, packages, models, traces, artifacts, notifications, and readiness.

Ini membuat Hallow lebih dari blueprint. Fondasinya sudah bisa diuji secara lokal.

## OpenHuman vs Hallow

OpenHuman menang di product feeling. Narasi mereka jelas: personal AI super intelligence yang private, simple, powerful. Mereka menekankan desktop-first onboarding, mascot/face, memory tree, Obsidian-compatible vault, many integrations, background sync, token compression, dan optional local AI.

Hallow belum bisa melawan OpenHuman di UI dan onboarding. Tapi Hallow punya potensi menang di sisi platform standard:

- Hallow punya agent package verifier, bukan hanya app personal.
- Hallow punya skill package verifier dan lifecycle improvement.
- Hallow punya readiness report sebagai bukti runtime.
- Hallow bisa diposisikan untuk developer yang ingin membuat agent lebih unggul, bukan hanya user yang ingin memakai personal AI.

Gap prioritas terhadap OpenHuman:

1. Desktop app atau local web console yang lebih bersih.
2. Browser/desktop observation adapter.
3. Memory tree visual dan Obsidian vault export yang lebih serius.
4. One-command onboarding yang tidak terasa developer-only.
5. Optional embedding/vector provider untuk memory recall yang lebih kuat.

## Hermes vs Hallow

Hermes menang telak di MCP dan ecosystem skill matang. Dokumentasi Hermes menunjukkan MCP bisa memakai stdio dan HTTP server, tool discovery otomatis, filtering per server, dynamic refresh, parallel tool calls, bahkan Hermes bisa expose diri sebagai MCP server.

Hermes juga kuat di skill system. Skill adalah knowledge document yang loaded on demand, punya progressive disclosure, slash command, external skill dirs, hub install, config settings, required environment variables, platform gating, dan media delivery behavior.

Hallow sudah punya konsep skill lifecycle yang lebih "belajar sendiri": test, stats, reflect, improve, review, promote, rollback, confirm. Ini bisa menjadi pembeda jika dibuat lebih matang.

Gap prioritas terhadap Hermes:

1. Tambahkan MCP client: load stdio/HTTP MCP servers dari `hallow.yaml`.
2. Tambahkan MCP tool filtering: include/exclude tools per server.
3. Tambahkan MCP capability refresh.
4. Tambahkan sandbox/process isolation untuk tool runtime.
5. Tambahkan skill progressive disclosure dan external skill dirs.
6. Tambahkan `hallow mcp serve` agar Hallow juga bisa dipakai agent lain.

## Aeon vs Hallow

Aeon paling dekat dengan impian "agent otonom tanpa babysitting". README Aeon menekankan schedule unattended, self-healing, output quality monitoring, persistent memory, reactive triggers, skill repair, dan self-improve.

Hallow sudah mulai masuk jalur yang sama:

- task queue
- schedule run-due
- autonomy policy
- autonomy tick
- autonomy loop
- skill tests
- skill metrics
- reflection
- improvement draft
- review
- promotion
- confirmation
- rollback

Namun Aeon lebih matang di "agent bekerja terus tanpa manusia". Hallow masih lebih foundational dan safety-first.

Gap prioritas terhadap Aeon:

1. Reactive triggers berbasis kondisi, bukan hanya cron/due.
2. Quality scoring per output dengan rolling history.
3. Skill repair otomatis jika gagal beberapa kali.
4. Cost/token tracking per task dan per skill.
5. Fleet atau multi-agent instances.
6. Notification strategy yang hanya mengganggu saat perlu.

## OpenClaw vs Hallow

OpenClaw saat ini lebih kuat sebagai assistant gateway multi-channel. README publik menekankan personal AI assistant yang berjalan di perangkat sendiri, menjawab di channel yang sudah dipakai user, mendukung suara di macOS/iOS/Android, live Canvas, dan banyak channel seperti WhatsApp, Telegram, Slack, Discord, Google Chat, Signal, iMessage, Teams, Matrix, WeChat, dan lainnya.

OpenClaw juga punya security docs yang serius: trust boundary, gateway auth, allowlists, pairing, DM/group policy, sandboxing guidance, security audit, credential storage map, and hardened baseline.

Hallow tidak perlu mengejar semua channel dulu. Hallow harus mengambil pelajaran utama:

- setiap channel harus punya policy boundary,
- setiap external input harus dianggap untrusted,
- setiap tool harus punya blast-radius limit,
- shared agent tidak boleh dianggap multi-tenant aman,
- agent runtime harus punya audit dan incident story.

Hallow sudah punya approval safety, audit log, package verification, and policy-gated actions. Tapi belum punya channel gateway luas.

Gap prioritas terhadap OpenClaw:

1. Channel adapter minimal: webhook/local inbox dulu.
2. Security audit command: `hallow security audit`.
3. Hardened baseline config generator.
4. Per-agent access profile.
5. Threat model docs.
6. Optional sandbox runner untuk risky tools.

## Apa Yang Fresh Dari Hallow

Fresh angle Hallow bukan "agent chat lagi". Yang fresh adalah:

```txt
Agent runtime yang bisa dipasang lokal,
punya standar agent dan skill,
punya memory vault milik user,
punya loop belajar dari trace,
dan bisa menjadi registry/marketplace untuk agent yang lulus standar.
```

Kalau dibuat benar, Hallow bisa menjadi "agent operating layer" lokal. Bukan sekadar aplikasi, bukan sekadar bot, bukan sekadar framework.

Narasi yang paling kuat:

```txt
Hallow is the local-first operating layer for autonomous agents.
Agents run on your machine, remember through your vault, improve through traces,
and ship as verified packages under one open standard.
```

Versi Indonesia:

```txt
Hallow adalah lapisan operasi lokal untuk agent otonom.
Agent hidup di mesin user, memory tetap milik user,
skill berkembang dari trace kerja, dan setiap agent bisa dipasang
sebagai package yang lolos standar Hallow.
```

## Roadmap Agar Hallow Layak Menantang Mereka

Prioritas 1: MCP dan tool ecosystem.

- `hallow mcp add`
- `hallow mcp list`
- `hallow mcp refresh`
- stdio/HTTP transport
- include/exclude tool policy
- per-server timeout and rate limits
- MCP tools masuk ke existing approval/policy layer

Prioritas 2: Autonomous quality loop.

- quality score per task
- rolling 30-run skill history
- degradation flags
- reactive trigger engine
- auto-repair draft saat skill gagal
- cost/token logging

Prioritas 3: Browser/desktop observation.

- browser adapter behind policy
- screenshot/read-only mode
- page extraction as untrusted data
- action approval for clicks/forms
- per-agent browsing profile

Prioritas 4: Security hardening.

- `hallow security audit`
- hardened config template
- per-agent access profile
- sandbox runner for risky tools
- secret redaction in traces/logs
- package signature metadata

Prioritas 5: Product surface.

- clean local console home
- memory tree viewer
- trace replay
- skill marketplace screen
- model health/settings
- one-command install/onboarding

## Strategic Conclusion

Hallow harus mengambil posisi ini:

- Dari OpenHuman: ambil local memory, simple onboarding, personal ownership.
- Dari Hermes: ambil MCP, skill ecosystem, process/tool isolation, messaging bridge ideas.
- Dari Aeon: ambil unattended scheduler, quality scoring, self-healing, reactive triggers.
- Dari OpenClaw: ambil channel gateway discipline, allowlists, pairing, threat model, security audit.

Tapi Hallow harus berbeda:

```txt
Hallow bukan cuma personal AI.
Hallow adalah standard runtime untuk agent lokal yang bisa belajar, dipaketkan,
diverifikasi, dipasang, dan dijalankan otonom dengan memory milik user.
```

Kalau roadmap di atas selesai, Hallow akan punya posisi yang cukup unik untuk dibandingkan secara publik:

```txt
OpenHuman feels like a personal AI app.
Hermes feels like a powerful local agent framework.
Aeon feels like autonomous scheduled work.
OpenClaw feels like a multi-channel assistant gateway.
Hallow should feel like the local operating layer where autonomous agents live.
```
