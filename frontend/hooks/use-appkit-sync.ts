"use client";

import { useEffect } from "react";
import { useAppKit } from "@reown/appkit/react";
import { useWeb3 } from "@/contexts/web3-context";
import { ARBITRUM_SEPOLIA } from "@/lib/web3/config";

export function useAppKitSync() {
  const { open, address, isConnected } = useAppKit();
  const { switchToArbitrumSepolia } = useWeb3();

  // This hook syncs AppKit with the app and ensures correct network
  // The Web3 context will pick up the connection via window.ethereum

  useEffect(() => {
    if (
      isConnected &&
      address &&
      typeof window !== "undefined" &&
      window.ethereum
    ) {
      // Use a longer timeout to ensure AppKit connection is fully established
      // This prevents conflicts with other connection attempts
      const timeoutId = setTimeout(() => {
        // Only sync if window.ethereum is available and not in a pending state
        // Use eth_accounts (read-only) instead of eth_requestAccounts to avoid new prompts
        window.ethereum
          .request({ method: "eth_accounts" })
          .then((accounts: string[]) => {
            // Only proceed if we have accounts and they match AppKit's address
            if (
              accounts.length > 0 &&
              accounts[0].toLowerCase() === address.toLowerCase()
            ) {
              // Ensure we're on Arbitrum Sepolia after connection
              // But wait a bit longer to avoid conflicts
              setTimeout(async () => {
                try {
                  const chainId = await window.ethereum.request({
                    method: "eth_chainId",
                  });
                  const chainIdNumber = Number.parseInt(chainId, 16);
                  const targetChainId = Number.parseInt(
                    ARBITRUM_SEPOLIA.chainId,
                    16
                  );

                  if (chainIdNumber !== targetChainId) {
                    // Automatically switch/add Arbitrum Sepolia network
                    await switchToArbitrumSepolia();
                  }
                } catch (error) {
                  // Silently fail - network switching is not critical
                  console.debug("Network check/switching:", error);
                }
              }, 2000); // Wait 2 seconds before network check to avoid conflicts
            }
          })
          .catch(() => {
            // Ignore errors - this is just a sync check
          });
      }, 500); // Increased delay to ensure connection is fully established

      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, address, switchToArbitrumSepolia]);

  return { open, address, isConnected };
}
