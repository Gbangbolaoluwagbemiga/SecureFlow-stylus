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
  } catch (error: any) {
    // If AppKit is already initialized, that's fine
    if (
      error?.message?.includes("already") ||
      error?.message?.includes("initialized")
    ) {
      appKitInitialized = true;
      console.log("✅ AppKit already initialized");
    } else {
      console.error("❌ AppKit initialization error:", error);
      // Don't throw - allow app to continue without AppKit
    }
  }
};

// Initialize immediately if we're on the client
// This runs when the module is first imported on the client side
if (typeof window !== "undefined") {
  // Use requestIdleCallback or setTimeout to ensure DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeAppKit);
  } else {
    // DOM already loaded, initialize immediately
    initializeAppKit();
  }
}

export function AppKit({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Force initialization on mount (handles SSR/hydration)
    initializeAppKit();
    setMounted(true);
  }, []);

  // Only render children after mount (client-side only)
  // This ensures AppKit is initialized before any child uses useAppKit
  if (!mounted) {
    return null;
  }

  return <>{children}</>;
}
