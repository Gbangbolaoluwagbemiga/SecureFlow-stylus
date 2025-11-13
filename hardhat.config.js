require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.19",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          viaIR: true,
        },
      },
      {
        version: "0.8.26",
        settings: {
          optimizer: {
            enabled: true,
            runs: 1,
          },
          viaIR: true,
        },
      },
    ],
  },
  networks: {
    hardhat: {
      chainId: 1337,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    base: {
      url: "https://mainnet.base.org",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 8453, // Base mainnet chain ID
      gas: 2000000, // Further reduced gas limit
      gasPrice: 1000000, // 0.001 gwei (minimum gas price)
    },
    baseTestnet: {
      url: process.env.BASE_TESTNET_RPC_URL || "https://sepolia.base.org",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 84532, // Base testnet chain ID
      gas: 8000000, // Higher gas limit
      gasPrice: 1000000000, // 1 gwei
    },
    monad: {
      url: process.env.MONAD_RPC_URL || "https://testnet-rpc.monad.xyz",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 10143, // Monad testnet chain ID
      gas: 3000000, // Gas limit
      maxFeePerGas: 10000000000, // 10 gwei
      maxPriorityFeePerGas: 1000000000, // 1 gwei
    },
    arbitrumSepolia: {
      url:
        process.env.ARBITRUM_SEPOLIA_RPC ||
        "https://sepolia-rollup.arbitrum.io/rpc",
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
      chainId: 421614, // Arbitrum Sepolia testnet chain ID
      gas: 8000000,
      gasPrice: 100000000, // 0.1 gwei
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  etherscan: {
    apiKey: process.env.BASESCAN_API_KEY || "YourBaseScanAPIKey",
    customChains: [
      {
        network: "base",
        chainId: 8453,
        urls: {
          apiURL: "https://api.basescan.org/v2/api",
          browserURL: "https://basescan.org",
        },
      },
      {
        network: "baseSepolia",
        chainId: 84532,
        urls: {
          apiURL: "https://api-sepolia.basescan.org/v2/api",
          browserURL: "https://sepolia.basescan.org",
        },
      },
    ],
  },
};
