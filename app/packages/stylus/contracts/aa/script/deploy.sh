#!/usr/bin/env bash
set -euo pipefail

# Deploy ERC-4337 contracts (EntryPoint v0.6 + SimpleAccountFactory).
#
# Usage:
#   ./deploy.sh                  # Nitro dev (default) — deploys EntryPoint + factory
#   ./deploy.sh sepolia          # Arbitrum Sepolia — uses canonical EntryPoint, deploys factory
#   ./deploy.sh one              # Arbitrum One — uses canonical EntryPoint, deploys factory
#
# Credentials come from the standardized env vars:
#   PRIVATE_KEY_NITRO / PRIVATE_KEY_SEPOLIA / PRIVATE_KEY_MAINNET
#   RPC_URL_NITRO / RPC_URL_SEPOLIA / RPC_URL_MAINNET

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
APP_DIR="$(cd "$PROJECT_DIR/../../../.." && pwd)"

# Load hono + stylus .env (standardized vars live in packages/stylus/.env)
for envfile in "$APP_DIR/packages/hono/.env" "$PROJECT_DIR/../.env"; do
  if [ -f "$envfile" ]; then
    set -a
    source "$envfile"
    set +a
  fi
done

NETWORK="${1:-nitro}"

case "$NETWORK" in
  nitro)
    RPC_URL="${RPC_URL:-${RPC_URL_NITRO:-http://localhost:8547}}"
    PRIVATE_KEY="${PRIVATE_KEY:-${PRIVATE_KEY_NITRO:-${DEV_PRIVATE_KEY:-}}}"
    ENTRY_POINT_ADDRESS="${ENTRY_POINT_ADDRESS:-}"          # deploy one
    CHAIN_ID="${CHAIN_ID:-412346}"
    ;;
  sepolia)
    RPC_URL="${RPC_URL:-${RPC_URL_SEPOLIA:-https://sepolia-rollup.arbitrum.io/rpc}}"
    PRIVATE_KEY="${PRIVATE_KEY:-${PRIVATE_KEY_SEPOLIA:-}}"
    ENTRY_POINT_ADDRESS="${ENTRY_POINT_ADDRESS:-0x5FF137D4b0FDCD49DcA30c7CF57C578A026d2789}"
    CHAIN_ID="${CHAIN_ID:-421614}"
    ;;
  one|mainnet)
    RPC_URL="${RPC_URL:-${RPC_URL_MAINNET:-https://arb1.arbitrum.io/rpc}}"
    PRIVATE_KEY="${PRIVATE_KEY:-${PRIVATE_KEY_MAINNET:-}}"
    ENTRY_POINT_ADDRESS="${ENTRY_POINT_ADDRESS:-0x5FF137D4b0FDCD49DcA30c7CF57C578A026d2789}"
    CHAIN_ID="${CHAIN_ID:-42161}"
    ;;
  *)
    echo "Unknown network: $NETWORK (use nitro|sepolia|one)"
    exit 1
    ;;
esac

if [ -z "$PRIVATE_KEY" ]; then
  echo "Error: PRIVATE_KEY_${NETWORK^^} not found in packages/stylus/.env"
  exit 1
fi

export PRIVATE_KEY
export ENTRY_POINT_ADDRESS

echo "=== Deploying ERC-4337 Contracts (v0.6) ==="
echo "Network : $NETWORK (chain $CHAIN_ID)"
echo "RPC URL : $RPC_URL"
echo "EntryPoint: ${ENTRY_POINT_ADDRESS:-<deploy new>}"

cd "$PROJECT_DIR"

forge script script/DeployAA.s.sol:DeployAA \
  --rpc-url "$RPC_URL" \
  --broadcast \
  --private-key "$PRIVATE_KEY" \
  -v 2>&1 | tee /tmp/aa-deploy.log

# Extract addresses from output (prefer canonical EntryPoint when provided)
ENTRY_POINT="${ENTRY_POINT_ADDRESS:-$(grep "ENTRY_POINT_ADDRESS=" /tmp/aa-deploy.log | head -1 | sed 's/.*ENTRY_POINT_ADDRESS=//' | xargs)}"
FACTORY=$(grep "SMART_ACCOUNT_FACTORY=" /tmp/aa-deploy.log | head -1 | sed 's/.*SMART_ACCOUNT_FACTORY=//' | xargs)

if [ -z "$ENTRY_POINT" ] || [ -z "$FACTORY" ]; then
  echo "Error: could not extract deployment addresses from forge output"
  exit 1
fi

echo ""
echo "=== SAVING ADDRESSES ==="

# 1. Bundler env (Alto)
cat > "$APP_DIR/packages/stylus/aa/.env" <<EOF
ENTRY_POINT_ADDRESS=$ENTRY_POINT
SMART_ACCOUNT_FACTORY=$FACTORY
EOF
echo "Saved to packages/stylus/aa/.env"

# 2. Frontend env (.env.local)
FRONTEND_ENV="$APP_DIR/packages/nextjs/.env.local"
if [ -f "$FRONTEND_ENV" ] && grep -q "NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS" "$FRONTEND_ENV"; then
  sed -i "s|^NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS=.*|NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS=$FACTORY|" "$FRONTEND_ENV"
else
  echo "NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS=$FACTORY" >> "$FRONTEND_ENV"
fi
echo "Updated packages/nextjs/.env.local"

# 3. Backend env (hono)
HONO_ENV="$APP_DIR/packages/hono/.env"
for keyval in "FACTORY_ADDRESS=$FACTORY" "ENTRY_POINT_ADDRESS=$ENTRY_POINT" "CHAIN_ID=$CHAIN_ID"; do
  k="${keyval%%=*}"
  if [ -f "$HONO_ENV" ] && grep -q "^$k=" "$HONO_ENV"; then
    sed -i "s|^$k=.*|$keyval|" "$HONO_ENV"
  else
    echo "$keyval" >> "$HONO_ENV"
  fi
done
echo "Updated packages/hono/.env"

echo ""
echo "ENTRY_POINT=$ENTRY_POINT"
echo "FACTORY=$FACTORY"
echo "=== Deployment Complete ==="
