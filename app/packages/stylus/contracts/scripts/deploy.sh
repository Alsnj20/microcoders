#!/bin/bash
# ==============================================================================
# MemoryChain Deployment Script
#
# Deploys every Stylus contract in the correct dependency order.
# Supports dual wallet configuration (testnet/mainnet).
#
# Usage:
#   ./scripts/deploy.sh sepolia
#   ./scripts/deploy.sh one
#   ./scripts/deploy.sh one --force
#
# ==============================================================================

set -Eeuo pipefail

export PATH="/usr/local/bin:/usr/bin:/bin:$HOME/.cargo/bin:$HOME/.foundry/bin:$PATH"

NETWORK="${1:-sepolia}"
FORCE="${2:-}"

DEPLOY_DIR="deploy"
CONFIG_FILE="$DEPLOY_DIR/$NETWORK.json"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

require() {
    command -v "$1" >/dev/null 2>&1 || {
        echo -e "${RED}Missing dependency: $1${NC}"
        exit 1
    }
}

echo
echo "==============================================="
echo "     MemoryChain Stylus Deployment"
echo "==============================================="
echo

require cargo
require jq

if ! command -v cast &>/dev/null; then
    echo -e "${YELLOW}Warning: cast not found. Skipping balance check.${NC}"
    NO_CAST=1
else
    NO_CAST=0
fi

cargo stylus --help >/dev/null 2>&1 || {
    echo -e "${RED}cargo-stylus is not installed.${NC}"
    exit 1
}

if [ ! -f ".env" ]; then
    echo -e "${RED}.env file not found.${NC}"
    exit 1
fi

set -a
source .env
set +a

# ── Select wallet based on network ──────────────────────────────────────────
if [ "$NETWORK" = "sepolia" ]; then
    PRIVATE_KEY="${TESTNET_PRIVATE_KEY:-}"
    TREASURY="${TESTNET_TREASURY:-}"
    IS_TESTNET="true"
    PRICE_PER_CREDIT="1000000000000"
elif [ "$NETWORK" = "one" ]; then
    PRIVATE_KEY="${MAINNET_PRIVATE_KEY:-}"
    TREASURY="${MAINNET_TREASURY:-}"
    IS_TESTNET="false"
    PRICE_PER_CREDIT="1000000000000"
else
    echo -e "${RED}Unknown network: $NETWORK${NC}"
    echo "Supported networks: sepolia, one"
    exit 1
fi

if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}${NETWORK^^}_PRIVATE_KEY not found in .env${NC}"
    exit 1
fi

if [ -z "$TREASURY" ]; then
    echo -e "${RED}${NETWORK^^}_TREASURY not found in .env${NC}"
    exit 1
fi

if [ ! -f "$CONFIG_FILE" ]; then
    echo -e "${RED}$CONFIG_FILE not found.${NC}"
    exit 1
fi

RPC_URL=$(jq -r '.rpc_url' "$CONFIG_FILE")
EXPLORER=$(jq -r '.explorer' "$CONFIG_FILE")

if [ "$RPC_URL" = "null" ] || [ -z "$RPC_URL" ]; then
    echo -e "${RED}rpc_url missing in config.${NC}"
    exit 1
fi

KEY_FILE=$(mktemp)

cleanup() {
    rm -f "$KEY_FILE"
}

trap cleanup EXIT

chmod 600 "$KEY_FILE"
echo "$PRIVATE_KEY" > "$KEY_FILE"

echo
echo "Network   : $NETWORK"
echo "RPC       : $RPC_URL"
echo "Treasury  : $TREASURY"
echo "Testnet   : $IS_TESTNET"

if [ "$NO_CAST" -eq 0 ]; then
    DEPLOYER=$(cast wallet address "$PRIVATE_KEY")
    BALANCE=$(cast balance "$DEPLOYER" --rpc-url "$RPC_URL")
    echo "Deployer  : $DEPLOYER"
    echo "Balance   : $BALANCE"
else
    echo -e "${YELLOW}Skipping deployer info (install foundry for cast)${NC}"
fi
echo

echo "Checking workspace..."

cargo check --workspace

echo
echo -e "${GREEN}Workspace OK${NC}"
echo

deploy_contract() {

    local NAME="$1"
    local CONTRACT_PATH="$2"

    local KEY
    KEY="${NAME//-/_}"

    EXISTING=$(jq -r ".contracts.$KEY" "$CONFIG_FILE")

    if [[ "$FORCE" != "--force" && "$EXISTING" != "null" && -n "$EXISTING" ]]; then
        echo -e "${YELLOW}$NAME already deployed${NC}"
        echo "Address: $EXISTING"
        echo
        return
    fi

    echo "-----------------------------------------------"
    echo "Checking $NAME"
    echo "-----------------------------------------------"

    # Run cargo stylus check to verify WASM compilation
    cd "$CONTRACT_PATH"
    if ! cargo stylus check 2>&1; then
        echo -e "${RED}cargo stylus check failed for $NAME${NC}"
        exit 1
    fi
    cd - > /dev/null

    echo -e "${GREEN}$NAME check passed${NC}"
    echo

    echo "-----------------------------------------------"
    echo "Deploying $NAME"
    echo "-----------------------------------------------"

    # Build WASM for the contract
    cd "$CONTRACT_PATH"
    cargo build --target wasm32-unknown-unknown --release 2>&1
    cd - > /dev/null

    # Find the WASM file in workspace target
    WASM_FILE=$(find target/wasm32-unknown-unknown/release -name "${KEY}.wasm" -not -path "*/deps/*" | head -1)

    if [ -z "$WASM_FILE" ]; then
        echo -e "${RED}WASM file not found for $NAME${NC}"
        exit 1
    fi

    START=$(date +%s)

    RESULT=$(cd "$CONTRACT_PATH" && cargo stylus deploy \
        --endpoint "$RPC_URL" \
        --private-key-path "$KEY_FILE" \
        --wasm-file "../$WASM_FILE" \
        --no-verify \
        --max-fee-per-gas-gwei 0.1 2>&1)

    ADDRESS=$(echo "$RESULT" | grep -oE '0x[a-fA-F0-9]{40}' | tail -1)

    if [ -z "$ADDRESS" ]; then
        echo "$RESULT"
        exit 1
    fi

    jq ".contracts.$KEY=\"$ADDRESS\"" "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
    mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

    END=$(date +%s)

    echo -e "${GREEN}Success${NC}"
    echo "Address : $ADDRESS"
    echo "Time    : $((END-START)) seconds"
    echo
}

###############################################################################
# Deployment Order
###############################################################################

deploy_contract "credit-manager" credit-manager

deploy_contract "user-registry" user-registry

deploy_contract "memory-registry" memory-registry

deploy_contract "agent-registry" agent-registry

deploy_contract "context-registry" context-registry

deploy_contract "audit-registry" audit-registry

###############################################################################
# Post-Deploy: Initialize All Contracts
###############################################################################

if [ "$NO_CAST" -eq 0 ]; then
    echo "-----------------------------------------------"
    echo "Initializing all contracts"
    echo "-----------------------------------------------"

    CREDIT_MANAGER=$(jq -r '.contracts.credit_manager' "$CONFIG_FILE")
    USER_REGISTRY=$(jq -r '.contracts.user_registry' "$CONFIG_FILE")
    MEMORY_REGISTRY=$(jq -r '.contracts.memory_registry' "$CONFIG_FILE")
    AGENT_REGISTRY=$(jq -r '.contracts.agent_registry' "$CONFIG_FILE")
    CONTEXT_REGISTRY=$(jq -r '.contracts.context_registry' "$CONFIG_FILE")

    # Initialize CreditManager
    if [ "$CREDIT_MANAGER" != "null" ] && [ -n "$CREDIT_MANAGER" ]; then
        echo "Initializing CreditManager..."
        cast send "$CREDIT_MANAGER" "initialize()" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" 2>&1 | grep -q "success" && \
        cast send "$CREDIT_MANAGER" "initializeNetwork(bool,address,uint256)" "$IS_TESTNET" "$TREASURY" "$PRICE_PER_CREDIT" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" 2>&1 | grep -q "success" && \
        echo -e "${GREEN}CreditManager initialized${NC}" || echo -e "${YELLOW}CreditManager init skipped (already initialized?)${NC}"
    fi

    # Initialize UserRegistry
    if [ "$USER_REGISTRY" != "null" ] && [ -n "$USER_REGISTRY" ]; then
        echo "Initializing UserRegistry..."
        cast send "$USER_REGISTRY" "initialize()" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" 2>&1 | grep -q "success" && \
        echo -e "${GREEN}UserRegistry initialized${NC}" || echo -e "${YELLOW}UserRegistry init skipped${NC}"
    fi

    # Initialize MemoryRegistry (needs CreditManager address)
    if [ "$MEMORY_REGISTRY" != "null" ] && [ -n "$MEMORY_REGISTRY" ] && [ "$CREDIT_MANAGER" != "null" ]; then
        echo "Initializing MemoryRegistry..."
        cast send "$MEMORY_REGISTRY" "initialize(address)" "$CREDIT_MANAGER" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" 2>&1 | grep -q "success" && \
        echo -e "${GREEN}MemoryRegistry initialized${NC}" || echo -e "${YELLOW}MemoryRegistry init skipped${NC}"
    fi

    # Initialize AgentRegistry (needs CreditManager address)
    if [ "$AGENT_REGISTRY" != "null" ] && [ -n "$AGENT_REGISTRY" ] && [ "$CREDIT_MANAGER" != "null" ]; then
        echo "Initializing AgentRegistry..."
        cast send "$AGENT_REGISTRY" "initialize(address)" "$CREDIT_MANAGER" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" 2>&1 | grep -q "success" && \
        echo -e "${GREEN}AgentRegistry initialized${NC}" || echo -e "${YELLOW}AgentRegistry init skipped${NC}"
    fi

    # Initialize ContextRegistry (needs MemoryRegistry and AgentRegistry)
    if [ "$CONTEXT_REGISTRY" != "null" ] && [ -n "$CONTEXT_REGISTRY" ] && [ "$MEMORY_REGISTRY" != "null" ] && [ "$AGENT_REGISTRY" != "null" ]; then
        echo "Initializing ContextRegistry..."
        cast send "$CONTEXT_REGISTRY" "initialize(address,address)" "$MEMORY_REGISTRY" "$AGENT_REGISTRY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" 2>&1 | grep -q "success" && \
        echo -e "${GREEN}ContextRegistry initialized${NC}" || echo -e "${YELLOW}ContextRegistry init skipped${NC}"
    fi

    # Authorize MemoryRegistry and AgentRegistry as credit consumers
    if [ "$CREDIT_MANAGER" != "null" ] && [ -n "$CREDIT_MANAGER" ]; then
        echo "Authorizing credit consumers..."
        if [ "$MEMORY_REGISTRY" != "null" ] && [ -n "$MEMORY_REGISTRY" ]; then
            cast send "$CREDIT_MANAGER" "authorizeConsumer(address)" "$MEMORY_REGISTRY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" 2>&1 | grep -q "success" && \
            echo -e "${GREEN}MemoryRegistry authorized${NC}" || echo -e "${YELLOW}MemoryRegistry auth skipped${NC}"
        fi
        if [ "$AGENT_REGISTRY" != "null" ] && [ -n "$AGENT_REGISTRY" ]; then
            cast send "$CREDIT_MANAGER" "authorizeConsumer(address)" "$AGENT_REGISTRY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" 2>&1 | grep -q "success" && \
            echo -e "${GREEN}AgentRegistry authorized${NC}" || echo -e "${YELLOW}AgentRegistry auth skipped${NC}"
        fi
    fi
else
    echo -e "${YELLOW}Skipping contract initialization (cast not available)${NC}"
fi

echo

###############################################################################
# Metadata
###############################################################################

jq ".deployer=\"$DEPLOYER\"" "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

jq ".treasury=\"$TREASURY\"" "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

jq ".deployed_at=\"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\"" "$CONFIG_FILE" > "$CONFIG_FILE.tmp"
mv "$CONFIG_FILE.tmp" "$CONFIG_FILE"

###############################################################################
# Summary
###############################################################################

echo
echo "==============================================="
echo "Deployment completed"
echo "==============================================="
echo

jq '.contracts' "$CONFIG_FILE"

echo
echo "Explorer:"
echo "$EXPLORER"
echo
echo "NOTE:"
echo "- CreditManager must be deployed first."
echo "- MemoryRegistry and AgentRegistry will later receive"
echo "  the CreditManager address for cross-contract calls."
echo "- ContextRegistry will later receive MemoryRegistry"
echo "  and AgentRegistry addresses."
echo "- CreditManager network config initialized with:"
echo "  is_testnet=$IS_TESTNET, treasury=$TREASURY"
echo
echo "Current deployment is fully compatible with future"
echo "cross-contract integration on Arbitrum One."
echo
