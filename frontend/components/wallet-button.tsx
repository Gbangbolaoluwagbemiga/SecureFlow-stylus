"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWeb3 } from "@/contexts/web3-context";
import { useState } from "react";
import { LogOut, Copy, Check, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function WalletButton() {
  const { wallet, connectWallet, disconnectWallet, refreshBalance } = useWeb3();
  const { toast } = useToast();
  const [networkIconError, setNetworkIconError] = useState(false);
  const [walletIconError, setWalletIconError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleClick = async () => {
    if (wallet.isConnected) {
      // If connected, the dropdown will handle it
      return;
    }

    // Simple direct connection - just like the reference repo
    await connectWallet();
  };

  const handleDisconnect = () => {
    disconnectWallet();
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const handleCopyAddress = async () => {
    if (wallet.address) {
      await navigator.clipboard.writeText(wallet.address);
      setCopied(true);
      toast({
        title: "Address copied",
        description: "Wallet address copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSwitchAccount = async () => {
    if (typeof window !== "undefined" && window.ethereum) {
      try {
        // Request account switch - this will trigger accountsChanged event
        await window.ethereum.request({
          method: "wallet_requestPermissions",
          params: [{ eth_accounts: {} }],
        });
      } catch (error: any) {
        if (error.code !== 4001) {
          toast({
            title: "Error",
            description: "Failed to switch account",
            variant: "destructive",
          });
        }
      }
    }
  };

  const handleRefreshBalance = async () => {
    setRefreshing(true);
    try {
      await refreshBalance();
      toast({
        title: "Balance refreshed",
        description: "Your wallet balance has been updated",
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: "Failed to refresh balance. Please try again.",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          className="font-mono flex items-center gap-2 px-3 md:px-4 py-2 bg-muted/50 hover:bg-muted/70 border border-border/40 max-w-[160px] md:max-w-none"
        >
          {/* Desktop/tablet: show network + balance + avatar */}
          <div className="hidden md:flex items-center gap-2">
            {/* Dynamic network icon (Arbitrum) */}
            <div className="w-4 h-4 rounded-full overflow-hidden">
              {!networkIconError ? (
                <img
                  src={`https://assets.walletconnect.com/chains/${wallet.chainId}.png`}
                  alt="Network"
                  className="w-full h-full object-cover"
                  onError={() => setNetworkIconError(true)}
                />
              ) : (
                // Arbitrum-branded fallback icon
                <div className="w-full h-full bg-[#28A0F0] rounded-full flex items-center justify-center">
                  <span className="text-white text-[8px] font-bold leading-none">
                    A
                  </span>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>My Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleCopyAddress}>
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" />
              Copy Address
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRefreshBalance} disabled={refreshing}>
          <RefreshCw
            className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
          />
          {refreshing ? "Refreshing..." : "Refresh Balance"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleSwitchAccount}>
          Switch Account
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleDisconnect}
          className="text-destructive"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
