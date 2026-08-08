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
    DEPLOYER="unknown"
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

    cd "$CONTRACT_PATH"
    if ! cargo stylus check 2>&1; then
        echo -e "${RED}cargo stylus check failed for $NAME${NC}"
        return 1
    fi
    cd - > /dev/null

    echo -e "${GREEN}$NAME check passed${NC}"
    echo

    echo "-----------------------------------------------"
    echo "Deploying $NAME"
    echo "-----------------------------------------------"

    cd "$CONTRACT_PATH"
    if ! cargo build --target wasm32-unknown-unknown --release 2>&1; then
        echo -e "${RED}cargo build failed for $NAME${NC}"
        cd - > /dev/null
        return 1
    fi
    cd - > /dev/null

    WASM_FILE=$(find target/wasm32-unknown-unknown/release -name "${KEY}.wasm" -not -path "*/deps/*" | head -1)

    if [ -z "$WASM_FILE" ]; then
        echo -e "${RED}WASM file not found for $NAME${NC}"
        return 1
    fi

    echo "WASM: $WASM_FILE"

    START=$(date +%s)

    echo "Running: cargo stylus deploy --endpoint ... --wasm-file ../$WASM_FILE --no-verify --max-fee-per-gas-gwei 0.1"
    DEPLOY_OUTPUT=$(cd "$CONTRACT_PATH" && timeout 300 cargo stylus deploy \
        --endpoint "$RPC_URL" \
        --private-key-path "$KEY_FILE" \
        --wasm-file "../$WASM_FILE" \
        --no-verify \
        --max-fee-per-gas-gwei 0.1 2>&1) || {
        echo -e "${RED}cargo stylus deploy failed for $NAME (exit code: $?)${NC}"
        echo "Output:"
        echo "$DEPLOY_OUTPUT"
        cd - > /dev/null
        return 1
    }
    cd - > /dev/null

    echo "Deploy output:"
    echo "$DEPLOY_OUTPUT"

    ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'deployed code at address: \K0x[a-fA-F0-9]{40}' | head -1)

    if [ -z "$ADDRESS" ]; then
        ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)
    fi

    if [ -z "$ADDRESS" ]; then
        echo -e "${RED}Failed to extract deployed address from:${NC}"
        echo "$DEPLOY_OUTPUT"
        return 1
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

DEPLOY_ERRORS=0

deploy_contract "credit-manager" credit-manager || { echo -e "${RED}credit-manager deploy failed${NC}"; DEPLOY_ERRORS=$((DEPLOY_ERRORS + 1)); }

deploy_contract "user-registry" user-registry || { echo -e "${RED}user-registry deploy failed${NC}"; DEPLOY_ERRORS=$((DEPLOY_ERRORS + 1)); }

deploy_contract "memory-registry" memory-registry || { echo -e "${RED}memory-registry deploy failed${NC}"; DEPLOY_ERRORS=$((DEPLOY_ERRORS + 1)); }

deploy_contract "agent-registry" agent-registry || { echo -e "${RED}agent-registry deploy failed${NC}"; DEPLOY_ERRORS=$((DEPLOY_ERRORS + 1)); }

deploy_contract "context-registry" context-registry || { echo -e "${RED}context-registry deploy failed${NC}"; DEPLOY_ERRORS=$((DEPLOY_ERRORS + 1)); }

deploy_contract "audit-registry" audit-registry || { echo -e "${RED}audit-registry deploy failed${NC}"; DEPLOY_ERRORS=$((DEPLOY_ERRORS + 1)); }

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
        if cast send "$CREDIT_MANAGER" "initialize()" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
            cast send "$CREDIT_MANAGER" "initializeNetwork(bool,address,uint256)" "$IS_TESTNET" "$TREASURY" "$PRICE_PER_CREDIT" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1 && \
            echo -e "${GREEN}CreditManager initialized${NC}" || echo -e "${YELLOW}CreditManager network init failed${NC}"
        else
            echo -e "${YELLOW}CreditManager init skipped (already initialized?)${NC}"
        fi
    fi

    # Initialize UserRegistry
    if [ "$USER_REGISTRY" != "null" ] && [ -n "$USER_REGISTRY" ]; then
        echo "Initializing UserRegistry..."
        if cast send "$USER_REGISTRY" "initialize()" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
            echo -e "${GREEN}UserRegistry initialized${NC}"
        else
            echo -e "${YELLOW}UserRegistry init skipped${NC}"
        fi
    fi

    # Initialize MemoryRegistry (needs CreditManager + UserRegistry addresses)
    if [ "$MEMORY_REGISTRY" != "null" ] && [ -n "$MEMORY_REGISTRY" ] && [ "$CREDIT_MANAGER" != "null" ] && [ "$USER_REGISTRY" != "null" ]; then
        echo "Initializing MemoryRegistry..."
        if cast send "$MEMORY_REGISTRY" "initialize(address,address)" "$CREDIT_MANAGER" "$USER_REGISTRY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
            echo -e "${GREEN}MemoryRegistry initialized${NC}"
        else
            echo -e "${YELLOW}MemoryRegistry init skipped${NC}"
        fi
    fi

    # Initialize AgentRegistry (needs CreditManager + UserRegistry addresses)
    if [ "$AGENT_REGISTRY" != "null" ] && [ -n "$AGENT_REGISTRY" ] && [ "$CREDIT_MANAGER" != "null" ] && [ "$USER_REGISTRY" != "null" ]; then
        echo "Initializing AgentRegistry..."
        if cast send "$AGENT_REGISTRY" "initialize(address,address)" "$CREDIT_MANAGER" "$USER_REGISTRY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
            echo -e "${GREEN}AgentRegistry initialized${NC}"
        else
            echo -e "${YELLOW}AgentRegistry init skipped${NC}"
        fi
    fi

    # Initialize ContextRegistry (needs MemoryRegistry, AgentRegistry, and CreditManager)
    if [ "$CONTEXT_REGISTRY" != "null" ] && [ -n "$CONTEXT_REGISTRY" ] && [ "$MEMORY_REGISTRY" != "null" ] && [ "$AGENT_REGISTRY" != "null" ] && [ "$CREDIT_MANAGER" != "null" ]; then
        echo "Initializing ContextRegistry..."
        if cast send "$CONTEXT_REGISTRY" "initialize(address,address,address)" "$MEMORY_REGISTRY" "$AGENT_REGISTRY" "$CREDIT_MANAGER" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
            echo -e "${GREEN}ContextRegistry initialized${NC}"
        else
            echo -e "${YELLOW}ContextRegistry init skipped${NC}"
        fi
    fi

    # Initialize AuditRegistry
    AUDIT_REGISTRY=$(jq -r '.contracts.audit_registry' "$CONFIG_FILE")
    if [ "$AUDIT_REGISTRY" != "null" ] && [ -n "$AUDIT_REGISTRY" ]; then
        echo "Initializing AuditRegistry..."
        if cast send "$AUDIT_REGISTRY" "initialize()" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
            echo -e "${GREEN}AuditRegistry initialized${NC}"
        else
            echo -e "${YELLOW}AuditRegistry init skipped${NC}"
        fi
    fi

    # Authorize MemoryRegistry, AgentRegistry, and ContextRegistry as credit consumers
    if [ "$CREDIT_MANAGER" != "null" ] && [ -n "$CREDIT_MANAGER" ]; then
        echo "Authorizing credit consumers..."
        if [ "$MEMORY_REGISTRY" != "null" ] && [ -n "$MEMORY_REGISTRY" ]; then
            if cast send "$CREDIT_MANAGER" "authorizeConsumer(address)" "$MEMORY_REGISTRY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
                echo -e "${GREEN}MemoryRegistry authorized as consumer${NC}"
            else
                echo -e "${YELLOW}MemoryRegistry auth skipped${NC}"
            fi
        fi
        if [ "$AGENT_REGISTRY" != "null" ] && [ -n "$AGENT_REGISTRY" ]; then
            if cast send "$CREDIT_MANAGER" "authorizeConsumer(address)" "$AGENT_REGISTRY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
                echo -e "${GREEN}AgentRegistry authorized as consumer${NC}"
            else
                echo -e "${YELLOW}AgentRegistry auth skipped${NC}"
            fi
        fi
        if [ "$CONTEXT_REGISTRY" != "null" ] && [ -n "$CONTEXT_REGISTRY" ]; then
            if cast send "$CREDIT_MANAGER" "authorizeConsumer(address)" "$CONTEXT_REGISTRY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
                echo -e "${GREEN}ContextRegistry authorized as consumer${NC}"
            else
                echo -e "${YELLOW}ContextRegistry auth skipped${NC}"
            fi
        fi
    fi

    # Authorize MemoryRegistry and AgentRegistry as stat updaters in UserRegistry
    if [ "$USER_REGISTRY" != "null" ] && [ -n "$USER_REGISTRY" ]; then
        echo "Authorizing stat updaters..."
        if [ "$MEMORY_REGISTRY" != "null" ] && [ -n "$MEMORY_REGISTRY" ]; then
            if cast send "$USER_REGISTRY" "authorizeUpdater(address)" "$MEMORY_REGISTRY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
                echo -e "${GREEN}MemoryRegistry authorized as updater${NC}"
            else
                echo -e "${YELLOW}MemoryRegistry updater auth skipped${NC}"
            fi
        fi
        if [ "$AGENT_REGISTRY" != "null" ] && [ -n "$AGENT_REGISTRY" ]; then
            if cast send "$USER_REGISTRY" "authorizeUpdater(address)" "$AGENT_REGISTRY" --rpc-url "$RPC_URL" --private-key "$PRIVATE_KEY" >/dev/null 2>&1; then
                echo -e "${GREEN}AgentRegistry authorized as updater${NC}"
            else
                echo -e "${YELLOW}AgentRegistry updater auth skipped${NC}"
            fi
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
if [ "$DEPLOY_ERRORS" -gt 0 ]; then
    echo -e "${RED}Deployment completed with $DEPLOY_ERRORS error(s)${NC}"
else
    echo "Deployment completed"
fi
echo "==============================================="
echo

jq '.contracts' "$CONFIG_FILE"

echo

# Verify all contracts have bytecode
if [ "$NO_CAST" -eq 0 ]; then
    echo "Verifying contract bytecode..."
    ALL_OK=true
    for KEY in credit_manager user_registry memory_registry agent_registry context_registry audit_registry; do
        ADDR=$(jq -r ".contracts.$KEY" "$CONFIG_FILE")
        if [ "$ADDR" != "null" ] && [ -n "$ADDR" ]; then
            BYTECODE=$(cast code "$ADDR" --rpc-url "$RPC_URL" 2>/dev/null)
            if [ "$BYTECODE" = "0x" ] || [ -z "$BYTECODE" ]; then
                echo -e "${RED}  $KEY ($ADDR) has NO bytecode${NC}"
                ALL_OK=false
            else
                echo -e "${GREEN}  $KEY ($ADDR) OK${NC}"
            fi
        fi
    done
    if [ "$ALL_OK" = false ]; then
        echo
        echo -e "${RED}WARNING: Some contracts have no bytecode. They may need redeployment.${NC}"
    fi
fi

echo
echo "Explorer:"
echo "$EXPLORER"
echo
echo "NOTE:"
echo "- CreditManager must be deployed first."
echo "- MemoryRegistry.initialize(credit_manager, user_registry)"
echo "- AgentRegistry.initialize(credit_manager, user_registry)"
echo "- ContextRegistry.initialize(memory_registry, agent_registry, credit_manager)"
echo "- Credit consumers authorized: MemoryRegistry, AgentRegistry, ContextRegistry"
echo "- Stat updaters authorized: MemoryRegistry, AgentRegistry"
echo "- CreditManager network config initialized with:"
echo "  is_testnet=$IS_TESTNET, treasury=$TREASURY"
echo
echo "Current deployment is fully compatible with future"
echo "cross-contract integration on Arbitrum One."
echo
