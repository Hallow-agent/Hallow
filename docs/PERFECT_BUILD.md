# Hallow Perfect Build Track

Tanggal: 2026-05-20

Status: setelah demo mode 100%, perfect build dilanjutkan dengan capability produksi yang bisa dicek melalui CLI:
MCP stdio/HTTP server, HTTP MCP client probe/call, marketplace registry service, OAuth connector/token vault, web-login browser profile auth, real gateway adapter outbox, gateway pairing token, Docker/WSL/Node-permission sandbox backend support, Chrome DevTools browser session auto-launch, sandbox runner lokal, embedding/vector provider layer, skill hub/external skill sources, self-healing autonomy loop, clean desktop onboarding shell, dan perfect-build progress meter.

## Progress Command

```bash
corepack pnpm hallow --home .hallow-dev perfect checklist --write
```

Command ini menghitung persentase "perfect build" dari kondisi runtime lokal:

- `[x]` berarti sudah ada implementasi/artifact yang bisa dicek.
- `[ ]` berarti masih gap produksi yang harus dibangun.
- Output Markdown ditulis ke `.hallow-dev/perfect/STATUS.md`.

## Shipped In This Slice

- `hallow mcp serve`
  - Hallow expose diri sebagai MCP stdio server.
  - Tools yang diexpose:
    - `hallow_readiness`
    - `hallow_perfect_build_status`
    - `hallow_embedding_status`
    - `hallow_memory_search`
    - `hallow_security_audit`
    - `hallow_browser_observe`
    - `hallow_web_auth_status`
    - `hallow_sandbox_smoke`

- `POST /api/mcp`
  - Hallow expose diri sebagai MCP HTTP JSON-RPC endpoint dari local API.
  - Mendukung `initialize`, `tools/list`, dan `tools/call`.
  - Bisa diprobe melalui `hallow mcp probe <http-server>`.

- `hallow mcp add <name> --url http://.../api/mcp`
  - Mendaftarkan MCP HTTP server.
  - `hallow mcp probe` dan `hallow mcp call` sekarang mendukung transport `http` dan `stdio`.

- `hallow marketplace export`
  - Mengekspor signed marketplace index menjadi registry bundle JSON.
  - Output default: `.hallow-dev/marketplace/registry.json`.
  - Bundle berisi package key, digest, source path, claims, dan command install/verify.

- `hallow marketplace sign`
  - Membuat digest package dan Ed25519 signature.
  - Local signing keypair disimpan di `.hallow-dev/marketplace/keys/`.
  - `hallow marketplace verify` mengecek digest dan public-key signature.

- `hallow marketplace search "query"`
  - Search signed package berdasarkan id, type, claims, digest, dan source path.

- `hallow marketplace install <agent:id|skill:id>`
  - Install package dari signed marketplace index setelah signature diverifikasi ulang.

- Marketplace API
  - `GET /api/marketplace/registry`
  - `GET /api/marketplace/search?q=...`
  - `POST /api/marketplace/install`

- MCP marketplace tool
  - `hallow_marketplace_search`

- `hallow skill source add <id> --path ...`
  - Menambahkan external skill directory ala Hermes.
  - Source bisa diberi trust `local`, `signed`, atau `untrusted`.
  - Registry lokal: `.hallow-dev/skills/sources.yaml`.

- `hallow skill hub`
  - Mengindeks semua skill package dari external skill sources.
  - Output cache: `.hallow-dev/skills/HUB.yaml`.
  - Menandai package yang sudah terinstall dan yang masih available.

- `hallow skill install-hub <skill-id>`
  - Install package dari indexed skill hub melalui verifier Hallow yang sama dengan marketplace install.

- `hallow integration oauth status`
  - Mengecek standard OAuth connector pack dan local token vault.
  - Standard connector: GitHub, Google, Slack, Notion, Microsoft.

- `hallow integration oauth auth <connector>`
  - Membuat PKCE/state grant dan auth URL untuk connector.
  - Callback default: `http://127.0.0.1:4767/api/integrations/oauth/callback`.

- `hallow integration oauth callback --state ... --code ...`
  - Capture authorization code ke vault lokal tanpa menampilkan token.

- `hallow integration oauth store-token <connector> --access-token ...`
  - Menyimpan token lokal untuk test/connector runtime.
  - CLI output selalu meredaksi token.

- OAuth API
  - `GET /api/integrations/oauth/status`
  - `GET /api/integrations/oauth/connectors`
  - `POST /api/integrations/oauth/auth`
  - `GET /api/integrations/oauth/callback`

- `hallow integration autofetch run --url ...`
  - Fetch sumber web ke memory lokal memakai policy `web.fetch`.
  - Cocok untuk watched sources/OpenHuman-style auto-ingest tanpa memindahkan vault ke backend cloud.

- `hallow integration autofetch add <id> --url ...`
  - Membuat schedule lokal `autofetch-<id>` untuk source watcher berkala.

- MCP OAuth tool
  - `hallow_oauth_status`

- `hallow web-auth status`
  - Mengecek provider login web berbasis dedicated local browser profile.
  - Standard provider: ChatGPT, Claude, Gemini, Perplexity, Poe, Microsoft Copilot, dan NotebookLM.
  - Policy default menolak cookie export, token extraction, dan password capture.

- `hallow web-auth login <provider>`
  - Membuka Chrome/Edge terlihat dengan user-data-dir khusus provider.
  - User login manual di browser itu; Hallow hanya menyimpan path profile dan audit artifact.
  - Tidak ada credential prompt, tidak ada cookie dump, tidak ada localStorage/token export.
  - Jika CDP port sudah dipakai browser lain, Hallow menolak attach kecuali user memakai `--attach-existing`.
  - Active ownership lock disimpan di `.hallow-dev/integrations/web-auth/active/*.yaml`.

- `hallow web-auth open <provider>`
  - Membuka ulang session web provider memakai profile lokal yang sama.
  - Cocok untuk pola Hermes/OpenClaw: browser lokal/CDP, profile isolation, manual login.

- `hallow web-auth configure <provider>`
  - Menambah/mengubah provider custom dengan login URL, home URL, allowed origins, profile path, dan CDP port.

- Web auth API
  - `GET /api/web-auth/status`
  - `GET /api/web-auth/providers`
  - `POST /api/web-auth/login`
  - `POST /api/web-auth/open`
  - `POST /api/web-auth/configure`
  - State-changing local API request memakai Host/Origin guard dan `X-Hallow-Token` shared secret.

- `hallow security api-token status`
  - Mengecek shared-secret local API tanpa menampilkan token asli.
  - Output hanya menampilkan digest pendek, path token lokal, header yang dipakai, dan status bearer support.

- `hallow security api-token rotate`
  - Merotasi shared-secret local API.
  - State-changing request berikutnya harus memakai token baru via `X-Hallow-Token` atau `Authorization: Bearer`.

- MCP web-auth tool
  - `hallow_web_auth_status`

- `hallow gateway adapters`
  - Menampilkan adapter status untuk Telegram, Slack, Discord, WhatsApp, Teams, email webhook, dan generic web webhook.
  - Mengecek env token/webhook yang dibutuhkan tanpa menampilkan secret.

- `hallow gateway send --channel ... --to ... --text ...`
  - Mengirim outbound message lewat adapter channel jika env provider sudah diset dan policy mengizinkan.
  - `--dry-run` membuat proof artifact tanpa external send.
  - Outbox disimpan di `.hallow-dev/gateway/outbox.yaml` dan `.hallow-dev/gateway/outbound/*.yaml`.

- `hallow gateway pair <channel> --from ...`
  - Membuat one-time pairing token untuk node/device/channel.
  - Token asli hanya muncul saat create; file pairings menyimpan hash dan digest.
  - Event yang datang dengan `--pairing-token` akan mengaktifkan sender ke allowlist channel.

- Gateway send API
  - `GET /api/gateway/adapters`
  - `GET /api/gateway/outbox`
  - `GET/POST /api/gateway/pairings`
  - `POST /api/gateway/send`

- `hallow sandbox enable-local`
  - Mengaktifkan local sandbox backend secara eksplisit.
  - Tetap memakai workspace cwd, timeout, denylist command destruktif, audit, dan artifact.

- `hallow sandbox enable-docker`
  - Mengaktifkan backend Docker untuk command sandbox.
  - Runner memakai `docker run --rm`, mount workspace ke `/workspace`, memory limit, CPU limit, dan network mode berdasarkan policy.
  - Perfect checklist hanya mencentang hard sandbox setelah ada artifact Docker dengan `status: success`.

- `hallow sandbox enable-wsl`
  - Mengaktifkan backend WSL2 untuk isolasi proses berbasis VM lokal.
  - Smoke test memakai `uname -a` di WSL dan menyimpan artifact `backend: wsl`.

- `hallow sandbox enable-node-permission`
  - Mengaktifkan backend Node permission untuk agent Node/TypeScript.
  - Runner memakai `node --permission` dengan akses file dibatasi ke workspace dan child process ditolak.

- `hallow sandbox status`
  - Menampilkan backend aktif, workspace-only, network policy, process isolation, dan timeout.

- `hallow sandbox smoke`
  - Smoke test sandbox sesuai backend aktif: Node untuk local/Docker, `uname -a` untuk WSL, dan permission denial proof untuk Node-permission.
  - Output disimpan ke `sandbox/runs/*.yaml`.

- `hallow sandbox run <command> -- [args...]`
  - Menjalankan command tanpa shell.
  - CWD dikurung ke Hallow workspace.
  - Command destruktif seperti `rm`, `del`, `format`, `shutdown`, `diskpart` diblokir.

- `hallow embedding status`
  - Menampilkan provider embedding aktif.
  - Default local-first memakai `local_token_cosine_v1`.
  - Bisa ditambah provider `openai_compatible` atau `ollama`.

- `hallow embedding configure <name>`
  - Menyiapkan provider embedding eksternal tanpa memindahkan memory vault ke backend cloud.
  - Contoh: `hallow embedding configure openai --type openai_compatible --api-key-env OPENAI_API_KEY --default`.

- `hallow embedding index`
  - Rebuild vector index memory lokal dan mengecek status embedding layer.

- `hallow model install-catalog`
  - Menginstal model provider preset dan route standar yang lebih luas.
  - Provider preset: OpenAI, Anthropic, Google Gemini, OpenRouter, Groq, Mistral, DeepSeek, xAI, Together, Fireworks, Perplexity, Ollama, LM Studio, vLLM, dan llama.cpp.
  - Catalog saat ini berisi puluhan model lintas frontier, coding, reasoning, murah, cepat, aggregator, dan lokal.

- `hallow model catalog`
  - Menampilkan model preset berdasarkan provider atau query.
  - Contoh: `hallow model catalog --query coding` menampilkan GPT Codex, Claude Sonnet, Codestral, Qwen Coder, dan model coding aggregator.

- `hallow usage report`
  - Menampilkan ledger token/cost estimate per provider/model.
  - Ledger lokal disimpan di `.hallow-dev/usage/ledger.jsonl`.
  - Setiap `hallow agent run` mencatat trace id, task id, provider/model, token estimate, duration, status, dan cost estimate berbasis static provider price profile.

- `hallow usage list`
  - Menampilkan event ledger terbaru untuk audit biaya agent otonomus.

- `hallow autonomy heal`
  - Menjalankan repeated self-healing loop sampai quality report sehat atau `--max-rounds` habis.
  - Tiap round memanggil autonomy tick khusus skill repair/test/review/promotion tanpa schedule/task umum.
  - Report ditulis ke `.hallow-dev/autonomy/HEAL.yaml` dan `.hallow-dev/autonomy/heals/*.yaml`.

- `hallow browser launch-command`
  - Mencetak command untuk membuka Chrome dengan remote debugging.
  - Default port: `9222`.

- `hallow browser session --url ... --cdp http://127.0.0.1:9222`
  - Connect ke Chrome DevTools Protocol tanpa dependency Playwright.
  - Membuka tab via `/json/new`, navigasi URL, membaca `document.title`, mengambil HTML, dan mencoba screenshot PNG.
  - Artifact disimpan di `.hallow-dev/observations/browser/sessions`.
  - Perfect checklist baru akan centang setelah artifact live CDP benar-benar dibuat.

- `hallow browser session --url ... --launch`
  - Auto-launch Chrome/Edge headless dengan remote debugging port dan profile per-port.
  - Membuat artifact CDP live tanpa skrip PowerShell manual.

- `hallow perfect checklist`
  - Menghitung progres perfect build dengan weighted checklist.
  - Memisahkan demo-ready dari production-perfect supaya klaim tetap jujur.

- `hallow desktop setup`
  - Membuat `.hallow-dev/desktop/manifest.json`, `.hallow-dev/desktop/index.html`, `.hallow-dev/desktop/onboarding.yaml`, dan launcher `hallow-desktop.cmd`/`hallow-desktop.sh`.
  - Shell desktop bersih menampilkan readiness, vault, MCP, marketplace, OAuth, gateway, sandbox, security, dan start URL lokal.
  - Local API juga menyediakan `GET /desktop`, `GET /api/desktop/status`, dan `POST /api/desktop/setup`.

- `hallow desktop status`
  - Mengecek artifact desktop, launcher, dan onboarding steps.
  - Perfect checklist mencentang `desktop_onboarding` hanya jika artifact dan step status lengkap.

- Hermes-style installer
  - `scripts/install.ps1` untuk Windows PowerShell.
  - `scripts/install.sh` untuk Linux, macOS, WSL2, dan Termux.
  - Installer clone/update repo, enable Corepack/pnpm, install dependencies, build, init Hallow home, setup desktop shell, dan tulis launcher global `hallow`.
  - Ini belum native `.exe` self-contained; ini installer runtime seperti pola Hermes.

## Verified

```bash
corepack pnpm typecheck
corepack pnpm build
corepack pnpm hallow --home .hallow-dev sandbox enable-local
corepack pnpm hallow --home .hallow-dev sandbox status
corepack pnpm hallow --home .hallow-dev sandbox smoke
corepack pnpm hallow --home .hallow-dev sandbox run node -- --version
corepack pnpm hallow --home .hallow-dev embedding status
corepack pnpm hallow --home .hallow-dev mcp add hallow-http --url http://127.0.0.1:4777/api/mcp --include hallow_readiness,hallow_perfect_build_status,hallow_embedding_status,hallow_memory_search
corepack pnpm hallow --home .hallow-dev mcp probe hallow-http
corepack pnpm hallow --home .hallow-dev mcp call hallow-http hallow_embedding_status
corepack pnpm hallow --home .hallow-dev marketplace export
corepack pnpm hallow --home .hallow-dev marketplace search research
corepack pnpm hallow --home .hallow-dev integration oauth status
corepack pnpm hallow --home .hallow-dev integration oauth auth github --scope read:user
corepack pnpm hallow --home .hallow-dev web-auth status
corepack pnpm hallow --home .hallow-dev web-auth providers
corepack pnpm hallow --home .hallow-dev web-auth policy
corepack pnpm hallow --home .hallow-dev gateway adapters
corepack pnpm hallow --home .hallow-dev gateway enable slack
corepack pnpm hallow --home .hallow-dev gateway send --channel slack --to demo-channel --text "Hallow gateway adapter dry-run proof" --dry-run
corepack pnpm hallow --home .hallow-dev model install-catalog --overwrite
corepack pnpm hallow --home .hallow-dev model catalog --query coding
corepack pnpm hallow --home .hallow-dev model health
corepack pnpm hallow --home .hallow-dev browser launch-command --port 9222
corepack pnpm hallow --home .hallow-dev browser session --url https://example.com --launch --port 9224 --wait-ms 1000
corepack pnpm hallow --home .hallow-dev sandbox enable-wsl
corepack pnpm hallow --home .hallow-dev sandbox smoke
corepack pnpm hallow --home .hallow-dev desktop setup
corepack pnpm hallow --home .hallow-dev desktop status
corepack pnpm hallow --home .hallow-dev perfect checklist --write
corepack pnpm hallow --home .hallow-dev security audit
```

Optional live CDP verification, after Chrome is started with the launch command:

```bash
corepack pnpm hallow --home .hallow-dev browser session --url https://example.com --cdp http://127.0.0.1:9222
```

Auto-launch CDP verification:

```bash
corepack pnpm hallow --home .hallow-dev browser session --url https://example.com --launch --port 9224 --wait-ms 1000
```

Manual web-login verification:

```bash
corepack pnpm hallow --home .hallow-dev web-auth login chatgpt
corepack pnpm hallow --home .hallow-dev web-auth open chatgpt
```

Catatan: command ini sengaja membuka browser lokal dan menunggu user login manual. Hallow tidak mengambil cookie/token dari browser.
Gunakan `--attach-existing` hanya jika kamu memang sadar sedang menghubungkan Hallow ke CDP browser yang sudah hidup.

Optional Docker hard-sandbox verification, after Docker is installed and running:

```bash
corepack pnpm hallow --home .hallow-dev sandbox enable-docker
corepack pnpm hallow --home .hallow-dev sandbox smoke
```

Optional Node permission sandbox verification:

```bash
corepack pnpm hallow --home .hallow-dev sandbox enable-node-permission
corepack pnpm hallow --home .hallow-dev sandbox smoke
```

MCP server smoke:

```bash
node packages/cli/dist/index.js --home .hallow-dev mcp serve
```

Input JSON-RPC:

```json
{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}
{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}
```

Expected:

```txt
serverInfo.name = hallow
tools include hallow_readiness, hallow_memory_search, hallow_security_audit,
hallow_browser_observe, hallow_marketplace_search, hallow_oauth_status,
hallow_web_auth_status, hallow_sandbox_smoke
```

## Still Needed Beyond Local Perfect

- Provider-specific API adapters using stored OAuth tokens.
- Provider-specific safe web UI adapters on top of the manual browser profiles.
- Live provider credentials for Telegram/Discord/WhatsApp/Slack/Teams production sends.
- External embedding live provider tests.
- Public hosted registry persistence and remote package distribution.
- Native packaged installer beyond generated local launcher scripts.
