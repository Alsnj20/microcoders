# MemoryChain — Account Abstraction (ERC-4337 v0.6)

Proyecto Foundry con la infraestructura de Account Abstraction para que el
usuario firme sus acciones a través de un **smart account** (session keys) en
testnet/mainnet.

- `lib/account-abstraction` — pinned a **v0.6.0** (eth-infinitism)
- `lib/openzeppelin-contracts` — pinned a **v4.9.3** (requerido por v0.6.0)
- `script/DeployAA.s.sol` — despliega `SimpleAccountFactory` (+ `EntryPoint` en Nitro).
  En Sepolia/One usa el **EntryPoint canónico v0.6** (`0x5FF137D4b0FDCD49DcA30c7CF57C578A026d2789`).

## Deploy

```bash
./script/deploy.sh nitro      # Node local — despliega EntryPoint + factory
./script/deploy.sh sepolia    # Testnet — EntryPoint canónico + factory
./script/deploy.sh one        # Mainnet — EntryPoint canónico + factory
```

Guarda las direcciones en `packages/stylus/aa/.env`, `packages/nextjs/.env.local`
(`NEXT_PUBLIC_SIMPLE_ACCOUNT_FACTORY_ADDRESS`) y `packages/hono/.env`
(`FACTORY_ADDRESS`, `ENTRY_POINT_ADDRESS`, `CHAIN_ID`).

### Desplegado en Arbitrum Sepolia

| Contrato | Dirección |
|---|---|
| EntryPoint | `0x78fea18e70c9372df8f52a60f8b3f81c79c87af5` |
| SimpleAccountFactory | `0xe9606ba1da696cd0fd14a4d195f50aecec2f1596` |

> Artefactos: `broadcast/DeployAA.s.sol/421614/run-1786544235796.json`
> (y `run-latest.json`, idéntico). Los runs anteriores fueron eliminados.

---

# Foundry

**Foundry is a blazing fast, portable and modular toolkit for Ethereum application development written in Rust.**

Foundry consists of:

- **Forge**: Ethereum testing framework (like Truffle, Hardhat and DappTools).
- **Cast**: Swiss army knife for interacting with EVM smart contracts, sending transactions and getting chain data.
- **Anvil**: Local Ethereum node, akin to Ganache, Hardhat Network.
- **Chisel**: Fast, utilitarian, and verbose solidity REPL.

## Documentation

https://book.getfoundry.sh/

## Usage

### Build

```shell
$ forge build
```

### Test

```shell
$ forge test
```

### Format

```shell
$ forge fmt
```

### Gas Snapshots

```shell
$ forge snapshot
```

### Anvil

```shell
$ anvil
```

### Deploy

```shell
$ forge script script/Counter.s.sol:CounterScript --rpc-url <your_rpc_url> --private-key <your_private_key>
```

### Cast

```shell
$ cast <subcommand>
```

### Help

```shell
$ forge --help
$ anvil --help
$ cast --help
```
