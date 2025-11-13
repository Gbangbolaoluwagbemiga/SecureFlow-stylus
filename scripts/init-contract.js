const hre = require("hardhat");

async function main() {
  console.log("🔧 Initializing SecureFlow Stylus Contract...\n");

  // Contract address on Arbitrum Sepolia
  const CONTRACT_ADDRESS = "0x7e7b5dbae3adb3d94a27dcfb383bdb98667145e6";

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners();
  console.log("Initializing with account:", deployer.address);

  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Load the contract ABI - we need the actual ABI from the contract
  // For Stylus contracts, init() takes no parameters
  const initInterface = new hre.ethers.Interface(["function init()"]);

  const initData = initInterface.encodeFunctionData("init");

  console.log("\n📝 Transaction details:");
  console.log("Contract:", CONTRACT_ADDRESS);
  console.log("Function: init()");
  console.log("Call data:", initData);

  // Check current owner before init
  try {
    const contract = new hre.ethers.Contract(
      CONTRACT_ADDRESS,
      ["function owner() view returns (address)"],
      deployer
    );
    const currentOwner = await contract.owner();
    console.log("Current owner:", currentOwner);
    if (currentOwner !== "0x0000000000000000000000000000000000000000") {
      console.log("⚠️  Contract already initialized!");
      return;
    }
  } catch (error) {
    console.log("Could not check owner (contract may not be deployed yet)");
  }

  // Send transaction
  console.log("\n⏳ Sending initialization transaction...");
  const tx = await deployer.sendTransaction({
    to: CONTRACT_ADDRESS,
    data: initData,
    gasLimit: 200000, // Increased gas limit
  });

  console.log("Transaction hash:", tx.hash);
  console.log("Waiting for confirmation...");
  console.log("View on Arbiscan:", `https://sepolia.arbiscan.io/tx/${tx.hash}`);

  const receipt = await tx.wait();

  if (receipt.status === 1) {
    console.log("\n✅ Contract initialized successfully!");
    console.log("Transaction hash:", receipt.transactionHash);
    console.log("Gas used:", receipt.gasUsed.toString());

    // Verify owner was set
    const contract = new hre.ethers.Contract(
      CONTRACT_ADDRESS,
      ["function owner() view returns (address)"],
      deployer
    );
    const newOwner = await contract.owner();
    console.log("New owner:", newOwner);
    console.log("Deployer address:", deployer.address);

    if (newOwner.toLowerCase() === deployer.address.toLowerCase()) {
      console.log("✅ Owner set correctly!");
    } else {
      console.log("⚠️  Warning: Owner mismatch!");
    }
  } else {
    console.log("❌ Transaction failed!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
