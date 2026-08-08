# MemoryChain — Post-Deploy Tests (Arbitrum Sepolia)

> Ejecutar estos tests después de cada redeploy para verificar que todo funciona.

## Prerequisitos

```bash
# Variables de entorno
export RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"
export PUBLIC_KEY="0x..."  # Admin wallet (tu public key)
export PRIVATE_KEY="0x..."  # Admin wallet (tu private key)
# Test del deplyer y admin wallet (no usar en producción)
export TEST_WALLET="0x..."  # Test wallet (para pruebas de usuario)
export TEST_PRIVATE="0x..."  # Test wallet private key

# Addresses (actualizar después de cada deploy)
CM="0x..."  # Contract Manager
UR="0x..."  # User Registry
MR="0x..."  # Memory Registry
AR="0x..."  # Agent Registry
CTX="0x..."  # Context Manager
AUD="0x..."  # Audit Log
DEPLOYER="0x..."  # Deployer
```

```bash
# Variables de entorno
export RPC_URL="https://sepolia-rollup.arbitrum.io/rpc"
export PUBLIC_KEY="0x..."  # Admin wallet (tu public key)
export PRIVATE_KEY="0x..."  # Admin wallet (tu private key)
# Test del deplyer y admin wallet (no usar en producción)
export PUBLIC_KEY="0x636b53B6DdA21FD7c953677ab1aA892A9957E97b"
export PRIVATE_KEY="0x25be0bb2bfb958d3886fe66927f23f38859b40c5a5adfb61c9645993e3e495db"

# Test wallet (para pruebas de usuario)
export TEST_WALLET="0x873277138c99d3BA16237Cd79959fE22f6775314"
export TEST_PRIVATE="0x685f18ce89289c67ab2598a9a746b0d933ea7346c2965d595f1e85bb4eccbfeb"

export TEST2_WALLET="0xbb44e12e677a37ea1e7b2d12735b9f794580bed7"


export TEST3_WALLET="0x52300b4d29e6f4d9a29172e49e1edf8603e3b7d5"
export TEST3_PRIVATE="0xd83d3bd1c72f0e328d736a52558f868708371aac526d99d24dc5dd70f162194c"

# Addresses (actualizar después de cada deploy)
CM="0x065088a1f729af5361cfdd2db72f6a7fdcbaa999"
UR="0x03b62193a5ea468f2130f378b4e79a26b8a39ace"
MR="0x22f70c5666be8451e203d75aaebaec667f0b90eb"
AR="0xc39bd249bd237e1306dbf197992ab13a210c61e1"
CTX="0x3fb21783cedaddc73bba20bd4aa2dd9fd419344b"
AUD="0x4bccf938c7121d608ebd55ce3786151e41ae8eeb"
DEPLOYER="0x636b53B6DdA21FD7c953677ab1aA892A9957E97b"
```

**NOTA:** Stylus SDK usa **camelCase** para los selectores ABI. Ej: `totalUsers` no `total_users`.

---

## 1. Verificación de Contratos

```bash
echo "=== Contract Verification ==="
echo -n "CM admin: "
cast call "$CM" "admin()(address)" --rpc-url $RPC_URL

echo -n "CM isPaused: "
cast call "$CM" "isPaused()(bool)" --rpc-url $RPC_URL


echo -n "CM getFee(OP_CREATE_MEMORY): "
cast call "$CM" "getFee(uint8)(uint16)" 1 --rpc-url $RPC_URL

echo -n "CM getFee(OP_CREATE_AGENT): "
cast call "$CM" "getFee(uint8)(uint16)" 3 --rpc-url $RPC_URL
# Expected: CM getFee(OP_CREATE_AGENT): 5

echo -n "UR totalUsers: "
cast call "$UR" "totalUsers()(uint256)" --rpc-url $RPC_URL
# Expected: UR totalUsers: 3

echo -n "MR totalMemories: "
cast call "$MR" "totalMemories()(uint256)" --rpc-url $RPC_URL
# Expected: MR totalMemories: 1

echo -n "AR totalAgents: "
cast call "$AR" "totalAgents()(uint256)" --rpc-url $RPC_URL
# Expected: AR totalAgents: 1

echo -n "AUD totalEvents: "
cast call "$AUD" "totalEvents()(uint256)" --rpc-url $RPC_URL
```

## 2. User Registration (test wallet only)

```bash
# Fund test wallet
cast send "$TEST_WALLET" --value 0.005ether \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

# Verify balance of ETH
echo -n "ETH balance: "
cast balance "$TEST_WALLET" --rpc-url $RPC_URL

# Send eth from test wallet to deployer (to avoid dust)
cast send <DIRECCION_DESTINO></DIRECCION_DESTINO> \
  --value 0.00892ether \
  --rpc-url $RPC_URL \
  --private-key <PRIVATE_KEY> \
  --gas-limit 21000

# Verify balance but credits
echo -n "balanceOf(): "
cast call "$CM" "balanceOf(address)(uint64)" $TEST_WALLET --rpc-url $RPC_URL

# Register test user
cast send "$UR" "registerUser(string)" "test_user" \
  --rpc-url $RPC_URL --private-key $TEST_PRIVATE --gas-limit 200000

# Verify
echo -n "isRegistered(test_wallet): "
cast call "$UR" "isRegistered(address)(bool)" $TEST_WALLET --rpc-url $RPC_URL
# Expected: true

echo -n "getUsername(test_wallet): "
cast call "$UR" "getUsername(address)(string)" $TEST_WALLET --rpc-url $RPC_URL
# Expected: "test_user"

echo -n "totalUsers: "
cast call "$UR" "totalUsers()(uint256)" --rpc-url $RPC_URL
# Expected: 1
```

---

## 3. Credit Purchase

```bash
# Test user buys 50 credits (0.00005 ETH)
cast send "$CM" "buyCredits(uint64)" 50 \
  --value 0.00005ether \
  --rpc-url $RPC_URL --private-key $TEST_PRIVATE

# Verify balance
echo -n "balanceOf(test_wallet): "
cast call "$CM" "balanceOf(address)(uint64)" $TEST_WALLET --rpc-url $RPC_URL
```

---

## 4. Create Memory

```bash
# Create memory (costs 1 MC)
cast send "$MR" "createMemory(string,bytes32,uint8,uint8)" \
  "QmTestCID123" \
  0x0000000000000000000000000000000000000000000000000000000000000001 \
  1 \
  0 \
  --rpc-url $RPC_URL --private-key $TEST_PRIVATE

# Verify
echo -n "totalMemories: "
cast call "$MR" "totalMemories()(uint256)" --rpc-url $RPC_URL
# Expected: 1

echo -n "balanceOf(test_wallet): "
cast call "$CM" "balanceOf(address)(uint64)" $TEST_WALLET --rpc-url $RPC_URL
# Expected: 49 (50 - 1)
```

---

## 5. Create Agent

```bash
# Create agent (costs 5 MC)
cast send "$AR" "createAgent(string,string,string,bytes32)" \
  "TestAgent" \
  "A test agent" \
  "QmAgentCID456" \
  0x0000000000000000000000000000000000000000000000000000000000000002 \
  --rpc-url $RPC_URL --private-key $TEST_PRIVATE

# Verify
echo -n "totalAgents: "
cast call "$AR" "totalAgents()(uint256)" --rpc-url $RPC_URL
# Expected: 1

echo -n "balanceOf(test_wallet): "
cast call "$CM" "balanceOf(address)(uint64)" $TEST_WALLET --rpc-url $RPC_URL
# Expected: 44 (49 - 5)
```

---

## 6. Link Memory to Agent

```bash
# Get IDs
MEM_ID=$(cast call "$MR" "getMemoryByOwnerIndex(address,uint256)(bytes32)" $TEST_WALLET 0 --rpc-url $RPC_URL)
AGT_ID=$(cast call "$AR" "getAgentByOwnerIndex(address,uint256)(bytes32)" $TEST_WALLET 0 --rpc-url $RPC_URL)

# Link (costs 1 MC)
cast send "$CTX" "linkMemory(bytes32,bytes32,uint8)" "$AGT_ID" "$MEM_ID" 1 \
  --rpc-url $RPC_URL --private-key $TEST_PRIVATE

# Verify
echo -n "balanceOf(test_wallet): "
cast call "$CM" "balanceOf(address)(uint64)" $TEST_WALLET --rpc-url $RPC_URL
# Expected: 43 (44 - 1)
```

---

## 7. Pausable

```bash
# Admin pauses
cast send "$CM" "pause()" --rpc-url $RPC_URL --private-key $PRIVATE_KEY
echo -n "isPaused: "
cast call "$CM" "isPaused()(bool)" --rpc-url $RPC_URL
# Expected: true

# Test user tries to buy credits (should revert)
cast send "$CM" "buyCredits(uint64)" 10 \
  --value 0.00001ether \
  --rpc-url $RPC_URL --private-key $TEST_PRIVATE
# Expected: Error (reverted)

# Admin unpauses
cast send "$CM" "unpause()" --rpc-url $RPC_URL --private-key $PRIVATE_KEY
echo -n "isPaused: "
cast call "$CM" "isPaused()(bool)" --rpc-url $RPC_URL
# Expected: false
```

---

## 8. Two-Step Admin Transfer (optional)

```bash
# Generate new admin wallet
NEW_ADMIN_WALLET=$(cast wallet new 2>&1 | grep "Address:" | awk '{print $NF}')
NEW_ADMIN_PRIVATE=$(cast wallet new 2>&1 | grep "Private key:" | awk '{print $NF}')

# Step 1: Current admin proposes new admin
cast send "$CM" "proposeAdmin(address)" "$NEW_ADMIN_WALLET" \
  --rpc-url $RPC_URL --private-key $PRIVATE_KEY

echo -n "pendingAdmin: "
cast call "$CM" "pendingAdmin()(address)" --rpc-url $RPC_URL
# Expected: $NEW_ADMIN_WALLET

# Step 2: New admin accepts
cast send "$CM" "acceptAdmin()" \
  --rpc-url $RPC_URL --private-key "$NEW_ADMIN_PRIVATE"

echo -n "admin: "
cast call "$CM" "admin()(address)" --rpc-url $RPC_URL
# Expected: $NEW_ADMIN_WALLET

# NOTE: In production, transfer admin back to original wallet
```

---

## Fee Constants

| Code | Operation | Default Fee |
|------|-----------|-------------|
| 0 | registerUser | 0 MC (free) |
| 1 | createMemory | 1 MC |
| 2 | updateMemory | 1 MC |
| 3 | createAgent | 5 MC |
| 4 | updateAgent | 2 MC |
| 5 | executeAgent | 2 MC |
| 6 | linkMemory | 1 MC |

## ABI Selector Reference

Stylus SDK convierte snake_case a camelCase para los selectores:

| Rust Function | ABI Selector |
|---------------|--------------|
| `total_users()` | `totalUsers()` |
| `is_paused()` | `isPaused()` |
| `register_user(string)` | `registerUser(string)` |
| `buy_credits(uint64)` | `buyCredits(uint64)` |
| `create_memory(...)` | `createMemory(...)` |
| `create_agent(...)` | `createAgent(...)` |
| `link_memory(...)` | `linkMemory(...)` |
| `is_registered(address)` | `isRegistered(address)` |
| `get_username(address)` | `getUsername(address)` |
| `is_active(address)` | `isActive(address)` |
| `get_agent_count(address)` | `getAgentCount(address)` |
| `get_memory_count(address)` | `getMemoryCount(address)` |
| `total_events()` | `totalEvents()` |
| `pending_admin()` | `pendingAdmin()` |
| `propose_admin(address)` | `proposeAdmin(address)` |
| `accept_admin()` | `acceptAdmin()` |
