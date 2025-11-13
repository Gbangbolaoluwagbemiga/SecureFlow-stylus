# Deployment Instructions for Fixed Contract

## What Was Fixed

The contract had a bug where it checked `beneficiary == depositor` before determining if it was an open job. This caused open jobs (with zero address beneficiary) to fail. The fix moves the `is_open_job` check before the `beneficiary == depositor` validation.

## Deployment Steps

### 1. Set Up Environment Variables

Create a `.env` file (or export the variable):

```bash
cd stylus
export PRIVATE_KEY=your_private_key_here
```

Or create a `.env` file:

```bash
echo "PRIVATE_KEY=your_private_key_here" > .env
source .env
```

**Important:** Use the private key for wallet `0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41`. The script will automatically add the `0x` prefix if missing.

### 2. Deploy the Contract

Run the deployment script:

```bash
./deploy.sh
```

Or with inline environment variable:

```bash
PRIVATE_KEY=your_key ./deploy.sh
```

The script will:

- Deploy the contract to Arbitrum Sepolia
- Save the contract address to `deployed_address.txt`

### 3. Update Frontend Config

After deployment, update the frontend config with the new contract address:

```bash
node update-config.js <CONTRACT_ADDRESS>
```

Or manually update `frontend/lib/web3/config.ts`:

- Replace `SECUREFLOW_ESCROW_TESTNET` with the new address
- Replace `SECUREFLOW_ESCROW` with the new address

### 4. Initialize the Contract

Initialize the contract (this sets you as the owner):

```bash
node init-contract.js <CONTRACT_ADDRESS>
```

The script will use the `PRIVATE_KEY` environment variable you set earlier.

This will:

- Call the `init()` function
- Set you as the contract owner
- Initialize all constants

### 5. Authorize Arbiters

After initialization, go to the Admin page in the frontend and:

1. Authorize at least one arbiter (you can authorize yourself: `0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41`)
2. Whitelist tokens if needed

### 6. Test Open Job Creation

Try creating an open job escrow again. It should work now!

## Verification

After deployment, verify:

1. Contract is deployed and initialized
2. You are the owner (check Admin page)
3. You can authorize arbiters
4. You can create open job escrows

## Notes

- The contract address will be different from the old one
- All existing escrows on the old contract will remain there
- You'll need to update the frontend to point to the new contract
- Make sure you have enough ETH for deployment and initialization gas fees
