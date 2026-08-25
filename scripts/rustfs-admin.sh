#!/usr/bin/env bash
# ==============================================================================
# RustFS Storage Administration CLI Helper
# Manages RustFS Server Pools, Data Rebalancing, and Pool Decommissioning
# ==============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Load .env if present
if [ -f "${ROOT_DIR}/.env" ]; then
  # Export non-comment lines
  export $(grep -v '^#' "${ROOT_DIR}/.env" | xargs -0 2>/dev/null || true)
fi

S3_ACCESS_KEY="${S3_ACCESS_KEY_ID:-rustfsadmin}"
S3_SECRET_KEY="${S3_SECRET_ACCESS_KEY:-rustfsadmin}"
S3_ENDPOINT_URL="${S3_ENDPOINT:-http://127.0.0.1:9000}"

# Determine runner: Host `rc` -> Host `mc` -> Docker `rustfs-mc`
run_cmd() {
  if command -v rc >/dev/null 2>&1; then
    rc "$@"
  elif command -v mc >/dev/null 2>&1; then
    mc "$@"
  else
    # Fallback to docker compose run using minio/mc container
    docker compose -f "${ROOT_DIR}/docker-compose.yml" --profile tools run --rm \
      -e "MC_HOST_rustfs=http://${S3_ACCESS_KEY}:${S3_SECRET_KEY}@rustfs:9000" \
      rustfs-mc "$@"
  fi
}

# Ensure host alias exists if running host rc/mc
ensure_host_alias() {
  if command -v rc >/dev/null 2>&1; then
    rc alias set rustfs "${S3_ENDPOINT_URL}" "${S3_ACCESS_KEY}" "${S3_SECRET_KEY}" >/dev/null 2>&1 || true
  elif command -v mc >/dev/null 2>&1; then
    mc alias set rustfs "${S3_ENDPOINT_URL}" "${S3_ACCESS_KEY}" "${S3_SECRET_KEY}" >/dev/null 2>&1 || true
  fi
}

COMMAND="${1:-help}"
shift || true

ensure_host_alias

case "${COMMAND}" in
  pools|pool:list)
    echo "📦 Listing RustFS Storage Pools..."
    run_cmd admin pool list rustfs
    ;;

  pool:status)
    POOL_ID="${1:-0}"
    echo "📊 Status for Storage Pool ID: ${POOL_ID}..."
    run_cmd admin pool status rustfs "${POOL_ID}" --by-id
    ;;

  rebalance:start)
    echo "⚖️  Starting Data Rebalance across active storage pools..."
    run_cmd admin rebalance start rustfs
    echo "✅ Rebalance triggered. Monitor status with: bun run storage:rebalance"
    ;;

  rebalance:status)
    echo "📈 Data Rebalance Status:"
    run_cmd admin rebalance status rustfs
    ;;

  rebalance:stop)
    echo "🛑 Stopping Data Rebalance..."
    run_cmd admin rebalance stop rustfs
    ;;

  decommission:start)
    if [ $# -lt 1 ]; then
      echo "❌ Error: Target Pool ID required."
      echo "Usage: bun run storage:admin decommission:start <pool-id>"
      exit 1
    fi
    TARGET_POOL="$1"
    echo "⚠️  Starting Pool Decommission for Pool ID: ${TARGET_POOL}..."
    run_cmd admin decommission start rustfs "${TARGET_POOL}" --by-id
    ;;

  decommission:status)
    if [ $# -ge 1 ]; then
      run_cmd admin decommission status rustfs "$1" --by-id
    else
      run_cmd admin decommission status rustfs
    fi
    ;;

  decommission:cancel)
    if [ $# -lt 1 ]; then
      echo "❌ Error: Pool ID required."
      echo "Usage: bun run storage:admin decommission:cancel <pool-id>"
      exit 1
    fi
    run_cmd admin decommission cancel rustfs "$1" --by-id
    ;;

  decommission:clear)
    if [ $# -lt 1 ]; then
      echo "❌ Error: Pool ID required."
      echo "Usage: bun run storage:admin decommission:clear <pool-id>"
      exit 1
    fi
    run_cmd admin decommission clear rustfs "$1" --by-id
    ;;

  buckets|bucket:list)
    echo "🪣 Listing Buckets in RustFS:"
    run_cmd ls rustfs
    ;;

  cli)
    run_cmd "$@"
    ;;

  help|--help|-h|*)
    cat <<EOF

🛠️  RustFS Storage Administration CLI
======================================
Usage:
  bun run storage:admin <command> [arguments]
  bash scripts/rustfs-admin.sh <command> [arguments]

Commands:
  pools | pool:list                 List all configured storage pools
  pool:status <pool-id>             Show detailed stats for a pool (e.g. 0, 1)
  rebalance:start                   Start data rebalancing across pools
  rebalance:status                  Check rebalance progress and moved bytes
  rebalance:stop                    Halt the active rebalance operation
  decommission:start <pool-id>      Drain and decommission a pool
  decommission:status [pool-id]     Check decommission progress
  decommission:cancel <pool-id>     Cancel a running decommission
  decommission:clear <pool-id>      Clear decommission metadata
  buckets | bucket:list             List S3 buckets
  cli [args...]                     Execute raw rc/mc commands

Web Console:
  Access the RustFS Web Console at: http://localhost:9001
  User: ${S3_ACCESS_KEY}

EOF
    ;;
esac
