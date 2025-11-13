// Script to initialize the deployed contract
// Usage: PRIVATE_KEY=your_key node init-contract.js <CONTRACT_ADDRESS>
// Or: export PRIVATE_KEY=your_key && node init-contract.js <CONTRACT_ADDRESS>

const { ethers } = require("ethers");

const CONTRACT_ADDRESS = process.argv[2];
let PRIVATE_KEY = process.env.PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || "https://sepolia-rollup.arbitrum.io/rpc";

// Ensure private key has 0x prefix if not present
if (PRIVATE_KEY && !PRIVATE_KEY.startsWith("0x")) {
  PRIVATE_KEY = "0x" + PRIVATE_KEY;
}

if (!CONTRACT_ADDRESS) {
  console.error(
    "Usage: PRIVATE_KEY=your_key node init-contract.js <CONTRACT_ADDRESS>"
  );
  console.error(
    "Or: export PRIVATE_KEY=your_key && node init-contract.js <CONTRACT_ADDRESS>"
  );
  process.exit(1);
}

if (!PRIVATE_KEY) {
  console.error("Error: PRIVATE_KEY environment variable is not set");
  console.error(
    "Usage: PRIVATE_KEY=your_key node init-contract.js <CONTRACT_ADDRESS>"
  );
  process.exit(1);
}

// Minimal ABI for init function
const ABI = [
  {
    inputs: [],
    name: "init",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

async function initContract() {
  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, wallet);

    console.log("🔧 Initializing contract...");
    console.log("📍 Contract:", CONTRACT_ADDRESS);
    console.log("👤 Wallet:", wallet.address);

    const tx = await contract.init();
    console.log("⏳ Transaction sent:", tx.hash);

    const receipt = await tx.wait();
    console.log("✅ Contract initialized!");
    console.log("📝 Block:", receipt.blockNumber);
    console.log("⛽ Gas used:", receipt.gasUsed.toString());
  } catch (error) {
    console.error("❌ Error initializing contract:", error.message);
    process.exit(1);
  }
}

initContract();
