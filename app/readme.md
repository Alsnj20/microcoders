# 🏗 scaffold-stylus

<h4 align="center">
  <a href="https://arb-stylus.github.io/scaffold-stylus-docs/">Documentation</a> |
  <a href="https://scaffoldstylus.quantum3labs.com/">Website</a>
</h4>

🧪 An open-source, up-to-date toolkit for building decentralized applications (dapps) on the Arbitrum blockchain. It's designed to make it easier for developers to create and deploy smart contracts and build user interfaces that interact with those contracts.

⚙️ Built using Rust, NextJS, RainbowKit, Stylus, Wagmi, Viem, and TypeScript.

- ✅ **Contract Hot Reload**: Your frontend auto-adapts to your smart contract as you edit it.
- 🪝 **[Custom hooks](https://arb-stylus.github.io/scaffold-stylus-docs/components)**: Collection of React hooks wrapped around [wagmi](https://wagmi.sh/) to simplify interactions with smart contracts with TypeScript autocompletion.
- 🧱 [**Components**](https://arb-stylus.github.io/scaffold-stylus-docs/hooks): Collection of common web3 components to quickly build your frontend.
- 🔥 **Burner Wallet & Local Faucet**: Quickly test your application with a burner wallet and local faucet.
- 🔐 **Integration with Wallet Providers**: Connect to different wallet providers and interact with the Arbitrum network.

![Debug Contracts tab](./packages/nextjs/public/debug-image.png)

## Requirements

Before you begin, you need to install the following tools:

- [Node (>= v20.18)](https://nodejs.org/en/download/)
- pnpm ([v9+](https://pnpm.io/))
- [Git](https://git-scm.com/downloads)
- [Docker](https://docs.docker.com/engine/install/)
- [Foundry Cast](https://getfoundry.sh/)
- [Solc (Solidity compiler)](https://docs.soliditylang.org/en/latest/installing-solidity.html)

> **Note: Windows Compatibility**
>
> Scaffold-Stylus currently does not support Windows natively. If you're using Windows, we recommend:
>
> - **Use WSL (Windows Subsystem for Linux)** - Install WSL2 and run Scaffold-Stylus within the Linux environment
> - **Switch to Linux or macOS** - For the best development experience
>
> For WSL setup, follow the [Microsoft WSL installation guide](https://docs.microsoft.com/en-us/windows/wsl/install).

## Quickstart

To get started with Scaffold-Stylus, follow the steps below:

### 1. Install Stylus tools

First, install Rust and Cargo:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

Check the [Rust installation guide](https://www.rust-lang.org/tools/install) for more information.

Then install the Stylus CLI tools.

> **⚠️ WARNING:** This project requires `cargo-stylus` version `0.10.8` and `rustc` version `1.91.0` (as pinned in `packages/stylus/contracts/rust-toolchain.toml`). Do NOT use `stylusup` to install Stylus tools, as it installs the latest versions which are incompatible with these pinned requirements.

```bash
cargo install --force --locked cargo-stylus@0.10.8
```

**Prerequisite:**

- `cargo-stylus` version `0.10.8`
- `rustc` version match with `packages/stylus/contracts/rust-toolchain.toml`

Set default `toolchain` match `rust-toolchain.toml` and add the `wasm32-unknown-unknown` build target to your Rust compiler:

```bash
rustup default 1.91.0
rustup target add wasm32-unknown-unknown --toolchain 1.91.0
```

You should now have it available as a Cargo subcommand:

```bash
cargo stylus --help
```

### 2. Create a new project (recommended)

Use the interactive setup to scaffold a new project:

```bash
npx create-stylus@latest
```

Then navigate into your project directory:

```bash
cd <project-name>
pnpm install
# Initialize submodules (required for Nitro dev node)
git submodule update --init --recursive
```

### 3. Clone this repo & install dependencies (alternative)

```bash
git clone https://github.com/Arb-Stylus/scaffold-stylus.git
cd scaffold-stylus
pnpm install
# Initialize submodules (required for Nitro dev node)
git submodule update --init --recursive
```

### 4. Run a local network

In your first terminal:

```bash
pnpm chain
```

This command starts a local Stylus-compatible network using the Nitro dev node script (`./nitro-devnode/run-dev-node.sh`). The network runs on your local machine and can be used for testing and development. You can customize the Nitro dev node configuration in the `nitro-devnode` submodule.

### 5. Deploy the contracts

In your second terminal:

```bash
pnpm run deploy:contracts --network arbitrumNitro
```

This command deploys all 7 MemoryChain contracts to the target network (CreditManager, UserRegistry, MemoryRegistry, AgentRegistry, ChatRegistry, ContextRegistry, AuditRegistry). After deployment it automatically:

1. Generates ABIs for all contracts
2. Writes addresses + ABIs to `deployedContracts.ts`
3. Initializes all contracts (`initialize()` + `CreditManager.initializeNetwork()`)
4. Authorizes cross-contract calls

The `--network` flag is **required**. Available options:
- `arbitrumNitro` — local Nitro dev node (default RPC: `http://localhost:8547`)
- `arbitrumSepolia` — Arbitrum Sepolia testnet
- `arbitrumOne` — Arbitrum One mainnet

**Deployment artifacts** are saved to `packages/stylus/deployments/<network>_<chainId>_latest.json` (e.g. `arbitrumNitro_412346_latest.json`). The Hono backend and the frontend import addresses/ABIs from there.

**Credentials** (in `packages/stylus/.env`):
- `PRIVATE_KEY_NITRO` / `PRIVATE_KEY_SEPOLIA` / `PRIVATE_KEY_MAINNET` — signer wallet per network. The deployer becomes the `admin` of all contracts, so it must hold ETH to pay gas (use a faucet on Sepolia).
- `TREASURY_SEPOLIA` / `TREASURY_MAINNET` — wallet receiving ETH from credit purchases (defaults to the deployer; Sepolia defaults to the MemoryChain treasury).
- `PRICE_PER_CREDIT_<NET>` — optional, defaults to `100000000000000` Wei (0.00001 ETH) per Memory Credit.

### 6. Start your NextJS app

In your third terminal:

```bash
pnpm start
```

Visit your app at: `http://localhost:3000`. The frontend auto-detects deployed contracts from `deployedContracts.ts` and generates the correct ABIs and addresses.

### 7. E2E Test

Navigate to `http://localhost:3000/e2e` to test the full flow:

1. Connect wallet
2. Buy Credits
3. Register User
4. Create Memory
5. Create Agent

All interactions use real on-chain contracts.

## Account Abstraction (ERC-4337) — production flow

On **Sepolia / Arbitrum One the user signs** (not the backend): each user owns a
`SimpleAccount` (v0.6) whose owner is a **session key**. The backend signs
UserOperations with that session key (stored AES-GCM encrypted in Redis) and
submits them to a bundler; **gas is paid by the user's smart account**.

Setup on a public network:

```bash
# 1. Deploy the MemoryChain contracts (see step 5)
pnpm run deploy:contracts --network arbitrumSepolia

# 2. Deploy the AA infra (canonical EntryPoint v0.6 + SimpleAccountFactory)
#    Requires PRIVATE_KEY_SEPOLIA with funds in packages/stylus/.env
cd packages/stylus/contracts/aa && ./script/deploy.sh sepolia

# 3. Bundler (Alto) pointing at Sepolia — set ALTO_EXECUTOR_PRIVATE_KEYS /
#    ALTO_UTILITY_PRIVATE_KEY (funded Sepolia key) in packages/stylus/aa/.env
cd packages/stylus/aa && docker compose -f docker-compose.sepolia.yml up -d
```

Backend env (`packages/hono/.env`) required in production:

```env
NODE_ENV=production
RPC_URL=https://sepolia-rollup.arbitrum.io/rpc
CHAIN_ID=421614
ENTRY_POINT_ADDRESS=0x78fea18e70c9372df8f52a60f8b3f81c79c87af5
FACTORY_ADDRESS=0xe9606ba1da696cd0fd14a4d195f50aecec2f1596
BUNDLER_URL=http://localhost:4337
REDIS_URL=redis://localhost:6379
SESSION_KEY_ENCRYPTION_KEY=<64 hex chars>
```

> Direcciones AA desplegadas en **Arbitrum Sepolia** (ver `contracts/aa/README.md`):
> EntryPoint `0x78fea18e…c87af5`, SimpleAccountFactory `0xe9606ba1…c2f1596`.
> Bundler Alto en Docker (`memorychain-alto-sepolia`) con `ALTO_SAFE_MODE=false`.

User flow: authenticate (SIWE) → `POST /session-keys/generate` (backend stores
the encrypted session key) → fund their smart account (send ETH from the main
wallet to `factory.getAddress(sessionKey)`) → every write is a UserOp signed
with the session key and paid from the smart account.

> ⚠️ La smart account necesita ETH para pagar el gas de los UserOps (los créditos
> MC no cubren el gas). Listados y balance se leen sobre el smart account del
> usuario (no la wallet) — ver `packages/hono/src/lib/resolve-account.ts`.

**Note:** `DEV_PRIVATE_KEY` is dev-only (backend signs everything on the local
Nitro node). Leave it unset in production.

### 7. Test your smart contract

```bash
pnpm stylus:test
```

## Development Workflow

- Edit your smart contracts `lib.rs` in `packages/stylus/contracts/<contract>/src`
- Edit your frontend in `packages/nextjs/app`
- Edit your deployment scripts in `packages/stylus/scripts`
- Update ABIs in `packages/stylus/scripts/generateabis.ts` if you change contract signatures

## Create Your Own Contract

Scaffold-Stylus enables you to create and deploy multiple contracts within a single project. Follow the steps below to create and deploy your own contracts.

### Step 1: Generate New Contract

Use the following command to create a new contract and customize it as needed:

```bash
pnpm new-module <contract-name>
```

The generated contract will be located in `packages/stylus/contracts/<contract-name>`.

**Workspace structure:** `packages/stylus/contracts` is a Cargo workspace with `members = ["*"]`. `pnpm new-module <name>` (via `scripts/new_module.sh`) scaffolds the new contract under `contracts/` — the glob auto-discovers it, no manual wiring needed.

### Step 2: Validate Your Contract Before Deployment

Before deploying, it's recommended to validate your contract size using `cargo stylus check`:

```bash
cd packages/stylus/contracts/<contract-name>
cargo stylus check
```

This command performs several important checks:

- **Contract size validation**: Ensures your contract doesn't exceed size limitations
- **WASM compilation**: Verifies your Rust code compiles to WebAssembly
- **Deployment hash computation**: Calculates the deployment hash
- **WASM data fee estimation**: Estimates the cost of deploying your contract

**Contract Size Indicators:**

- 🔴 **Red indicator**: Contract size exceeds limitations - **DO NOT DEPLOY**
- 🟡 **Yellow/🟢 Green indicator**: Contract size within acceptable limits - **OK to deploy**

> **Important:** When using constructors, error logs from constructor execution may not be visible. Consider using `initialize()` functions instead for better error visibility.

### Step 3: Deploy Your Contract

```bash
pnpm run deploy:contracts --network <network>
```

This command deploys the contract to the specified network. The `--network` flag is required.

**Available Options:**

- `--network <network>`: **Required** — Target network (`arbitrumNitro`, `arbitrumSepolia`, `arbitrum`)
- `--estimate-gas`: Only perform gas estimation without deploying
- `--max-fee=<maxFee>`: Set maximum fee per gas in gwei

**Note:** Deployment information is automatically saved in `packages/stylus/deployments` by default.

## Deploying to Other Networks

To deploy your contracts to other networks (other than the default local Nitro dev node), you'll need to configure your RPC endpoint and wallet credentials.

### Prerequisites

1. **Set the RPC URL**

   Configure your target network's RPC endpoint using the proper `RPC_URL_<network>` environment variable. You can set this in your shell or create a `.env` file (see `.env.example` for reference):

   ```env
   RPC_URL_SEPOLIA=https://your-network-rpc-url
   ```

   **Note:** If RPC URL is not provided, system will use default public RPC URL from that network

2. **Set the Private Key**

   For real deployments, you must provide your own wallet's private key. Set the `PRIVATE_KEY_<network>` environment variable:

   ```env
   PRIVATE_KEY_SEPOLIA=your_private_key_here
   ```

   **Security Note:** A development key is used by default when running the Nitro dev node locally (`PRIVATE_KEY_NITRO` in `.env`). For external deployments, you must provide your own private key (`PRIVATE_KEY_SEPOLIA`, etc.).

3. **Set the Account Address**

   Set the `ACCOUNT_ADDRESS_<network>`

   ```env
   ACCOUNT_ADDRESS_SEPOLIA=your_account_address_here
   ```

4. **Update Frontend Configuration**

   Open `packages/nextjs/scaffold.config.ts` and update the `targetNetworks` array to include your target chain. This ensures your frontend connects to the correct network and generates the proper ABI in `deployedContracts.ts`:

   ```ts
   import * as chains from "./utils/scaffold-stylus/supportedChains";
   // ...
   targetNetworks: [chains.arbitrumOne],
   ```

### Arbitrum Testnet Faucets (Optional)

For Arbitrum testnets, you may need testnet ETH to deploy contracts. You can obtain testnet tokens from these faucets:

- [Chainlink Faucet](https://faucets.chain.link/arbitrum-sepolia)
- [QuickNode Faucet](https://faucet.quicknode.com/arbitrum/sepolia)
- [Alchemy Faucet](https://sepoliafaucet.com/)

### Available Networks

This template supports Arbitrum networks only:

| Network | Chain ID | RPC URL | Use Case |
|---------|----------|---------|----------|
| `arbitrumNitro` | 412346 | `http://localhost:8547` | Local dev |
| `arbitrumSepolia` | 421614 | `https://sepolia-rollup.arbitrum.io/rpc` | Testnet |
| `arbitrumOne` | 42161 | `https://arb1.arbitrum.io/rpc` | Mainnet |

```bash
pnpm info:networks
```

This will show you all supported networks and their corresponding RPC endpoints.

### Deploy to Other Network (Non-Orbit Chains)

Once configured, deploy to your target network:

```bash
pnpm run deploy:contracts --network <network>
```

**Important Security Notes:**

- The values in `.env.example` provide a template for required environment variables
- **Always keep your private key secure and never commit it to version control**
- Consider using environment variable management tools for production deployments

### Deploy to Orbit Chains

Visit our [Deploy to Orbit chain documentation](https://arb-stylus.github.io/scaffold-stylus-docs/deploying/deploy-to-orbit-chains) for detailed guide

## Verify your contract (Highly Experimental)

Visit our [Verify section](https://arb-stylus.github.io/scaffold-stylus-docs/recipes/verify-contract-custom-chain)

## 🛠️ Troubleshooting Common Issues

Visit our [Troubleshooting section](https://arb-stylus.github.io/scaffold-stylus-docs/quick-start/troubleshooting)

---

## Documentation

Visit our [docs](https://arb-stylus.github.io/scaffold-stylus-docs/) to learn how to start building with Scaffold-Stylus.

To learn more about its features, check out our [website](https://scaffoldstylus.quantum3labs.com/).

## Contributing to Scaffold-Stylus

We welcome contributions to Scaffold-Stylus!

Please see [CONTRIBUTING.md](https://github.com/Arb-Stylus/scaffold-stylus/blob/main/CONTRIBUTING.md) for more information and guidelines for contributing to Scaffold-Stylus.
