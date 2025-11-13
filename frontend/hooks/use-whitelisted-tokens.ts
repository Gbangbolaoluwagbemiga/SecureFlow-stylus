import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/web3-context";
import { CONTRACTS } from "@/lib/web3/config";
import { SECUREFLOW_ABI } from "@/lib/web3/abis";

interface WhitelistedToken {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  isWhitelisted: boolean;
}

export function useWhitelistedTokens() {
  const { wallet, getContract } = useWeb3();
  const [whitelistedTokens, setWhitelistedTokens] = useState<
    WhitelistedToken[]
  >([]);
  const [loading, setLoading] = useState(false);

  // Known tokens to check (including mock ERC20)
  const knownTokens = [
    {
      address: CONTRACTS.MOCK_ERC20,
      name: "Mock ERC20",
      symbol: "MOCK",
      decimals: 18,
    },
  ];

  useEffect(() => {
    if (wallet.isConnected) {
      checkWhitelistedTokens();
    }
  }, [wallet.isConnected]);

  const checkWhitelistedTokens = async () => {
    setLoading(true);
    try {
      const contract = getContract(CONTRACTS.SECUREFLOW_ESCROW, SECUREFLOW_ABI);
      if (!contract) {
        setLoading(false);
        return;
      }

      const tokens: WhitelistedToken[] = [];

      // Check each known token
      for (const token of knownTokens) {
        try {
          // First check if token contract exists on chain
          const { ethers } = await import("ethers");
          const provider = new ethers.JsonRpcProvider(
            "https://sepolia-rollup.arbitrum.io/rpc"
          );
          const code = await provider.getCode(token.address);

          // Skip if contract doesn't exist
          if (code === "0x" || code === "0x0") {
            console.warn(
              `Token ${token.address} does not exist on Arbitrum Sepolia - it may not be deployed yet`
            );
            continue;
          }

          // Check if token is whitelisted
          let isWhitelisted = false;
          try {
            isWhitelisted = await contract.call(
              "whitelistedTokens",
              token.address
            );
          } catch (error: any) {
            // Contract might not be initialized or there's an issue
            console.warn(
              `Error checking token ${token.address}:`,
              error.message || error
            );
            // Continue with next token
            continue;
          }

          // If whitelisted, try to get token info
          if (isWhitelisted) {
            try {
              const tokenContract = getContract(token.address, [
                "function name() view returns (string)",
                "function symbol() view returns (string)",
                "function decimals() view returns (uint8)",
              ]);

              if (tokenContract) {
                const [name, symbol, decimals] = await Promise.all([
                  tokenContract.call("name").catch(() => token.name),
                  tokenContract.call("symbol").catch(() => token.symbol),
                  tokenContract.call("decimals").catch(() => token.decimals),
                ]);

                tokens.push({
                  address: token.address,
                  name: name || token.name,
                  symbol: symbol || token.symbol,
                  decimals: Number(decimals) || token.decimals,
                  isWhitelisted: true,
                });
              } else {
                tokens.push({
                  ...token,
                  isWhitelisted: true,
                });
              }
            } catch (error) {
              // If we can't get token info, still add it if whitelisted
              tokens.push({
                ...token,
                isWhitelisted: true,
              });
            }
          }
        } catch (error) {
          console.error(`Error checking token ${token.address}:`, error);
        }
      }

      setWhitelistedTokens(tokens);
    } catch (error) {
      console.error("Error checking whitelisted tokens:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkTokenWhitelisted = async (
    tokenAddress: string
  ): Promise<boolean> => {
    if (tokenAddress === "0x0000000000000000000000000000000000000000") {
      return true; // Native ETH is always allowed
    }

    try {
      const contract = getContract(CONTRACTS.SECUREFLOW_ESCROW, SECUREFLOW_ABI);
      if (!contract) return false;

      const isWhitelisted = await contract.call(
        "whitelistedTokens",
        tokenAddress
      );
      return Boolean(isWhitelisted);
    } catch (error) {
      console.error("Error checking if token is whitelisted:", error);
      return false;
    }
  };

  return {
    whitelistedTokens,
    loading,
    checkTokenWhitelisted,
    refresh: checkWhitelistedTokens,
  };
}
