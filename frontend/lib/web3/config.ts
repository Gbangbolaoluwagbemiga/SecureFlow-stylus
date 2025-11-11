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
  SECUREFLOW_ESCROW_TESTNET: "0x7e7b5dbae3adb3d94a27dcfb383bdb98667145e6",
  MOCK_TOKEN_TESTNET: "0x7659C2E485D3E29dBC36f7E11de9E633ED1FDa06",

  // Default contracts (used by frontend)
  SECUREFLOW_ESCROW: "0x7e7b5dbae3adb3d94a27dcfb383bdb98667145e6",
  USDC: "0x7659C2E485D3E29dBC36f7E11de9E633ED1FDa06",
  MOCK_ERC20: "0x7659C2E485D3E29dBC36f7E11de9E633ED1FDa06",

  ARBISCAN_API_KEY: "C9CFD5REN63QS5AESUEF3WJ6EPPWJ2UN9R",
};
