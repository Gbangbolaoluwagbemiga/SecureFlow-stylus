import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/web3-context";
import { useDelegation } from "@/contexts/delegation-context";
import { CONTRACTS } from "@/lib/web3/config";
import { SECUREFLOW_ABI } from "@/lib/web3/abis";

export function useAdminStatus() {
  const { wallet, getContract } = useWeb3();
  const { getActiveDelegations, delegations } = useDelegation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) {
      setIsAdmin(false);
      return;
    }

    checkAdminStatus();
  }, [wallet.isConnected, wallet.address, delegations.length]);

  const checkAdminStatus = async () => {
    setLoading(true);
    try {
      const contract = getContract(CONTRACTS.SECUREFLOW_ESCROW, SECUREFLOW_ABI);
      if (!contract) {
        console.log("❌ Admin check: No contract available");
        setIsAdmin(false);
        setLoading(false);
        return;
      }

      // Get the contract owner
      const owner = await contract.call("owner");

      console.log("🔍 Admin check - Owner from contract:", owner);
      console.log("🔍 Admin check - Owner type:", typeof owner);
      console.log("🔍 Admin check - Wallet address:", wallet.address);

      // Normalize owner address - handle different return types
      let ownerAddress = "";
      try {
        if (typeof owner === "string") {
          // Use ethers to normalize the address (handles checksum)
          const { ethers } = await import("ethers");
          ownerAddress = ethers.getAddress(owner).toLowerCase();
        } else if (owner && typeof owner === "object") {
          // Handle BigNumber or other object types
          const ownerStr = owner.toString();
          const { ethers } = await import("ethers");
          ownerAddress = ethers.getAddress(ownerStr).toLowerCase();
        } else {
          const { ethers } = await import("ethers");
          ownerAddress = ethers.getAddress(String(owner)).toLowerCase();
        }
      } catch (e) {
        // Fallback to simple lowercase if ethers.getAddress fails
        ownerAddress = String(owner).toLowerCase();
      }

      // Normalize wallet address using ethers
      let walletAddress = "";
      try {
        if (wallet.address) {
          const { ethers } = await import("ethers");
          walletAddress = ethers.getAddress(wallet.address).toLowerCase();
        }
      } catch (e) {
        walletAddress = wallet.address?.toLowerCase() || "";
      }

      console.log("🔍 Admin check - Normalized owner:", ownerAddress);
      console.log("🔍 Admin check - Normalized wallet:", walletAddress);

      // If contract owner is zero address (not initialized), use deployer address as fallback
      const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
      const DEPLOYER_ADDRESS = "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41"; // From deployed.json

      // Check if contract is initialized (owner is not zero)
      const isContractInitialized =
        ownerAddress !== ZERO_ADDRESS && ownerAddress !== "";

      // Use deployer address as fallback if contract not initialized
      const effectiveOwnerAddress = isContractInitialized
        ? ownerAddress
        : DEPLOYER_ADDRESS.toLowerCase();

      console.log(
        "🔍 Admin check - Contract initialized?",
        isContractInitialized
      );
      console.log(
        "🔍 Admin check - Effective owner address:",
        effectiveOwnerAddress
      );

      // Check if current wallet is the owner (or deployer if contract not initialized)
      const isOwner =
        effectiveOwnerAddress === walletAddress && walletAddress !== "";

      console.log("🔍 Admin check - Is owner?", isOwner);

      // Also check if user has an active delegation granted TO their address
      const activeDelegations = getActiveDelegations();
      const hasDelegationForUser = activeDelegations.some(
        (d) => d.delegatee.toLowerCase() === walletAddress
      );

      console.log("🔍 Admin check - Has delegation?", hasDelegationForUser);
      console.log(
        "🔍 Admin check - Final isAdmin:",
        isOwner || hasDelegationForUser
      );

      setIsAdmin(isOwner || hasDelegationForUser);
    } catch (error) {
      console.error("❌ Error checking admin status:", error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  return { isAdmin, loading };
}
