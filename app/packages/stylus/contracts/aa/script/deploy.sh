#!/usr/bin/env bash
set -euo pipefail

# Deploy ERC-4337 contracts (EntryPoint + SimpleAccountFactory)
# Usage: ./deploy.sh [rpc-url] [private-key]
#
# Environment variables (or pass as arguments):
#   RPC_URL       - JSON-RPC endpoint (default: http://localhost:8547)
#   PRIVATE_KEY   - Deployer private key (hex, with 0x prefix)
#
# Automatically loads from packages/hono/.env if PRIVATE_KEY not set

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_DIR="$(cd "$PROJECT_DIR/../../../.." && pwd)"

# Load .env from hono package if PRIVATE_KEY not set
if [ -z "${PRIVATE_KEY:-}" ] && [ -f "$APP_DIR/packages/hono/.env" ]; then
  set -a
  source "$APP_DIR/packages/hono/.env"
  set +a
fi

# Also check stylus .env for RPC_URL
if [ -z "${RPC_URL:-}" ] && [ -f "$PROJECT_DIR/../.env" ]; then
  set -a
  source "$PROJECT_DIR/../.env"
  set +a
fi

RPC_URL="${1:-${RPC_URL:-${RPC_URL_NITRO:-http://localhost:8547}}}"
PRIVATE_KEY="${2:-${PRIVATE_KEY:-${DEV_PRIVATE_KEY:-${PRIVATE_KEY_NITRO:-}}}}"

if [ -z "$PRIVATE_KEY" ]; then
  echo "Error: PRIVATE_KEY is required"
  echo "Usage: PRIVATE_KEY=0x... ./deploy.sh [rpc-url]"
  exit 1
fi

# Export as PRIVATE_KEY for Foundry script
export PRIVATE_KEY

echo "=== Deploying ERC-4337 Contracts ==="
echo "RPC URL: $RPC_URL"
echo "Project: $PROJECT_DIR"

cd "$PROJECT_DIR"

forge script script/DeployAA.s.sol:DeployAA \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  -v 2>&1 | tee /tmp/aa-deploy.log

# Extract addresses from output
ENTRY_POINT=$(grep "ENTRY_POINT_ADDRESS=" /tmp/aa-deploy.log | head -1 | sed 's/.*ENTRY_POINT_ADDRESS=//' | xargs)
FACTORY=$(grep "SMART_ACCOUNT_FACTORY=" /tmp/aa-deploy.log | head -1 | sed 's/.*SMART_ACCOUNT_FACTORY=//' | xargs)

if [ -n "$ENTRY_POINT" ] && [ -n "$FACTORY" ]; then
  echo ""
  echo "=== SAVING ADDRESSES ==="

  # Save to bundler env
  cat > "$APP_DIR/packages/stylus/aa/.env" <<EOF
ENTRY_POINT_ADDRESS=$ENTRY_POINT
SMART_ACCOUNT_FACTORY=$FACTORY
EOF
  echo "Saved to packages/stylus/aa/.env"

  # Update frontend .env
  FRONTEND_ENV="$APP_DIR/packages/nextjs/.env"
  if [ -f "$FRONTEND_ENV" ]; then
    if grep -q "NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS" "$FRONTEND_ENV"; then
      sed -i "s|^NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS=.*|NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS=$FACTORY|" "$FRONTEND_ENV"
    else
      echo "NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS=$FACTORY" >> "$FRONTEND_ENV"
    fi
    echo "Updated packages/nextjs/.env.local"
  else
    echo "NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS=$FACTORY" > "$FRONTEND_ENV"
    echo "Created packages/nextjs/.env.local"
  fi

  echo "ENTRY_POINT=$ENTRY_POINT"
  echo "FACTORY=$FACTORY"
fi

echo ""
echo "=== Deployment Complete ==="
