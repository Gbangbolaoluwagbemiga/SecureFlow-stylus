"use client";

import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/contexts/web3-context";
import { useAppKit, useAppKitAccount } from "@reown/appkit/react";
import { useToast } from "@/hooks/use-toast";
import { useState, useRef } from "react";

export function WalletButton() {
  const { wallet } = useWeb3();
  const { open } = useAppKit();
  const { address: appKitAddress, isConnected: appKitConnected } =
    useAppKitAccount();
  const { toast } = useToast();
  const [networkIconError, setNetworkIconError] = useState(false);
  const [walletIconError, setWalletIconError] = useState(false);
  const connectingRef = useRef(false);
  const lastDeclinedRef = useRef<number>(0);

  const handleClick = async () => {
    // If already connecting, ignore
    if (connectingRef.current) {
      return;
    }

    // If AppKit says we're connected, just open the modal (shows account info)
    if (appKitConnected && appKitAddress) {
      if (open) {
        await open();
      }
      return;
    }

    // Check if we recently got a declined error - wait 3 seconds before retry
    const timeSinceDeclined = Date.now() - lastDeclinedRef.current;
    if (timeSinceDeclined < 3000) {
      toast({
        title: "Please wait",
        description:
          "Please wait a moment before trying again. Check MetaMask for any pending requests.",
        variant: "default",
      });
      return;
    }

    connectingRef.current = true;

    try {
      if (!open) {
        toast({
          title: "Connection unavailable",
          description:
            "Wallet connection is not available. Please refresh the page.",
          variant: "destructive",
        });
        return;
      }

      // Open AppKit - it will handle the connection flow
      await open();
    } catch (error: any) {
      // Handle specific error codes
      if (error?.code === 4001) {
        // User cancelled - don't show error, just log
        console.log("ℹ️ User cancelled connection");
      } else if (
        error?.message?.toLowerCase().includes("pending") ||
        error?.message?.toLowerCase().includes("active") ||
        error?.message?.toLowerCase().includes("declined") ||
        error?.message?.toLowerCase().includes("previous request")
      ) {
        // Connection declined due to pending request
        lastDeclinedRef.current = Date.now();
        toast({
          title: "Connection declined",
          description:
            "A previous connection request is still active in MetaMask. Please check MetaMask, approve or reject the pending request, then try again in a few seconds.",
          variant: "destructive",
        });
      } else {
        // Other errors
        console.error("❌ Wallet connection error:", error);
        toast({
          title: "Connection failed",
          description:
            error?.message || "Failed to connect wallet. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      // Reset after a short delay
      setTimeout(() => {
        connectingRef.current = false;
      }, 500);
    }
  };

  if (!wallet.isConnected || !wallet.address) {
    return (
      <Button onClick={handleClick} variant="default">
        Connect Wallet
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      variant="secondary"
      className="font-mono flex items-center gap-2 px-3 md:px-4 py-2 bg-muted/50 hover:bg-muted/70 border border-border/40 max-w-[160px] md:max-w-none"
    >
      {/* Desktop/tablet: show network + balance + avatar */}
      <div className="hidden md:flex items-center gap-2">
        {/* Dynamic network icon (WalletConnect chain icons) */}
        <div className="w-4 h-4 rounded-full overflow-hidden">
          {!networkIconError ? (
            <img
              src={`https://assets.walletconnect.com/chains/${wallet.chainId}.png`}
              alt="Network"
              className="w-full h-full object-cover"
              onError={() => setNetworkIconError(true)}
            />
          ) : (
            <div className="w-full h-full bg-blue-500 rounded-full flex items-center justify-center">
              <div className="w-2 h-2 bg-white rounded-full"></div>
            </div>
          )}
        </div>

        <span>{Number(wallet.balance).toFixed(3)} ETH</span>
        <span className="text-muted-foreground">·</span>

        {/* Dynamic wallet avatar (Effigy gradient orb) */}
        <div className="w-4 h-4 rounded-full overflow-hidden">
          {!walletIconError ? (
            <img
              src={`https://effigy.im/a/${wallet.address}.svg`}
              alt="Wallet"
              className="w-full h-full object-cover"
              onError={() => setWalletIconError(true)}
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-blue-400 to-blue-600 rounded-full"></div>
          )}
        </div>
      </div>

      {/* Always show just the address on mobile; also show on desktop after icons */}
      <span className="truncate md:ml-1" title={wallet.address}>
        {wallet.address.slice(0, 6)}…{wallet.address.slice(-4)}
      </span>
    </Button>
  );
}
