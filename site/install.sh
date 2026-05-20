#!/usr/bin/env bash
set -euo pipefail

PRIMARY_URL="${HALLOW_INSTALL_SOURCE_URL:-https://raw.githubusercontent.com/Hallow-agent/Hallow/main/scripts/install.sh}"
FALLBACK_URL="${HALLOW_INSTALL_FALLBACK_URL:-https://raw.githubusercontent.com/Hallow-agent/Hallow/main/Hallow/scripts/install.sh}"

log() {
  printf '\033[36m==> %s\033[0m\n' "$1"
}

fail() {
  printf '\033[31merror: %s\033[0m\n' "$1" >&2
  exit 1
}

if ! command -v curl >/dev/null 2>&1; then
  fail "curl is required. Install curl, then rerun the Hallow installer."
fi

tmp="$(mktemp "${TMPDIR:-/tmp}/hallow-install.XXXXXX")"
trap 'rm -f "$tmp"' EXIT

log "Fetching Hallow installer"
if ! curl -fsSL "$PRIMARY_URL" -o "$tmp"; then
  log "Primary installer was unavailable, trying fallback"
  curl -fsSL "$FALLBACK_URL" -o "$tmp"
fi

export HALLOW_PROJECT_SUBDIR="${HALLOW_PROJECT_SUBDIR:-}"
exec bash "$tmp"
