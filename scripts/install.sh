#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${HALLOW_REPO_URL:-https://github.com/Hallow-agent/Hallow.git}"
BRANCH="${HALLOW_BRANCH:-main}"
PROJECT_SUBDIR="${HALLOW_PROJECT_SUBDIR:-}"
INSTALL_ROOT="${HALLOW_INSTALL_ROOT:-$HOME/.local/share/hallow}"
HALLOW_HOME_DIR="${HALLOW_HOME:-$HOME/.hallow}"
SKIP_BUILD="${HALLOW_SKIP_BUILD:-0}"
SKIP_SETUP="${HALLOW_SKIP_SETUP:-0}"

log() {
  printf '\033[36m==> %s\033[0m\n' "$1"
}

fail() {
  printf '\033[31merror: %s\033[0m\n' "$1" >&2
  exit 1
}

has_cmd() {
  command -v "$1" >/dev/null 2>&1
}

ensure_node() {
  if ! has_cmd node; then
    if [ "${PREFIX:-}" != "" ] && has_cmd pkg; then
      log "Installing Node.js and git with Termux pkg"
      pkg install -y nodejs git
    elif has_cmd brew; then
      log "Installing Node.js and git with Homebrew"
      brew install node git
    else
      case "$(uname -s 2>/dev/null || printf unknown)" in
        MINGW*|MSYS*|CYGWIN*)
          fail "Node.js 22+ is required inside this Bash environment. On Windows, run: powershell -ExecutionPolicy Bypass -NoProfile -Command \"irm https://hallow-agent.xyz/install.ps1 | iex\""
          ;;
      esac
      fail "Node.js 22+ is required. Install Node.js, then rerun this installer."
    fi
  fi

  local major
  major="$(node -p 'Number(process.versions.node.split(".")[0])')"
  if [ "$major" -lt 22 ]; then
    case "$(uname -s 2>/dev/null || printf unknown)" in
      MINGW*|MSYS*|CYGWIN*)
        fail "Hallow requires Node.js 22+. On Windows, run: powershell -ExecutionPolicy Bypass -NoProfile -Command \"irm https://hallow-agent.xyz/install.ps1 | iex\""
        ;;
    esac
    fail "Hallow requires Node.js 22+. Current Node major is $major."
  fi
}

ensure_git() {
  if has_cmd git; then
    return
  fi

  if [ "${PREFIX:-}" != "" ] && has_cmd pkg; then
    log "Installing git with Termux pkg"
    pkg install -y git
  elif has_cmd brew; then
    log "Installing git with Homebrew"
    brew install git
  else
    fail "git is required to clone/update Hallow."
  fi
}

find_hallow_project() {
  local root="$1"
  local subdir="$2"
  local candidates=()

  if [ -n "$subdir" ]; then
    candidates+=("$root/$subdir")
  fi
  candidates+=("$root" "$root/Hallow" "$root/hallow")

  local candidate
  for candidate in "${candidates[@]}"; do
    if [ -f "$candidate/package.json" ] && [ -f "$candidate/pnpm-workspace.yaml" ]; then
      if node -e "const p=require(process.argv[1]); process.exit(p.name==='hallow'?0:1)" "$candidate/package.json"; then
        (cd "$candidate" && pwd)
        return 0
      fi
    fi
  done

  return 1
}

write_launcher() {
  local bin_dir="$1"
  local project_dir="$2"
  local home_dir="$3"
  local launcher="$bin_dir/hallow"

  mkdir -p "$bin_dir"
  cat > "$launcher" <<EOF
#!/usr/bin/env bash
set -euo pipefail
if [ -z "\${HALLOW_HOME:-}" ]; then
  export HALLOW_HOME="$home_dir"
fi
exec node "$project_dir/packages/cli/dist/index.js" "\$@"
EOF
  chmod +x "$launcher"
}

run_hallow() {
  node "$PROJECT_DIR/packages/cli/dist/index.js" --home "$HALLOW_HOME_DIR" "$@"
}

printf '\n\033[32mHallow Installer\033[0m\n'
printf 'Local-first runtime for autonomous agents\n\n'

ensure_node
ensure_git

log "Enabling Corepack / pnpm"
corepack enable >/dev/null 2>&1 || true
export COREPACK_ENABLE_DOWNLOAD_PROMPT=0
corepack prepare pnpm@10.11.0 --activate

SCRIPT_DIR=""
if [ -n "${BASH_SOURCE[0]:-}" ] && [ -f "${BASH_SOURCE[0]}" ]; then
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
fi

PROJECT_DIR=""
if [ -n "$SCRIPT_DIR" ]; then
  if PROJECT_DIR="$(find_hallow_project "$(cd "$SCRIPT_DIR/.." && pwd)" "")"; then
    log "Using local checkout: $PROJECT_DIR"
  fi
fi

if [ -z "$PROJECT_DIR" ]; then
  mkdir -p "$INSTALL_ROOT"
  SOURCE_DIR="$INSTALL_ROOT/source"
  if [ -d "$SOURCE_DIR/.git" ]; then
    log "Updating existing checkout: $SOURCE_DIR"
    git -C "$SOURCE_DIR" fetch --prune origin
    git -C "$SOURCE_DIR" checkout "$BRANCH"
    git -C "$SOURCE_DIR" pull --ff-only origin "$BRANCH"
  else
    if [ -e "$SOURCE_DIR" ]; then
      fail "$SOURCE_DIR exists but is not a git checkout. Move it away or set HALLOW_INSTALL_ROOT."
    fi
    log "Cloning $REPO_URL#$BRANCH into $SOURCE_DIR"
    git clone --branch "$BRANCH" --depth 1 "$REPO_URL" "$SOURCE_DIR"
  fi

  PROJECT_DIR="$(find_hallow_project "$SOURCE_DIR" "$PROJECT_SUBDIR")" || fail "Could not find Hallow project. Set HALLOW_PROJECT_SUBDIR if needed."
fi

log "Installing dependencies"
cd "$PROJECT_DIR"
corepack pnpm install --frozen-lockfile

if [ "$SKIP_BUILD" != "1" ]; then
  log "Building Hallow"
  corepack pnpm build
fi

if [ "$SKIP_SETUP" != "1" ]; then
  log "Initializing Hallow home at $HALLOW_HOME_DIR"
  run_hallow init >/dev/null
  desktop_output="$(run_hallow desktop setup)"
  desktop_url="$(printf '%s\n' "$desktop_output" | awk -F'URL: ' '/^URL: /{print $2; exit}')"
  if [ -n "$desktop_url" ]; then
    printf 'Desktop: %s\n' "$desktop_url"
  else
    printf 'Desktop: ready\n'
  fi
  log "Running install health check"
  doctor_output="$(run_hallow doctor)"
  if printf '%s\n' "$doctor_output" | grep -q '^FAIL '; then
    printf '%s\n' "$doctor_output"
    fail "Hallow doctor reported failed check(s)."
  fi
  ok_count="$(printf '%s\n' "$doctor_output" | grep -c '^OK ' || true)"
  printf 'Doctor: OK (%s checks)\n' "$ok_count"
fi

BIN_DIR="${HALLOW_BIN_DIR:-$HOME/.local/bin}"
log "Writing launcher into $BIN_DIR"
write_launcher "$BIN_DIR" "$PROJECT_DIR" "$HALLOW_HOME_DIR"

printf '\n\033[32mHallow installed.\033[0m\n'
printf 'Project: %s\n' "$PROJECT_DIR"
printf 'Home:    %s\n' "$HALLOW_HOME_DIR"
printf 'Command: hallow\n\n'

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    printf 'Add this to your shell profile if hallow is not found:\n'
    printf '  export PATH="%s:$PATH"\n\n' "$BIN_DIR"
    ;;
esac

printf 'Run now:\n'
printf '  "%s/hallow" version\n' "$BIN_DIR"
printf '  "%s/hallow" start\n\n' "$BIN_DIR"
printf 'After opening a new terminal:\n'
printf '  hallow version\n'
printf '  hallow start\n'
