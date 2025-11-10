const hre = require("hardhat");
const fs = require("fs");
require("dotenv").config();

async function main() {
  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();

  console.log("🚀 Deploying contracts to", hre.network.name);
  console.log("📝 Deployer address:", deployer.address);

  // Use USDC on Base mainnet or deploy MockERC20 for testing
  let tokenAddress;
  let tokenName;
  let tokenAbi;

  if (hre.network.name === "base") {
    // USDC on Base mainnet: 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
    tokenAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    tokenName = "USDC";
    console.log("✅ Using USDC on Base mainnet:", tokenAddress);
  } else {
    // Deploy MockERC20 token for testing on other networks
    console.log("\n📦 Deploying MockERC20 token...");
    const MockERC20 = await hre.ethers.getContractFactory("MockERC20");
    const mockToken = await MockERC20.deploy(
      "Mock Token",
      "MTK",
      hre.ethers.parseEther("1000000")
    );
    await mockToken.waitForDeployment();
    tokenAddress = await mockToken.getAddress();
    tokenName = "MockERC20";
    tokenAbi = mockToken.interface.format("json");
    console.log("✅ MockERC20 deployed to:", tokenAddress);
  }

  // Deploy SecureFlow
  console.log("\n🔒 Deploying SecureFlow...");
  const SecureFlow = await hre.ethers.getContractFactory("SecureFlow");

  // Constructor parameters: tokenAddress, feeCollector, platformFeeBP
  const feeCollector = deployer.address; // Use deployer as fee collector for now
  const platformFeeBP = 0; // 0% fees for hackathon demo

  const secureFlow = await SecureFlow.deploy(
    tokenAddress, // token address (USDC on Base or MockERC20 on testnets)
    feeCollector, // feeCollector
    platformFeeBP // platformFeeBP
  );
  await secureFlow.waitForDeployment();

  // Authorize some arbiters for testing
  const arbiters = [
    "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41", // Your arbiter address
    "0xF1E430aa48c3110B2f223f278863A4c8E2548d8C", // Another arbiter address
  ];

  for (const arbiterAddress of arbiters) {
    await secureFlow.authorizeArbiter(arbiterAddress);
  }

  // Whitelist the token
  await secureFlow.whitelistToken(tokenAddress);

  // Get contract info
  const contractInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId,
    deployer: deployer.address,
    contracts: {
      SecureFlow: await secureFlow.getAddress(),
      Token: tokenAddress,
    },
    features: [
      "🚀 MODULAR ARCHITECTURE - Clean separation of concerns",
      "⚖️ MULTI-ARBITER CONSENSUS - Quorum-based voting",
      "🏆 REPUTATION SYSTEM - Anti-gaming guards",
      "📊 JOB APPLICATIONS - Pagination support",
      "🔒 ENTERPRISE SECURITY - Modular design",
      "💰 NATIVE & ERC20 SUPPORT - Permit integration",
      "⏰ AUTO-APPROVAL - Dispute window management",
      "🛡️ ANTI-GAMING - Minimum value thresholds",
      "📈 SCALABLE - Gas optimized modular design",
    ],
    deploymentTime: new Date().toISOString(),
  };

  // Save deployment info
  const deploymentInfo = {
    ...contractInfo,
    abi: secureFlow.interface.format("json"),
    tokenAbi: tokenAbi || null, // Only for MockERC20 deployments
  };

  fs.writeFileSync(
    "deployed.json",
    JSON.stringify(
      deploymentInfo,
      (key, value) => (typeof value === "bigint" ? value.toString() : value),
      2
    )
  );

  console.log("\n🎉 Deployment completed successfully!");
  console.log("📄 SecureFlow deployed to:", await secureFlow.getAddress());
  console.log("💰 Token address:", tokenAddress, `(${tokenName})`);
  console.log("📊 Network:", hre.network.name);
  console.log("🔗 Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  console.log("📝 Deployment info saved to deployed.json");
}

main()
  .then(() => {
    console.log("✅ Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    console.error("Error details:", error.message);
    console.error("Stack trace:", error.stack);
    process.exit(1);
  });
