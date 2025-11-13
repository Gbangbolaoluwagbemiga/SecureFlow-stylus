const hre = require("hardhat");
const { ethers } = require("ethers");

async function main() {
  console.log("🚀 Deploying Mock ERC20 Token to Arbitrum Sepolia...\n");

  // Arbitrum Sepolia RPC
  const RPC_URL =
    process.env.ARBITRUM_SEPOLIA_RPC ||
    "https://sepolia-rollup.arbitrum.io/rpc";

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH\n");

  // Deploy MockERC20
  console.log("📝 Deploying MockERC20 contract...");
  const MockERC20 = await hre.ethers.getContractFactory("MockERC20");

  const mockToken = await MockERC20.deploy(
    "Mock Token", // name
    "MOCK", // symbol
    hre.ethers.parseEther("1000000") // total supply: 1,000,000 tokens
  );

  await mockToken.waitForDeployment();
  const tokenAddress = await mockToken.getAddress();

  console.log("\n✅ Mock ERC20 Token deployed successfully!");
  console.log("Token Address:", tokenAddress);
  console.log("Token Name:", await mockToken.name());
  console.log("Token Symbol:", await mockToken.symbol());
  console.log(
    "Total Supply:",
    hre.ethers.formatEther(await mockToken.totalSupply()),
    "MOCK"
  );
  console.log("\n📋 View on Arbiscan:");
  console.log(`https://sepolia.arbiscan.io/address/${tokenAddress}`);

  // Mint some tokens to the deployer for testing
  console.log("\n💰 Minting 10,000 tokens to deployer for testing...");
  const mintAmount = hre.ethers.parseEther("10000");
  const mintTx = await mockToken.mint(deployer.address, mintAmount);
  await mintTx.wait();

  const deployerBalance = await mockToken.balanceOf(deployer.address);
  console.log(
    "Deployer balance:",
    hre.ethers.formatEther(deployerBalance),
    "MOCK"
  );

  console.log("\n📝 Next steps:");
  console.log(
    "1. Update frontend/lib/web3/config.ts with the new token address:"
  );
  console.log(`   MOCK_ERC20: "${tokenAddress}"`);
  console.log("2. Go to Admin page and whitelist this token");
  console.log("3. You can now use this token in escrows!");

  return {
    tokenAddress,
    name: await mockToken.name(),
    symbol: await mockToken.symbol(),
    totalSupply: await mockToken.totalSupply(),
  };
}

main()
  .then((result) => {
    console.log("\n✅ Deployment complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:", error);
    process.exit(1);
  });
