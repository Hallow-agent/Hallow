#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${HALLOW_REPO_URL:-https://github.com/Hallow-agent/Hallow.git}"
BRANCH="${HALLOW_BRANCH:-main}"
INSTALL_ROOT="${HALLOW_INSTALL_ROOT:-$HOME/.local/share/hallow}"
HALLOW_HOME_DIR="${HALLOW_HOME:-$HOME/.hallow}"
BIN_DIR="${HALLOW_BIN_DIR:-$HOME/.local/bin}"
SKIP_BUILD="${HALLOW_SKIP_BUILD:-0}"
SKIP_SETUP="${HALLOW_SKIP_SETUP:-0}"
NO_START="${HALLOW_NO_START:-0}"
NO_OPEN="${HALLOW_NO_OPEN:-0}"
NO_PATH="${HALLOW_NO_PATH:-0}"
VERIFY_ONLY=0
DRY_RUN=0
PHASE=0
START_SECONDS=$SECONDS
LOG_PATH=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --branch) BRANCH="${2:?--branch requires a value}"; shift 2 ;;
    --install-root) INSTALL_ROOT="${2:?--install-root requires a value}"; shift 2 ;;
    --home) HALLOW_HOME_DIR="${2:?--home requires a value}"; shift 2 ;;
    --skip-build) SKIP_BUILD=1; shift ;;
    --skip-setup) SKIP_SETUP=1; shift ;;
    --no-start) NO_START=1; shift ;;
    --no-open) NO_OPEN=1; shift ;;
    --no-path) NO_PATH=1; shift ;;
    --verify) VERIFY_ONLY=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help)
      printf '%s\n' "Hallow installer" "  --branch REF  --install-root PATH  --home PATH" "  --skip-build  --skip-setup  --no-start  --no-open  --no-path" "  --verify  --dry-run"
      exit 0 ;;
    *) printf 'error: unknown option %s\n' "$1" >&2; exit 2 ;;
  esac
done

banner() {
  printf '\n\033[97m  H   H   AAAAA   L       L        OOOOO   W       W\033[0m\n'
  printf '\033[97m  H   H   A   A   L       L       O     O  W   W   W\033[0m\n'
  printf '\033[97m  HHHHH   AAAAA   L       L       O     O  W  WWW  W\033[0m\n'
  printf '\033[90m  H   H   A   A   L       L       O     O   WW   WW\033[0m\n'
  printf '\033[90m  H   H   A   A   LLLLL   LLLLL    OOOOO     W W\033[0m\n\n'
  printf '\033[36m  AGENT OS 001\033[0m\033[90m  /  PRIVATE RUNTIME INSTALLER\033[0m\n'
  printf '\033[90m  -----------------------------------------------------\033[0m\n'
}

phase() {
  PHASE=$((PHASE + 1))
  printf '\n\033[90m  [%02d/08]\033[0m \033[36m%s\033[0m\n' "$PHASE" "$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')"
  [ -z "${2:-}" ] || printf '\033[90m          %s\033[0m\n' "$2"
}
ok() { printf '\033[32m          OK  \033[0m%s\n' "$1"; }
note() { printf '\033[90m          - %s\033[0m\n' "$1"; }
fail() {
  printf '\n\033[31m  INSTALLATION STOPPED\033[0m\n\033[31m  %s\033[0m\n' "$1" >&2
  [ -z "$LOG_PATH" ] || printf '\033[33m  Full log: %s\033[0m\n' "$LOG_PATH" >&2
  exit 1
}
has_cmd() { command -v "$1" >/dev/null 2>&1; }
download() {
  if has_cmd curl; then curl -fsSL --retry 3 "$1" -o "$2"
  elif has_cmd wget; then wget -q "$1" -O "$2"
  else fail "curl or wget is required to download Hallow."
  fi
}
run_quiet() {
  local label="$1"; shift
  if [ "$DRY_RUN" = "1" ]; then note "DRY RUN  $*"; return; fi
  printf '\n> %s\n' "$*" >> "$LOG_PATH"
  if ! "$@" >> "$LOG_PATH" 2>&1; then
    tail -n 14 "$LOG_PATH" >&2 || true
    fail "$label failed. See the log above."
  fi
}
node_major() {
  if has_cmd node; then node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || printf '0'
  else printf '0'
  fi
}

install_local_node() {
  local version="22.17.0" platform arch archive base expected actual
  case "$(uname -s)" in Linux) platform="linux" ;; Darwin) platform="darwin" ;; *) fail "Install Node.js 22+ and rerun." ;; esac
  case "$(uname -m)" in x86_64|amd64) arch="x64" ;; arm64|aarch64) arch="arm64" ;; *) fail "Unsupported CPU architecture." ;; esac
  archive="node-v${version}-${platform}-${arch}.tar.xz"
  base="https://nodejs.org/dist/v${version}"
  mkdir -p "$INSTALL_ROOT/runtime"
  note "Installing checksum-verified Node.js v$version locally"
  download "$base/$archive" "$INSTALL_ROOT/runtime/$archive"
  download "$base/SHASUMS256.txt" "$INSTALL_ROOT/runtime/SHASUMS256.txt"
  expected="$(awk -v file="$archive" '$2 == file { print $1 }' "$INSTALL_ROOT/runtime/SHASUMS256.txt")"
  if has_cmd sha256sum; then actual="$(sha256sum "$INSTALL_ROOT/runtime/$archive" | awk '{print $1}')"
  elif has_cmd shasum; then actual="$(shasum -a 256 "$INSTALL_ROOT/runtime/$archive" | awk '{print $1}')"
  else fail "sha256sum or shasum is required."
  fi
  [ -n "$expected" ] && [ "$actual" = "$expected" ] || fail "Node.js checksum verification failed."
  rm -rf "$INSTALL_ROOT/runtime/node.next"
  mkdir -p "$INSTALL_ROOT/runtime/node.next"
  tar -xJf "$INSTALL_ROOT/runtime/$archive" -C "$INSTALL_ROOT/runtime/node.next" --strip-components=1
  rm -rf "$INSTALL_ROOT/runtime/node"
  mv "$INSTALL_ROOT/runtime/node.next" "$INSTALL_ROOT/runtime/node"
  rm -f "$INSTALL_ROOT/runtime/$archive" "$INSTALL_ROOT/runtime/SHASUMS256.txt"
  export PATH="$INSTALL_ROOT/runtime/node/bin:$PATH"
}

find_hallow_project() {
  local root="$1" candidate
  has_cmd node || return 1
  for candidate in "$root" "$root/Hallow" "$root/hallow"; do
    if [ -f "$candidate/package.json" ] && [ -f "$candidate/pnpm-workspace.yaml" ] &&
      node -e "const p=require(process.argv[1]);process.exit(p.name==='hallow'?0:1)" "$candidate/package.json"; then
      (cd "$candidate" && pwd); return
    fi
  done
  return 1
}

write_launchers() {
  local cli_path="$1/packages/cli/dist/index.js"
  mkdir -p "$BIN_DIR"
  cat > "$BIN_DIR/hallow" <<EOF
#!/usr/bin/env bash
set -euo pipefail
export PATH="$INSTALL_ROOT/runtime/node/bin:$INSTALL_ROOT/runtime/npm/bin:\$PATH"
if [ -z "\${HALLOW_HOME:-}" ]; then export HALLOW_HOME="$HALLOW_HOME_DIR"; fi
if [ "\${1:-}" = "update" ]; then
  if command -v curl >/dev/null 2>&1; then exec bash -c 'curl -fsSL https://hallow-agent.xyz/install.sh | bash';
  else exec bash -c 'wget -qO- https://hallow-agent.xyz/install.sh | bash'; fi
fi
if [ "\${1:-}" = "uninstall" ]; then exec "$INSTALL_ROOT/uninstall.sh"; fi
exec node "$cli_path" "\$@"
EOF
  chmod +x "$BIN_DIR/hallow"
  cat > "$INSTALL_ROOT/uninstall.sh" <<EOF
#!/usr/bin/env bash
set -euo pipefail
"$BIN_DIR/hallow" stop >/dev/null 2>&1 || true
printf 'Removing Hallow application files. Runtime data remains at %s\n' "$HALLOW_HOME_DIR"
rm -f "$BIN_DIR/hallow"
rm -rf "$INSTALL_ROOT"
EOF
  chmod +x "$INSTALL_ROOT/uninstall.sh"
}

ensure_path() {
  case ":$PATH:" in *":$BIN_DIR:"*) return ;; esac
  export PATH="$BIN_DIR:$PATH"
  [ "$NO_PATH" = "1" ] && return
  local profile="$HOME/.profile"
  case "${SHELL:-}" in *zsh) profile="$HOME/.zprofile" ;; esac
  touch "$profile"
  grep -Fq '# Hallow Agent OS' "$profile" || printf '\nexport PATH="%s:$PATH" # Hallow Agent OS\n' "$BIN_DIR" >> "$profile"
}

banner
case "$INSTALL_ROOT" in /|"") fail "Unsafe install root: $INSTALL_ROOT" ;; esac
case "$HALLOW_HOME_DIR" in /|"") fail "Unsafe Hallow home: $HALLOW_HOME_DIR" ;; esac
if [ "$DRY_RUN" = "1" ]; then
  printf '\033[33m  DRY RUN - no files or environment settings will be changed.\033[0m\n'
  note "Source:  $REPO_URL#$BRANCH"; note "Install: $INSTALL_ROOT"; note "Home: $HALLOW_HOME_DIR"
else
  mkdir -p "$INSTALL_ROOT/logs"
  LOG_PATH="$INSTALL_ROOT/logs/install-$(date +%Y%m%d-%H%M%S).log"
  printf 'Hallow installer log\nStarted: %s\n' "$(date -u +%FT%TZ)" > "$LOG_PATH"
fi

phase "Preflight" "Operating system, paths, and install mode"
ok "Install root verified"

phase "Runtime" "Node.js 22+ and pnpm 10.11"
if [ "$(node_major)" -lt 22 ]; then
  if [ "$DRY_RUN" = "1" ]; then note "Would install a verified local Node.js 22 runtime"; else install_local_node; fi
fi
if [ "$DRY_RUN" != "1" ]; then
  [ "$(node_major)" -ge 22 ] || fail "Hallow requires Node.js 22+."
  export NPM_CONFIG_PREFIX="$INSTALL_ROOT/runtime/npm"
  export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"
  has_cmd pnpm || run_quiet "pnpm installation" npm install --global pnpm@10.11.0
  ok "Node $(node --version) / pnpm $(pnpm --version)"
else ok "Runtime plan validated"
fi

phase "Source" "$([ "$VERIFY_ONLY" = "1" ] && printf 'Using the installed build' || printf 'Staged update from %s' "$BRANCH")"
SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"; fi
SOURCE_DIR="$INSTALL_ROOT/source"
PROJECT_DIR=""
STAGED_ROOT=""
STAGE_DIR=""
if [ -n "$SCRIPT_DIR" ] && [ "$VERIFY_ONLY" != "1" ]; then PROJECT_DIR="$(find_hallow_project "$(cd "$SCRIPT_DIR/.." && pwd)" || true)"; fi
if [ -n "$PROJECT_DIR" ]; then ok "Local checkout selected: $PROJECT_DIR"
elif [ "$VERIFY_ONLY" = "1" ]; then
  PROJECT_DIR="$(find_hallow_project "$SOURCE_DIR" || true)"
  [ -n "$PROJECT_DIR" ] || fail "No installed Hallow build found."
  ok "Installed source found"
elif [ "$DRY_RUN" = "1" ]; then PROJECT_DIR="$SOURCE_DIR"; ok "Source staging plan validated"
else
  case "$REPO_URL" in
    https://github.com/*.git) repo_path="${REPO_URL#https://github.com/}"; repo_path="${repo_path%.git}" ;;
    https://github.com/*) repo_path="${REPO_URL#https://github.com/}" ;;
    *) fail "The installer currently supports GitHub repository URLs." ;;
  esac
  STAGE_DIR="$INSTALL_ROOT/stage-$$"
  mkdir -p "$STAGE_DIR/unpacked"
  note "Downloading $REPO_URL#$BRANCH"
  download "https://codeload.github.com/$repo_path/tar.gz/refs/heads/$BRANCH" "$STAGE_DIR/hallow.tar.gz"
  tar -xzf "$STAGE_DIR/hallow.tar.gz" -C "$STAGE_DIR/unpacked"
  STAGED_ROOT="$(find "$STAGE_DIR/unpacked" -mindepth 1 -maxdepth 1 -type d | head -n 1)"
  PROJECT_DIR="$(find_hallow_project "$STAGED_ROOT" || true)"
  [ -n "$PROJECT_DIR" ] || fail "Downloaded archive does not contain Hallow."
  ok "Source downloaded and inspected"
fi

phase "Dependencies" "Locked, reproducible workspace install"
if [ "$VERIFY_ONLY" != "1" ] && [ "$DRY_RUN" != "1" ]; then (cd "$PROJECT_DIR" && run_quiet "Dependency installation" pnpm install --frozen-lockfile --prefer-offline); fi
ok "$([ "$VERIFY_ONLY" = "1" ] && printf 'Existing dependency set retained' || printf 'Dependencies ready')"

phase "Build" "Core, models, runtime, and CLI"
if [ "$VERIFY_ONLY" != "1" ] && [ "$SKIP_BUILD" != "1" ] && [ "$DRY_RUN" != "1" ]; then (cd "$PROJECT_DIR" && run_quiet "Hallow build" pnpm build); fi
if [ "$DRY_RUN" != "1" ]; then [ -f "$PROJECT_DIR/packages/cli/dist/index.js" ] || fail "CLI build artifact is missing."; fi
ok "$([ "$SKIP_BUILD" = "1" ] && printf 'Existing build selected' || printf 'Build verified')"

if [ -n "$STAGED_ROOT" ] && [ "$DRY_RUN" != "1" ]; then
  relative_project="${PROJECT_DIR#"$STAGED_ROOT"}"
  rm -rf "$INSTALL_ROOT/source.next" "$INSTALL_ROOT/source.previous"
  mv "$STAGED_ROOT" "$INSTALL_ROOT/source.next"
  [ ! -e "$SOURCE_DIR" ] || mv "$SOURCE_DIR" "$INSTALL_ROOT/source.previous"
  mv "$INSTALL_ROOT/source.next" "$SOURCE_DIR"
  PROJECT_DIR="$SOURCE_DIR$relative_project"
  rm -rf "$STAGE_DIR"
fi

phase "Workspace" "Private state and local desktop shell"
if [ "$SKIP_SETUP" != "1" ] && [ "$DRY_RUN" != "1" ]; then
  run_quiet "Hallow initialization" node "$PROJECT_DIR/packages/cli/dist/index.js" --home "$HALLOW_HOME_DIR" init
  run_quiet "Desktop setup" node "$PROJECT_DIR/packages/cli/dist/index.js" --home "$HALLOW_HOME_DIR" desktop setup
  run_quiet "Hallow doctor" node "$PROJECT_DIR/packages/cli/dist/index.js" --home "$HALLOW_HOME_DIR" doctor
fi
ok "$([ "$SKIP_SETUP" = "1" ] && printf 'Setup skipped by request' || printf 'Runtime home initialized and checked')"

phase "Command" "Global launcher, update, and uninstall"
if [ "$DRY_RUN" != "1" ]; then write_launchers "$PROJECT_DIR"; ensure_path; fi
ok "hallow command ready"

phase "Launch" "Managed background runtime"
if [ "$NO_START" != "1" ] && [ "$SKIP_SETUP" != "1" ] && [ "${HALLOW_INSTALL_NO_LAUNCH:-0}" != "1" ] && [ "$DRY_RUN" != "1" ]; then
  "$BIN_DIR/hallow" start --quiet
  if [ "$NO_OPEN" != "1" ]; then "$BIN_DIR/hallow" open || true; fi
  ok "Runtime online"
else ok "Launch skipped; run hallow open when ready"
fi

printf '\n\033[32m  +----------------------------------------------------+\033[0m\n'
printf '\033[32m  |  HALLOW IS READY                                   |\033[0m\n'
printf '\033[90m  +----------------------------------------------------+\033[0m\n'
printf '  |  hallow          operator terminal                 |\n'
printf '  |  hallow open     start + open desktop              |\n'
printf '  |  hallow doctor   verify the local runtime          |\n'
printf '  |  hallow update   upgrade safely                    |\n'
printf '\033[32m  +----------------------------------------------------+\033[0m\n\n'
printf '  Workspace  Run: hallow open\n'
printf '\033[90m  Home     %s\033[0m\n' "$HALLOW_HOME_DIR"
[ -z "$LOG_PATH" ] || printf '\033[90m  Log      %s\033[0m\n' "$LOG_PATH"
printf '\033[90m  Done in  %ss\033[0m\n\n' "$((SECONDS - START_SECONDS))"
