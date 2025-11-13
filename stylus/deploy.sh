#!/bin/bash

# Deployment script for SecureFlow Stylus Contract
# Usage: PRIVATE_KEY=your_key ./deploy.sh
# Or: export PRIVATE_KEY=your_key && ./deploy.sh

set -e

if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable is not set"
    echo "Usage: PRIVATE_KEY=your_key ./deploy.sh"
    echo "Or: export PRIVATE_KEY=your_key && ./deploy.sh"
    exit 1
fi
ENDPOINT="${RPC_URL:-https://sepolia-rollup.arbitrum.io/rpc}"
WALLET_ADDRESS="0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41"

# Ensure private key has 0x prefix if not present
if [[ ! "$PRIVATE_KEY" =~ ^0x ]]; then
    PRIVATE_KEY="0x$PRIVATE_KEY"
fi

echo "🚀 Deploying SecureFlow Stylus Contract to Arbitrum Sepolia..."
echo "📝 Wallet: $WALLET_ADDRESS"
echo "🌐 Endpoint: $ENDPOINT"
echo ""

# Deploy the contract
echo "📦 Deploying contract..."
DEPLOY_OUTPUT=$(cargo stylus deploy \
    --private-key "$PRIVATE_KEY" \
    --endpoint "$ENDPOINT" \
    2>&1)

echo "$DEPLOY_OUTPUT"

# Extract contract address from output
CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP '0x[a-fA-F0-9]{40}' | head -1)

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo "❌ Failed to extract contract address from deployment output"
    echo "Please check the output above and deploy manually"
    exit 1
fi

echo ""
echo "✅ Contract deployed successfully!"
echo "📍 Contract Address: $CONTRACT_ADDRESS"
echo ""
echo "🔧 Next steps:"
echo "1. Update frontend/lib/web3/config.ts with the new contract address"
echo "2. Initialize the contract by calling the 'init' function"
echo "3. Authorize arbiters from the Admin page"
echo ""
echo "To initialize, call:"
echo "  contract.init()"
echo ""
echo "Contract address saved to: deployed_address.txt"
echo "$CONTRACT_ADDRESS" > deployed_address.txt

