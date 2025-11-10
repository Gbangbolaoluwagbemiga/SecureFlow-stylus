# SecureFlow Stylus Conversion Guide

This document describes the conversion of SecureFlow from Solidity to Stylus (Rust/WASM) for Arbitrum.

## Project Structure

```
stylus/
├── Cargo.toml          # Rust project configuration
├── README.md           # Stylus-specific documentation
└── src/
    └── lib.rs          # Main contract implementation
```

## Key Changes from Solidity

### 1. Storage

- Solidity mappings → Stylus `mapping` in `sol_storage!` macro
- Arrays → Stylus `StorageVec` or Rust `Vec` depending on use case
- Structs → Defined in `sol_storage!` macro

### 2. Functions

- `external` → `#[public]` attribute
- `view` → Read-only functions (no `&mut self`)
- `payable` → Functions that accept native tokens via `msg::value()`

### 3. Error Handling

- Solidity `require` → Rust `Result<T>` with custom `Error` enum
- Errors must be tuple variants with String messages

### 4. Token Transfers

- Native: `evm::send(to, amount)`
- ERC20: Direct `evm::call` with encoded function data

### 5. Initialization

- Solidity constructor → `init()` function
- Must be called after deployment

## Deployment

### Prerequisites

```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install cargo-stylus
cargo install cargo-stylus
```

### Build

```bash
cd stylus
cargo stylus build
```

### Deploy

```bash
cargo stylus deploy --endpoint <RPC_URL> --private-key <PRIVATE_KEY>
```

### Initialize

After deployment, call:

```rust
init(
    monad_token: Address,      // 0x0 for none
    fee_collector: Address,    // Fee collector
    platform_fee_bp: U256      // 0-1000 (0 = 0%)
)
```

## Frontend Integration

The Stylus contract is fully EVM-compatible, so the frontend can interact with it using standard ethers.js or web3.js libraries. Simply update the contract address in your frontend configuration.

### ABI Generation

The ABI is automatically generated during build:

```bash
cargo stylus build --features export-abi
```

The ABI will be in: `target/wasm32-unknown-unknown/release/secureflow.abi.json`

## Known Issues & Notes

1. **ERC20 Transfers**: The current implementation uses direct `evm::call` for ERC20 transfers. In production, consider using `stylus_sdk::erc20::Erc20Token` for better safety.

2. **Array Handling**: Some array operations may need optimization for gas efficiency.

3. **Error Messages**: All error variants require String parameters for SolidityError compatibility.

4. **Storage Arrays**: Dynamic arrays in storage use `StorageVec` which has different semantics than Solidity arrays.

## Testing

```bash
cargo test
```

## Performance Benefits

Stylus contracts offer:

- Lower gas costs
- Faster execution
- Better optimization opportunities
- Full EVM compatibility

## Migration Checklist

- [x] Convert all Solidity contracts to Rust
- [x] Implement all functions
- [x] Handle storage correctly
- [x] Implement error handling
- [x] Create deployment scripts
- [ ] Add comprehensive tests
- [ ] Optimize gas usage
- [ ] Update frontend integration
- [ ] Deploy to testnet
- [ ] Deploy to mainnet

## Support

For Stylus-specific questions, refer to:

- [Stylus Documentation](https://docs.arbitrum.io/stylus)
- [Stylus SDK](https://github.com/OffchainLabs/stylus-sdk-rs)

