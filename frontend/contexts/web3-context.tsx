"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { ARBITRUM_ONE, ARBITRUM_SEPOLIA, CONTRACTS } from "@/lib/web3/config";
import type { WalletState } from "@/lib/web3/types";
import { useToast } from "@/hooks/use-toast";
import { ethers } from "ethers";

interface Web3ContextType {
  wallet: WalletState;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  switchToArbitrumOne: () => Promise<void>;
  switchToArbitrumSepolia: () => Promise<void>;
  getContract: (address: string, abi: any) => any;
  isOwner: boolean;
}

const Web3Context = createContext<Web3ContextType | undefined>(undefined);

export function Web3Provider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    chainId: null,
    isConnected: false,
    balance: "0",
  });
  const [isOwner, setIsOwner] = useState(false);
  const [isSwitchingNetwork, setIsSwitchingNetwork] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    checkConnection();

    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }

    // Re-check connection periodically to catch AppKit connections
    // Only poll if not connected to avoid unnecessary checks
    // Increased interval to reduce conflicts
    const interval = setInterval(() => {
      if (!wallet.isConnected && !isConnecting) {
        // Use a small delay to avoid race conditions
        setTimeout(() => {
          if (!wallet.isConnected && !isConnecting) {
            checkConnection();
          }
        }, 100);
      }
    }, 5000); // Check every 5 seconds if not connected (reduced frequency)

    return () => {
      clearInterval(interval);
      if (typeof window !== "undefined" && window.ethereum) {
        window.ethereum.removeListener(
          "accountsChanged",
          handleAccountsChanged
        );
        window.ethereum.removeListener("chainChanged", handleChainChanged);
      }
    };
  }, [wallet.isConnected, isConnecting]);

  const checkConnection = async () => {
    if (typeof window === "undefined" || !window.ethereum || isConnecting)
      return;

    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      
      // Only update if accounts exist and we're not already showing them as connected
      // This prevents stale state issues
      if (accounts.length > 0) {
        const currentAddress = accounts[0].toLowerCase();
        const existingAddress = wallet.address?.toLowerCase();
        
        // Only update if address changed or not connected
        if (currentAddress !== existingAddress || !wallet.isConnected) {
          const chainId = await window.ethereum.request({
            method: "eth_chainId",
          });
          const balance = await window.ethereum.request({
            method: "eth_getBalance",
            params: [accounts[0], "latest"],
          });

          setWallet({
            address: accounts[0],
            chainId: Number.parseInt(chainId, 16),
            isConnected: true,
            balance: (Number.parseInt(balance, 16) / 1e18).toFixed(4),
          });

          await checkOwnerStatus(accounts[0]);
        }
      } else if (wallet.isConnected) {
        // Accounts were cleared but we still think we're connected - disconnect
        disconnectWallet();
      }
    } catch (error) {
      // Silently fail - don't spam errors for background checks
      // But log in debug mode for troubleshooting
      if (process.env.NODE_ENV === "development") {
        console.debug("Connection check error:", error);
      }
    }
  };

  const checkOwnerStatus = async (address: string) => {
    try {
      const knownOwner = "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41";

      setIsOwner(address.toLowerCase() === knownOwner.toLowerCase());
    } catch (error) {
      setIsOwner(false);
    }
  };

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setWallet((prev) => ({ ...prev, address: accounts[0] }));
      checkOwnerStatus(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    window.location.reload();
  };

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask or another Web3 wallet",
        variant: "destructive",
      });
      return;
    }

    // Prevent multiple simultaneous connection attempts
    if (isConnecting) {
      toast({
        title: "Connection in progress",
        description:
          "Please wait for the current connection request to complete",
        variant: "default",
      });
      return;
    }

    // Check if already connected
    if (wallet.isConnected) {
      toast({
        title: "Already connected",
        description: `Wallet ${wallet.address?.slice(
          0,
          6
        )}...${wallet.address?.slice(-4)} is already connected`,
      });
      return;
    }

    setIsConnecting(true);

    try {
      // First check if accounts are already available (from previous session)
      let accounts;
      try {
        const existingAccounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        if (existingAccounts.length > 0) {
          accounts = existingAccounts;
        } else {
          // Only request new connection if no accounts exist
          accounts = await window.ethereum.request({
            method: "eth_requestAccounts",
          });
        }
      } catch (requestError: any) {
        // If request fails, it might be because user rejected or another request is pending
        if (requestError.code === 4001) {
          toast({
            title: "Connection cancelled",
            description: "Please try again when ready",
            variant: "default",
          });
          return;
        }
        throw requestError;
      }

      const chainId = await window.ethereum.request({ method: "eth_chainId" });
      const chainIdNumber = Number.parseInt(chainId, 16);
      const balance = await window.ethereum.request({
        method: "eth_getBalance",
        params: [accounts[0], "latest"],
      });

      setWallet({
        address: accounts[0],
        chainId: chainIdNumber,
        isConnected: true,
        balance: (Number.parseInt(balance, 16) / 1e18).toFixed(4),
      });

      await checkOwnerStatus(accounts[0]);

      const targetChainId = Number.parseInt(ARBITRUM_SEPOLIA.chainId, 16);

      if (chainIdNumber !== targetChainId) {
        // Automatically try to switch/add the correct network
        try {
          await switchToArbitrumSepolia();
          toast({
            title: "Network switched",
            description: "Connected to Arbitrum Sepolia Testnet",
          });
        } catch (switchError: any) {
          console.error("Failed to auto-switch network:", switchError);
          toast({
            title: "Network switch needed",
            description:
              "Please switch to Arbitrum Sepolia Testnet manually in your wallet",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Wallet connected",
          description: `Connected to ${accounts[0].slice(
            0,
            6
          )}...${accounts[0].slice(-4)}`,
        });
      }
    } catch (error: any) {
      // Handle specific MetaMask errors
      if (error.code === 4001) {
        toast({
          title: "Connection declined",
          description: "Please approve the connection request in MetaMask",
          variant: "default",
        });
      } else if (
        error.message?.includes("pending") ||
        error.message?.includes("active")
      ) {
        toast({
          title: "Connection pending",
          description:
            "A previous connection request is still active. Please check MetaMask and try again in a moment.",
          variant: "default",
        });
      } else {
        toast({
          title: "Connection failed",
          description:
            error.message || "Failed to connect wallet. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectWallet = () => {
    setWallet({
      address: null,
      chainId: null,
      isConnected: false,
      balance: "0",
    });
    setIsOwner(false);
    toast({
      title: "Wallet disconnected",
      description: "Your wallet has been disconnected",
    });
  };

  const switchToArbitrumOne = async () => {
    if (typeof window === "undefined" || !window.ethereum) return;

    if (isSwitchingNetwork) {
      return;
    }

    const currentChainId = await window.ethereum.request({
      method: "eth_chainId",
    });
    const currentChainIdNumber = Number.parseInt(currentChainId, 16);
    const targetChainId = Number.parseInt(ARBITRUM_ONE.chainId, 16);

    if (currentChainIdNumber === targetChainId) {
      toast({
        title: "Already connected",
        description: "You're already on Arbitrum One",
      });
      return;
    }

    setIsSwitchingNetwork(true);

    try {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARBITRUM_ONE.chainId }],
      });

      toast({
        title: "Network switched",
        description: "Successfully switched to Arbitrum One",
      });
    } catch (error: any) {
      if (error.code === 4902) {
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [ARBITRUM_ONE],
          });

          toast({
            title: "Network added",
            description: "Arbitrum One has been added to your wallet",
          });
        } catch (addError: any) {
          toast({
            title: "Network error",
            description: addError.message || "Failed to add Arbitrum One",
            variant: "destructive",
          });
        }
      } else if (error.code === 4001) {
        toast({
          title: "Request cancelled",
          description: "You cancelled the network switch",
        });
      } else {
        toast({
          title: "Switch failed",
          description: error.message || "Failed to switch network",
          variant: "destructive",
        });
      }
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const switchToArbitrumSepolia = async () => {
    if (typeof window === "undefined" || !window.ethereum) return;

    if (isSwitchingNetwork) {
      return;
    }

    const currentChainId = await window.ethereum.request({
      method: "eth_chainId",
    });
    const currentChainIdNumber = Number.parseInt(currentChainId, 16);
    const targetChainId = Number.parseInt(ARBITRUM_SEPOLIA.chainId, 16);

    if (currentChainIdNumber === targetChainId) {
      toast({
        title: "Already connected",
        description: "You're already on Arbitrum Sepolia testnet",
      });
      return;
    }

    setIsSwitchingNetwork(true);

    try {
      // First try to switch to Arbitrum Sepolia Testnet
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: ARBITRUM_SEPOLIA.chainId }],
      });

      toast({
        title: "Network switched",
        description: "Successfully switched to Arbitrum Sepolia testnet",
      });
    } catch (error: any) {
      if (error.code === 4902) {
        // Network not found, add it
        try {
          await window.ethereum.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: ARBITRUM_SEPOLIA.chainId,
                chainName: ARBITRUM_SEPOLIA.chainName,
                nativeCurrency: ARBITRUM_SEPOLIA.nativeCurrency,
                rpcUrls: ARBITRUM_SEPOLIA.rpcUrls,
                blockExplorerUrls: ARBITRUM_SEPOLIA.blockExplorerUrls,
              },
            ],
          });

          toast({
            title: "Network added",
            description:
              "Arbitrum Sepolia testnet has been added to your wallet",
          });
        } catch (addError: any) {
          toast({
            title: "Network error",
            description:
              addError.message || "Failed to add Arbitrum Sepolia testnet",
            variant: "destructive",
          });
        }
      } else if (error.code === 4001) {
        toast({
          title: "Network switch cancelled",
          description: "Please switch to Arbitrum Sepolia testnet manually",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Network error",
          description:
            error.message || "Failed to switch to Arbitrum Sepolia testnet",
          variant: "destructive",
        });
      }
    } finally {
      setIsSwitchingNetwork(false);
    }
  };

  const getContract = (address: string, abi: any) => {
    if (typeof window === "undefined" || !window.ethereum) return null;
    // Normalize address to a valid checksum to avoid INVALID_ARGUMENT errors
    let targetAddress = address;
    try {
      targetAddress = ethers.getAddress(address.toLowerCase());
    } catch {}

    return {
      async call(method: string, ...args: any[]) {
        try {
          // Use direct RPC connection for read operations to avoid MetaMask issues
          const provider = new ethers.JsonRpcProvider(
            ARBITRUM_SEPOLIA.rpcUrls[0]
          );
          const contract = new ethers.Contract(targetAddress, abi, provider);

          // Call the contract method directly
          const result = await contract[method](...args);
          return result;
        } catch (error) {
          throw error;
        }
      },
      async send(method: string, value: string = "0x0", ...args: any[]) {
        try {
          // First, ensure we're on the correct network
          const currentChainId = await window.ethereum.request({
            method: "eth_chainId",
          });

          // Check if we're on Arbitrum Sepolia
          const targetChainId = ARBITRUM_SEPOLIA.chainId;

          // Convert to lowercase for case-insensitive comparison
          const currentChainIdLower = currentChainId.toLowerCase();
          const targetChainIdLower = targetChainId.toLowerCase();

          if (currentChainIdLower !== targetChainIdLower) {
            throw new Error(
              `Wrong network! Please switch to Arbitrum Sepolia Testnet (Chain ID: ${targetChainId}). Current: ${currentChainId}`
            );
          }

          // Additional check: verify we're on Arbitrum Sepolia
          // by checking if we can connect to Arbitrum Sepolia RPC
          try {
            const arbitrumProvider = new ethers.JsonRpcProvider(
              ARBITRUM_SEPOLIA.rpcUrls[0]
            );
            await arbitrumProvider.getBlockNumber(); // Test connection to Arbitrum Sepolia
          } catch (arbitrumError) {
            throw new Error(
              `Network validation failed. Please ensure you're connected to Arbitrum Sepolia Testnet.`
            );
          }

          const data = encodeFunction(abi, method, args);

          // Estimate gas for the transaction with optimized limits
          let gasLimit = "0x80000"; // Reduced default fallback (524,288 gas)

          // Force higher gas limits for specific functions that need it
          if (method === "approve") {
            gasLimit = "0xc350"; // 50,000 gas - force higher limit for ERC20 approve
          } else {
            try {
              const estimatedGas = await window.ethereum.request({
                method: "eth_estimateGas",
                params: [
                  {
                    from: wallet.address,
                    to: targetAddress,
                    data,
                    value:
                      value !== "0x0" && value !== "no-value" ? value : "0x0",
                  },
                ],
              });
              // Add only 10% buffer to estimated gas (reduced from 20%)
              const gasWithBuffer = Math.floor(Number(estimatedGas) * 1.1);
              gasLimit = `0x${gasWithBuffer.toString(16)}`;
            } catch (gasError) {
              // Use much lower, function-specific gas limits
              if (method === "unpause" || method === "pause") {
                gasLimit = "0x20000"; // 131,072 gas - very low for simple functions
              } else if (
                method === "submitMilestone" ||
                method === "approveMilestone" ||
                method === "rejectMilestone" ||
                method === "disputeMilestone"
              ) {
                gasLimit = "0x30000"; // 196,608 gas - reduced for milestone functions
              } else if (
                method === "createEscrow" ||
                method === "createEscrowNative"
              ) {
                gasLimit = "0x60000"; // 393,216 gas - optimized for escrow creation
              }
            }
          }

          const txParams: any = {
            from: wallet.address,
            to: targetAddress,
            data,
            gas: gasLimit,
          };

          // Only add value field if it's not "0x0" or "no-value" (for native token transactions)
          if (value !== "0x0" && value !== "no-value") {
            txParams.value = value;
          }

          const txHash = await window.ethereum.request({
            method: "eth_sendTransaction",
            params: [txParams],
          });
          return txHash;
        } catch (error) {
          throw error;
        }
      },
      async owner() {
        return "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41";
      },
    };
  };

  const encodeFunction = (abi: any, method: string, args: any[]) => {
    try {
      // Create a proper interface from the ABI
      const iface = new ethers.Interface(abi);

      // Encode the function call with proper parameters
      const encodedData = iface.encodeFunctionData(method, args);

      return encodedData;
    } catch (error) {
      // Fallback to basic encoding for common functions
      if (method === "approve") {
        // approve(address,uint256) selector
        return (
          "0x095ea7b3" +
          "0000000000000000000000000000000000000000000000000000000000000000".repeat(
            2
          )
        );
      } else if (method === "createEscrow") {
        // createEscrow function selector (this needs to be calculated from the actual function signature)
        return (
          "0x" +
          "12345678" +
          "0000000000000000000000000000000000000000000000000000000000000000".repeat(
            8
          )
        );
      } else if (method === "createEscrowNative") {
        // createEscrowNative function selector
        return (
          "0x" +
          "87654321" +
          "0000000000000000000000000000000000000000000000000000000000000000".repeat(
            7
          )
        );
      }

      return "0x";
    }
  };

  return (
    <Web3Context.Provider
      value={{
        wallet,
        connectWallet,
        disconnectWallet,
        switchToArbitrumOne,
        switchToArbitrumSepolia,
        getContract,
        isOwner,
      }}
    >
      {children}
    </Web3Context.Provider>
  );
}

export function useWeb3() {
  const context = useContext(Web3Context);
  if (context === undefined) {
    throw new Error("useWeb3 must be used within a Web3Provider");
  }
  return context;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    ethereum?: any;
  }
}
