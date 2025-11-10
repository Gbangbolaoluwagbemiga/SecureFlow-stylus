# Deployment Guide for SecureFlow Stylus Contract

## Prerequisites

1. **Install Rust** (if not already installed):

   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source ~/.cargo/env
   ```

2. **Install cargo-stylus**:

   ```bash
   cargo install cargo-stylus
   ```

3. **Install Stylus CLI** (optional but recommended):
   ```bash
   npm install -g @arbitrum/stylus-cli
   ```

## Fix Compilation Errors First

Before deploying, you need to fix the compilation errors. The main issues are:

1. **Multiple `#[public]` impl blocks** - Stylus only allows ONE `#[public]` impl block per contract
2. **Missing imports** - All modules need proper imports for `U256`, `Address`, `String`, `Vec`
3. **Consolidate functions** - All public functions must be in a single `#[public]` impl block

## Current Status

The project structure is set up, but there are compilation errors that need to be fixed:

- ✅ Project structure created
- ✅ Modules organized
- ❌ Multiple `#[public]` impl blocks (needs consolidation)
- ❌ Missing imports in some modules
- ❌ Some functions not fully implemented

## Quick Fix Steps

1. **Consolidate all public functions** into `src/public.rs` (single `#[public]` impl block)
2. **Fix imports** in all modules to include `U256`, `Address`, `String`, `Vec`
3. **Remove `#[public]` from other modules** - only keep it in `public.rs`
4. **Test compilation**:
   ```bash
   cd stylus
   cargo check
   ```

## Build

Once errors are fixed:

```bash
cd stylus
cargo stylus build
```

## Deploy to Testnet

```bash
cargo stylus deploy \
  --private-key-path=/path/to/private_key.txt \
  --endpoint https://sepolia-rollup.arbitrum.io/rpc
```

## Deploy to Mainnet

```bash
cargo stylus deploy \
  --private-key-path=/path/to/private_key.txt \
  --endpoint https://arb1.arbitrum.io/rpc
```

## Initialize Contract

After deployment, call the `init` function:

```javascript
await contract.init(
  "0x0000000000000000000000000000000000000000", // monad_token
  "0xYourFeeCollectorAddress", // fee_collector
  0 // platform_fee_bp (0 = 0%)
);
```

## Note

The current code has compilation errors that need to be fixed before deployment. The main issue is that Stylus requires all public functions to be in a single `#[public]` impl block, but we currently have them split across multiple files.
