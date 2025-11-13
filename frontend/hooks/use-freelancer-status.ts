import { useState, useEffect } from "react";
import { useWeb3 } from "@/contexts/web3-context";
import { CONTRACTS } from "@/lib/web3/config";
import { SECUREFLOW_ABI } from "@/lib/web3/abis";

export function useFreelancerStatus() {
  const { wallet, getContract } = useWeb3();
  const [isFreelancer, setIsFreelancer] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!wallet.isConnected || !wallet.address) {
      setIsFreelancer(false);
      return;
    }

    checkFreelancerStatus();
  }, [wallet.isConnected, wallet.address]);

  const checkFreelancerStatus = async () => {
    setLoading(true);
    try {
      const contract = getContract(CONTRACTS.SECUREFLOW_ESCROW, SECUREFLOW_ABI);
      if (!contract) {
        setIsFreelancer(false);
        return;
      }

      // Get total number of escrows
      let totalEscrows;
      try {
        totalEscrows = await contract.call("nextEscrowId");
      } catch (error: any) {
        // Contract might not be initialized or there's an issue
        console.warn(
          "Failed to get nextEscrowId, contract may not be initialized:",
          error
        );
        setIsFreelancer(false);
        setLoading(false);
        return;
      }
      const escrowCount = Number(totalEscrows || 0);

      // Check if current wallet is beneficiary of any escrow
      if (escrowCount > 1) {
        for (let i = 1; i < escrowCount; i++) {
          try {
            const escrowSummary = await contract.call("getEscrowSummary", i);

            // Check if current user is the beneficiary
            const isBeneficiary =
              escrowSummary[1].toLowerCase() === wallet.address?.toLowerCase();

            if (isBeneficiary) {
              setIsFreelancer(true);
              setLoading(false);
              return;
            }
          } catch (error) {
            // Skip escrows that don't exist
            continue;
          }
        }
      }

      setIsFreelancer(false);
    } catch (error) {
      setIsFreelancer(false);
    } finally {
      setLoading(false);
    }
  };

  return { isFreelancer, loading };
}
