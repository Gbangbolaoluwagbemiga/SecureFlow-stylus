// Script to update frontend config with new contract address
// Usage: node update-config.js <CONTRACT_ADDRESS>

const fs = require("fs");
const path = require("path");

const CONTRACT_ADDRESS = process.argv[2];

if (!CONTRACT_ADDRESS || !/^0x[a-fA-F0-9]{40}$/.test(CONTRACT_ADDRESS)) {
  console.error("Usage: node update-config.js <CONTRACT_ADDRESS>");
  console.error(
    "Example: node update-config.js 0x1234567890abcdef1234567890abcdef12345678"
  );
  process.exit(1);
}

const configPath = path.join(__dirname, "../frontend/lib/web3/config.ts");

try {
  let config = fs.readFileSync(configPath, "utf8");

  // Update both SECUREFLOW_ESCROW_TESTNET and SECUREFLOW_ESCROW
  config = config.replace(
    /SECUREFLOW_ESCROW_TESTNET: "0x[a-fA-F0-9]{40}"/,
    `SECUREFLOW_ESCROW_TESTNET: "${CONTRACT_ADDRESS.toLowerCase()}"`
  );
  config = config.replace(
    /SECUREFLOW_ESCROW: "0x[a-fA-F0-9]{40}"/,
    `SECUREFLOW_ESCROW: "${CONTRACT_ADDRESS.toLowerCase()}"`
  );

  fs.writeFileSync(configPath, config, "utf8");

  console.log("✅ Updated frontend/lib/web3/config.ts");
  console.log(`📍 New contract address: ${CONTRACT_ADDRESS.toLowerCase()}`);
} catch (error) {
  console.error("❌ Error updating config:", error.message);
  process.exit(1);
}

