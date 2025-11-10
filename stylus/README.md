# SecureFlow Stylus Contract

This is the Stylus (Rust/WASM) implementation of the SecureFlow escrow and marketplace platform for Arbitrum.

## Prerequisites

1. **Install Rust**:

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Install Cargo Stylus**:

   ```bash
   cargo install cargo-stylus
   ```

3. **Install Stylus CLI**:
   ```bash
   npm install -g @arbitrum/stylus-cli
   ```

## Building

```bash
cargo stylus build
```

This will compile the contract to WASM and generate the ABI.

## Deployment

### Deploy to Arbitrum Stylus Testnet

```bash
cargo stylus deploy --endpoint https://stylus-testnet.arbitrum.io/rpc
```

### Deploy to Arbitrum Stylus Mainnet

```bash
cargo stylus deploy --endpoint https://stylus-mainnet.arbitrum.io/rpc
```

## Contract Initialization

After deployment, initialize the contract with:

```rust
init(
    monad_token: Address,      // Token address (0x0 for none)
    fee_collector: Address,    // Fee collector address
    platform_fee_bp: U256      // Platform fee in basis points (0-1000)
)
```

## Features

- Full EVM compatibility
- Gas-efficient Rust implementation
- All original Solidity functionality preserved
- Escrow management
- Marketplace functionality
- Dispute resolution
- Reputation system

## Testing

```bash
cargo test
```

## ABI Generation

The ABI is automatically generated during build. It can be found in:

- `target/wasm32-unknown-unknown/release/secureflow.abi.json`

## Integration

The contract is fully compatible with existing frontend code. Simply update the contract address in your frontend configuration.

