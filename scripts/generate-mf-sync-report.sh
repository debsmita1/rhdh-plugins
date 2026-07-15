#!/usr/bin/env bash
# Generate Module Federation OFS vs NFS sync chunk report for all RHDH plugins.
#
# Pipeline:
#   1. yarn install (root + workspaces with alpha frontend plugins only)
#   2. backstage-cli package bundle (each frontend plugin with ./alpha or graduated ./ + ./legacy)
#   3. Compare NFS vs OFS sync chunks from mf-manifest.json
#     - Classic: NFS = alpha, OFS = .
#     - Graduated: NFS = ., OFS = legacy (translations at ./alpha)
#   4. Hunt static imports in NFS alpha implementations
#
# Usage:
#   ./scripts/generate-mf-sync-report.sh
#   ./scripts/generate-mf-sync-report.sh --skip-install
#   ./scripts/generate-mf-sync-report.sh --skip-install --workspace /path/to/community-plugins/workspaces/topology
#   ./scripts/generate-mf-sync-report.sh --skip-install --external-only --workspace /path/to/ws-a --workspace /path/to/ws-b
#
# Options:
#   --skip-install       Skip yarn install steps
#   --skip-bundle        Skip bundle step (use existing dist/ manifests)
#   --workspace PATH     Extra workspace to inspect (repeatable; merged into report)
#   --external-only      Only inspect --workspace paths (skip default workspaces/ scan)
#   --bundle-only        Bundle only (used internally by the shell script)
#   --force-bundle       Always re-bundle (ignore cached mf-manifest.json)
#   --bundle-cache-mins  Re-bundle when cache is older than N minutes (default: 10)
#   --output FILE        Write markdown report (default: mf-sync-report.md in repo root)
#   --json FILE          Write JSON summary
#   --bundle-dir DIR     Bundle output directory (default: .mf-sync-report/)

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SKIP_INSTALL=false
SKIP_BUNDLE=false
FORCE_BUNDLE=false
EXTERNAL_ONLY=false
BUNDLE_CACHE_MINS=""
EXTRA_WORKSPACES=()
OUTPUT="$ROOT/mf-sync-report.md"
JSON_OUT=""
BUNDLE_DIR="$ROOT/.mf-sync-report"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-install) SKIP_INSTALL=true; shift ;;
    --skip-bundle)  SKIP_BUNDLE=true; shift ;;
    --force-bundle) FORCE_BUNDLE=true; shift ;;
    --bundle-cache-mins) BUNDLE_CACHE_MINS="$2"; shift 2 ;;
    --workspace)  EXTRA_WORKSPACES+=("$(cd "$2" && pwd)"); shift 2 ;;
    --external-only) EXTERNAL_ONLY=true; shift ;;
    --output)       OUTPUT="$2"; shift 2 ;;
    --json)         JSON_OUT="$2"; shift 2 ;;
    --bundle-dir)   BUNDLE_DIR="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,24p' "$0"
      exit 0
      ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

echo "=== MF OFS vs NFS Sync Report ==="
echo "Root: $ROOT"
if [[ ${#EXTRA_WORKSPACES[@]} -gt 0 ]]; then
  echo "Extra workspaces:"
  for ws in ${EXTRA_WORKSPACES[@]+"${EXTRA_WORKSPACES[@]}"}; do
    echo "  - $ws"
  done
fi
[[ "$EXTERNAL_ONLY" == true ]] && echo "Scope: external workspaces only"
echo ""

WORKSPACE_ARGS=()
if [[ ${#EXTRA_WORKSPACES[@]} -gt 0 ]]; then
  for ws in ${EXTRA_WORKSPACES[@]+"${EXTRA_WORKSPACES[@]}"}; do
    WORKSPACE_ARGS+=(--workspace "$ws")
  done
fi
if [[ "$EXTERNAL_ONLY" == true ]]; then
  WORKSPACE_ARGS+=(--external-only)
fi

# --- Step 1: Install ---
if [[ "$SKIP_INSTALL" == false ]]; then
  echo ">>> Step 1/3: yarn install (root + alpha frontend workspaces)"
  corepack enable
  yarn install

  ALPHA_WS=()
  while IFS= read -r ws; do
    [[ -n "$ws" ]] && ALPHA_WS+=("$ws")
  done < <(
    if [[ ${#WORKSPACE_ARGS[@]} -gt 0 ]]; then
      node "$ROOT/scripts/mf-sync-report-lib.mjs" --list-alpha-workspaces "${WORKSPACE_ARGS[@]}"
    else
      node "$ROOT/scripts/mf-sync-report-lib.mjs" --list-alpha-workspaces
    fi
  )
  echo "Installing ${#ALPHA_WS[@]} workspaces with alpha frontend plugins"

  FAILED_WS=()
  for name in "${ALPHA_WS[@]}"; do
    if [[ "$name" == external:* ]]; then
      continue
    fi
    if [[ "$EXTERNAL_ONLY" == true ]]; then
      continue
    fi
    ws="workspaces/$name/"
    if [[ ! -f "${ws}package.json" ]]; then
      echo "SKIP (no package.json): $name"
      continue
    fi
    echo "=== $name ==="
    if (cd "$ws" && yarn install); then
      :
    else
      echo "FAILED: $name"
      FAILED_WS+=("$name")
    fi
  done

  if [[ ${#EXTRA_WORKSPACES[@]} -gt 0 ]]; then
    for ws in "${EXTRA_WORKSPACES[@]}"; do
      if [[ ! -f "${ws}/package.json" ]]; then
        echo "SKIP external (no package.json): $ws"
        continue
      fi
      echo "=== external: $ws ==="
      if (cd "$ws" && yarn install); then
        :
      else
        echo "FAILED external: $ws"
        FAILED_WS+=("$ws")
      fi
    done
  fi

  if [[ ${#FAILED_WS[@]} -gt 0 ]]; then
    echo ""
    echo "WARNING: install failed for: ${FAILED_WS[*]}"
    echo "Report may be incomplete. Fix permissions with:"
    echo "  sudo chown -R \$(whoami) workspaces/"
    echo ""
  fi
else
  echo ">>> Step 1/3: skipped (--skip-install)"
fi

# --- Step 2: Bundle ---
echo ""
if [[ "$SKIP_BUNDLE" == false ]]; then
  echo ">>> Step 2/3: bundle frontend plugins"
  mkdir -p "$BUNDLE_DIR"
  BUNDLE_ARGS=(--bundle-dir "$BUNDLE_DIR" --bundle-only)
  if [[ ${#WORKSPACE_ARGS[@]} -gt 0 ]]; then
    BUNDLE_ARGS+=("${WORKSPACE_ARGS[@]}")
  fi
  [[ "$FORCE_BUNDLE" == true ]] && BUNDLE_ARGS+=(--force-bundle)
  [[ -n "$BUNDLE_CACHE_MINS" ]] && BUNDLE_ARGS+=(--bundle-cache-mins "$BUNDLE_CACHE_MINS")
  node "$ROOT/scripts/mf-sync-report-lib.mjs" "${BUNDLE_ARGS[@]}"
else
  echo ">>> Step 2/3: skipped (--skip-bundle)"
fi

# --- Step 3: Report ---
echo ""
echo ">>> Step 3/3: generate report"
REPORT_ARGS=(--bundle-dir "$BUNDLE_DIR" --output "$OUTPUT")
if [[ ${#WORKSPACE_ARGS[@]} -gt 0 ]]; then
  REPORT_ARGS+=("${WORKSPACE_ARGS[@]}")
fi
[[ -n "$JSON_OUT" ]] && REPORT_ARGS+=(--json "$JSON_OUT")

node "$ROOT/scripts/mf-sync-report-lib.mjs" "${REPORT_ARGS[@]}"

echo ""
echo "Done. Report: $OUTPUT"
[[ -n "$JSON_OUT" ]] && echo "JSON: $JSON_OUT"
[[ "$SKIP_BUNDLE" == false ]] && echo "Bundles: $BUNDLE_DIR"
