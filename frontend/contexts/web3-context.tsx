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
  refreshBalance: () => Promise<void>;
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

  // Check for existing connection on mount
  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window === "undefined" || !window.ethereum) {
        return;
      }

      try {
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });

        if (accounts.length > 0) {
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

          const knownOwner = "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41";
          setIsOwner(accounts[0].toLowerCase() === knownOwner.toLowerCase());
        }
      } catch (error) {
        console.error("Error checking wallet connection:", error);
      }
    };

    checkConnection();

    if (typeof window !== "undefined" && window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        if (accounts.length === 0) {
          setWallet({
            address: null,
            chainId: null,
            isConnected: false,
            balance: "0",
          });
          setIsOwner(false);
        } else {
          try {
            const chainId = await window.ethereum?.request({
              method: "eth_chainId",
            });
            const balance = await window.ethereum?.request({
              method: "eth_getBalance",
              params: [accounts[0], "latest"],
            });

            setWallet((prev) => ({
              ...prev,
              address: accounts[0],
              chainId: chainId ? Number.parseInt(chainId, 16) : prev.chainId,
              isConnected: true,
              balance: balance
                ? (Number.parseInt(balance, 16) / 1e18).toFixed(4)
                : prev.balance,
            }));

            const knownOwner = "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41";
            setIsOwner(accounts[0].toLowerCase() === knownOwner.toLowerCase());
          } catch (error) {
            setWallet((prev) => ({ ...prev, address: accounts[0] }));
            const knownOwner = "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41";
            setIsOwner(accounts[0].toLowerCase() === knownOwner.toLowerCase());
          }
        }
      };

      const handleChainChanged = () => {
        window.location.reload();
      };

      window.ethereum.on("accountsChanged", handleAccountsChanged);
      window.ethereum.on("chainChanged", handleChainChanged);

      return () => {
        if (window.ethereum) {
          window.ethereum.removeListener(
            "accountsChanged",
            handleAccountsChanged
          );
          window.ethereum.removeListener("chainChanged", handleChainChanged);
        }
      };
    }
  }, []);

  const connectWallet = async () => {
    if (typeof window === "undefined" || !window.ethereum) {
      toast({
        title: "Wallet not found",
        description: "Please install MetaMask or another Web3 wallet",
        variant: "destructive",
      });
      return;
    }

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

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

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

      const knownOwner = "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41";
      setIsOwner(accounts[0].toLowerCase() === knownOwner.toLowerCase());

      const targetChainId = Number.parseInt(ARBITRUM_SEPOLIA.chainId, 16);

      if (chainIdNumber !== targetChainId) {
        try {
          await switchToArbitrumSepolia();
        } catch (switchError: any) {
          console.error("Failed to auto-switch network:", switchError);
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
      if (error.code === 4001) {
        toast({
          title: "Connection declined",
          description: "Please approve the connection request in MetaMask",
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
  };

  const switchToArbitrumOne = async () => {
    if (typeof window === "undefined" || !window.ethereum) return;

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
    }
  };

  const switchToArbitrumSepolia = async () => {
    if (typeof window === "undefined" || !window.ethereum) return;

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

    try {
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
    }
  };

  const getContract = (address: string, abi: any) => {
    if (typeof window === "undefined" || !window.ethereum) return null;

    let targetAddress = address;
    try {
      targetAddress = ethers.getAddress(address.toLowerCase());
    } catch {}

    return {
      async call(method: string, ...args: any[]) {
        try {
          const provider = new ethers.JsonRpcProvider(
            ARBITRUM_SEPOLIA.rpcUrls[0]
          );
          const contract = new ethers.Contract(targetAddress, abi, provider);
          const result = await contract[method](...args);

          // For owner() calls, ensure we return a clean address string
          if (method === "owner" && result) {
            try {
              return ethers.getAddress(result);
            } catch (e) {
              return String(result);
            }
          }

          return result;
        } catch (error) {
          console.error(`Contract call error for ${method}:`, error);
          throw error;
        }
      },
      async send(method: string, value: string = "0x0", ...args: any[]) {
        try {
          const currentChainId = await window.ethereum.request({
            method: "eth_chainId",
          });

          const targetChainId = ARBITRUM_SEPOLIA.chainId;
          const currentChainIdLower = currentChainId.toLowerCase();
          const targetChainIdLower = targetChainId.toLowerCase();

          if (currentChainIdLower !== targetChainIdLower) {
            throw new Error(
              `Wrong network! Please switch to Arbitrum Sepolia Testnet (Chain ID: ${targetChainId}). Current: ${currentChainId}`
            );
          }

          const data = encodeFunction(abi, method, args);
          let gasLimit = "0x80000";

          if (method === "approve") {
            gasLimit = "0xc350";
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
              const gasWithBuffer = Math.floor(Number(estimatedGas) * 1.1);
              gasLimit = `0x${gasWithBuffer.toString(16)}`;
            } catch (gasError) {
              if (method === "unpause" || method === "pause") {
                gasLimit = "0x20000";
              } else if (
                method === "submitMilestone" ||
                method === "approveMilestone" ||
                method === "rejectMilestone" ||
                method === "disputeMilestone"
              ) {
                gasLimit = "0x30000";
              } else if (
                method === "createEscrow" ||
                method === "createEscrowNative"
              ) {
                gasLimit = "0x60000";
              }
            }
          }

          const txParams: any = {
            from: wallet.address,
            to: targetAddress,
            data,
            gas: gasLimit,
          };

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
      const iface = new ethers.Interface(abi);
      const encodedData = iface.encodeFunctionData(method, args);

      // Log encoding for debugging
      if (method === "createEscrowNative" || method === "createEscrow") {
        console.log("🔧 Encoding function:", method, {
          args: args.map((arg, i) => ({
            index: i,
            type: typeof arg,
            value: Array.isArray(arg)
              ? `Array[${arg.length}]`
              : String(arg).slice(0, 50),
          })),
          encodedData: encodedData.slice(0, 10) + "...",
        });
      }

      return encodedData;
    } catch (error: any) {
      console.error(`❌ Failed to encode function ${method}:`, error);
      console.error("Arguments:", args);
      console.error("ABI:", abi);

      if (method === "approve") {
        return (
          "0x095ea7b3" +
          "0000000000000000000000000000000000000000000000000000000000000000".repeat(
            2
          )
        );
      }

      // Don't return "0x" - throw the error so we can see what's wrong
      throw new Error(`Failed to encode ${method}: ${error.message}`);
    }
  };

  const refreshBalance = async () => {
    if (typeof window === "undefined" || !window.ethereum || !wallet.address) {
      return;
    }

    try {
      const balance = await window.ethereum.request({
        method: "eth_getBalance",
        params: [wallet.address, "latest"],
      });

      setWallet((prev) => ({
        ...prev,
        balance: (Number.parseInt(balance, 16) / 1e18).toFixed(4),
      }));
    } catch (error) {
      console.error("Error refreshing balance:", error);
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
        refreshBalance,
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

declare global {
  interface Window {
    ethereum?: any;
  }
}
