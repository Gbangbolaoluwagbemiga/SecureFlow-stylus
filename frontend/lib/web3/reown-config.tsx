"use client";

import React, { useEffect, useState } from "react";
import { createAppKit } from "@reown/appkit/react";
import { EthersAdapter } from "@reown/appkit-adapter-ethers";

// Import networks from @reown/appkit/networks
let arbitrumSepoliaNetwork: any = null;
let arbitrumNetwork: any = null;

try {
  const appKitNetworks = require("@reown/appkit/networks");
  arbitrumSepoliaNetwork = appKitNetworks.arbitrumSepolia;
  arbitrumNetwork = appKitNetworks.arbitrum;
  console.log("✅ Using network definitions from @reown/appkit/networks");
} catch (e) {
  // Networks not available from package, use manual config
  console.warn(
    "⚠️ Using manual network configuration (package networks not available)"
  );
}

// Get projectId from environment - use WALLETCONNECT_PROJECT_ID if available, fallback to REOWN_ID
const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
  process.env.NEXT_PUBLIC_REOWN_ID ||
  "1db88bda17adf26df9ab7799871788c4";

// Validate project ID
if (!projectId || projectId === "your_actual_project_id") {
  console.warn(
    "⚠️ WalletConnect Project ID not set. Please set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID in your .env file"
  );
}

// Define networks - prefer package networks if available, otherwise use manual config
const networks =
  arbitrumSepoliaNetwork && arbitrumNetwork
    ? [arbitrumSepoliaNetwork, arbitrumNetwork] // Use package networks
    : [
        // Manual network configuration (fallback)
        {
          id: 421614, // Arbitrum Sepolia Testnet
          name: "Arbitrum Sepolia",
          currency: "ETH",
          explorerUrl: "https://sepolia.arbiscan.io",
          rpcUrl: "https://sepolia-rollup.arbitrum.io/rpc",
        },
        {
          id: 42161, // Arbitrum One Mainnet
          name: "Arbitrum One",
          currency: "ETH",
          explorerUrl: "https://arbiscan.io",
          rpcUrl: "https://arb1.arbitrum.io/rpc",
        },
      ];

// Default network (Arbitrum Sepolia for testnet)
const defaultNetwork = arbitrumSepoliaNetwork || networks[0];

// Global flag to ensure AppKit is only initialized once
let appKitInitialized = false;

// Initialize AppKit - must be called before any useAppKit hooks
const initializeAppKit = () => {
  if (appKitInitialized || typeof window === "undefined") {
    return;
  }

  // Prevent conflicts with existing window.ethereum (e.g., MetaMask)
  // AppKit should not try to redefine window.ethereum if it already exists
  const hasExistingEthereum =
    window.ethereum &&
    (window.ethereum.isMetaMask ||
      window.ethereum.isCoinbaseWallet ||
      window.ethereum.providers?.length > 0);

  // Create metadata with current origin (dynamic)
  const metadata = {
    name: "SecureFlow",
    description: "Secure Escrow Platform for Freelancers",
    url: window.location.origin, // Use actual current origin
    icons: [
      window.location.origin + "/secureflow-logo.svg",
      window.location.origin + "/secureflow-favicon.svg",
    ],
  };

  // Create the AppKit instance
  try {
    createAppKit({
      adapters: [new EthersAdapter()],
      metadata,
      networks,
      defaultNetwork, // Set default network to Arbitrum Sepolia
      projectId,
      features: {
        analytics: false, // Disabled to avoid ERR_BLOCKED_BY_CLIENT from ad blockers
      },
      themeMode: "dark", // Match your app theme
      allWallets: "SHOW", // Ensure all wallets are visible
    });
    appKitInitialized = true;
    console.log("✅ AppKit initialized successfully");

    if (hasExistingEthereum) {
      console.log("ℹ️ Existing wallet provider detected, AppKit will use it");
    }
  } catch (error: any) {
    // If AppKit is already initialized, that's fine
    if (
      error?.message?.includes("already") ||
      error?.message?.includes("initialized") ||
      error?.message?.includes("redefine")
    ) {
      appKitInitialized = true;
      console.log("✅ AppKit already initialized");
    } else {
      console.error("❌ AppKit initialization error:", error);
      // Don't throw - allow app to continue without AppKit
    }
  }
};

// Don't initialize at module level - only initialize in the AppKit component
// This prevents multiple initialization attempts and conflicts

export function AppKit({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Only initialize once on mount (handles SSR/hydration)
    // Use a small delay to ensure DOM is ready and avoid conflicts
    const timer = setTimeout(() => {
      try {
        initializeAppKit();
      } catch (error) {
        console.error("Failed to initialize AppKit:", error);
      }
      setMounted(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Only render children after mount (client-side only)
  // This ensures AppKit is initialized before any child uses useAppKit
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}
