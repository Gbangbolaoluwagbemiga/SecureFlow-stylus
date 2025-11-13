export const ARBITRUM_ONE = {
  chainId: "0xA4B1", // 42161 in hex (Arbitrum One Mainnet)
  chainName: "Arbitrum One",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://arb1.arbitrum.io/rpc"],
  blockExplorerUrls: ["https://arbiscan.io"],
};

export const ARBITRUM_SEPOLIA = {
  chainId: "0x66EEE", // 421614 in hex (Arbitrum Sepolia Testnet)
  chainName: "Arbitrum Sepolia",
  nativeCurrency: {
    name: "Ethereum",
    symbol: "ETH",
    decimals: 18,
  },
  rpcUrls: ["https://sepolia-rollup.arbitrum.io/rpc"],
  blockExplorerUrls: ["https://sepolia.arbiscan.io"],
};

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export const CONTRACTS = {
  // Arbitrum Sepolia Stylus - DEPLOYED ✅
  SECUREFLOW_ESCROW_TESTNET: "0x49879d6e369920c62bbb211826f21720bcabf696",
  MOCK_TOKEN_TESTNET: "0x2A202F611f5B60E14734872E580B72C62f9beffe", // Deployed on Arbitrum Sepolia

  // Default contracts (used by frontend)
  SECUREFLOW_ESCROW: "0x49879d6e369920c62bbb211826f21720bcabf696",
  USDC: "0x2A202F611f5B60E14734872E580B72C62f9beffe",
  MOCK_ERC20: "0x2A202F611f5B60E14734872E580B72C62f9beffe", // Deployed on Arbitrum Sepolia

  ARBISCAN_API_KEY: "C9CFD5REN63QS5AESUEF3WJ6EPPWJ2UN9R",
};
