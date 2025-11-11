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
      // Use a timeout to debounce and avoid multiple simultaneous requests
      const timeoutId = setTimeout(() => {
        // Check existing accounts to sync with Web3 context
        window.ethereum.request({ method: "eth_accounts" }).catch(() => {
          // Ignore errors - this is just a sync check
        });

        // Ensure we're on Arbitrum Sepolia after connection
        const checkAndSwitchNetwork = async () => {
          try {
            const chainId = await window.ethereum.request({
              method: "eth_chainId",
            });
            const chainIdNumber = Number.parseInt(chainId, 16);
            const targetChainId = Number.parseInt(ARBITRUM_SEPOLIA.chainId, 16);

            if (chainIdNumber !== targetChainId) {
              // Automatically switch/add Arbitrum Sepolia network
              await switchToArbitrumSepolia();
            }
          } catch (error) {
            // Silently fail - network switching is not critical
            console.debug("Network check/switching:", error);
          }
        };

        // Wait a bit for the connection to fully establish
        setTimeout(checkAndSwitchNetwork, 1000);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [isConnected, address, switchToArbitrumSepolia]);

  return { open, address, isConnected };
}
