"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useWeb3 } from "@/contexts/web3-context";
import { useSmartAccount } from "@/contexts/smart-account-context";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { CONTRACTS, ZERO_ADDRESS } from "@/lib/web3/config";
import { SECUREFLOW_ABI, ERC20_ABI } from "@/lib/web3/abis";
import { useRouter } from "next/navigation";
import { ProjectDetailsStep } from "@/components/create/project-details-step";
import { MilestonesStep } from "@/components/create/milestones-step";
import { ReviewStep } from "@/components/create/review-step";

interface Milestone {
  description: string;
  amount: string;
}

export default function CreateEscrowPage() {
  const router = useRouter();
  const { wallet, getContract, switchToArbitrumSepolia } = useWeb3();
  const { executeTransaction, isSmartAccountReady } = useSmartAccount();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAIWriter, setShowAIWriter] = useState(false);
  const [currentMilestoneIndex, setCurrentMilestoneIndex] = useState<
    number | null
  >(null);
  const [useNativeToken, setUseNativeToken] = useState(false);
  const [isOpenJob, setIsOpenJob] = useState(false);
  const [isContractPaused, setIsContractPaused] = useState(false);
  const [isOnCorrectNetwork, setIsOnCorrectNetwork] = useState(true);
  const [errors, setErrors] = useState<{
    projectTitle?: string;
    projectDescription?: string;
    duration?: string;
    totalBudget?: string;
    beneficiary?: string;
    tokenAddress?: string;
    milestones?: string;
    totalMismatch?: string;
  }>({});

  useEffect(() => {
    checkContractPauseStatus();
    checkNetworkStatus();
  }, [wallet.chainId]);

  const checkNetworkStatus = async () => {
    if (!wallet.isConnected) return;

    try {
      const currentChainId = await window.ethereum.request({
        method: "eth_chainId",
      });
      const targetChainId = "0x66EEE"; // Arbitrum Sepolia Testnet

      setIsOnCorrectNetwork(
        currentChainId.toLowerCase() === targetChainId.toLowerCase()
      );
    } catch (error) {
      setIsOnCorrectNetwork(false);
    }
  };

  const checkContractPauseStatus = async () => {
    try {
      const contract = getContract(CONTRACTS.SECUREFLOW_ESCROW, SECUREFLOW_ABI);
      const paused = await contract.call("paused");

      let isPaused = false;

      // Use the same robust parsing logic as admin page
      if (paused === true || paused === "true" || paused === 1) {
        isPaused = true;
      } else if (paused === false || paused === "false" || paused === 0) {
        isPaused = false;
      } else if (paused && typeof paused === "object") {
        try {
          const pausedValue = paused.toString();
          isPaused = pausedValue === "true" || pausedValue === "1";
        } catch (e) {
          isPaused = false; // Default to not paused
        }
      }

      setIsContractPaused(isPaused);
    } catch (error) {
      setIsContractPaused(false);
    }
  };

  const [formData, setFormData] = useState({
    projectTitle: "",
    projectDescription: "",
    duration: "",
    totalBudget: "",
    beneficiary: "",
    token: ZERO_ADDRESS, // Default to native ETH (safer - no token contract needed)
    useNativeToken: true, // Default to native token
    isOpenJob: false,
    milestones: [
      { description: "", amount: "" },
      { description: "", amount: "" },
    ] as Milestone[],
  });

  const commonTokens = [
    { name: "Native MONAD", address: ZERO_ADDRESS, isNative: true },
    { name: "Custom ERC20", address: "", isNative: false },
  ];

  const addMilestone = () => {
    setFormData({
      ...formData,
      milestones: [...formData.milestones, { description: "", amount: "" }],
    });
  };

  const removeMilestone = (index: number) => {
    if (formData.milestones.length <= 1) {
      toast({
        title: "Cannot remove",
        description: "At least one milestone is required",
        variant: "destructive",
      });
      return;
    }
    const newMilestones = formData.milestones.filter((_, i) => i !== index);
    setFormData({ ...formData, milestones: newMilestones });
  };

  const updateMilestone = (
    index: number,
    field: keyof Milestone,
    value: string
  ) => {
    const newMilestones = [...formData.milestones];
    newMilestones[index][field] = value;
    setFormData({ ...formData, milestones: newMilestones });
  };

  const openAIWriter = (index: number) => {
    setCurrentMilestoneIndex(index);
    setShowAIWriter(true);
  };

  const handleAISelect = (description: string) => {
    if (currentMilestoneIndex !== null) {
      updateMilestone(currentMilestoneIndex, "description", description);
      setShowAIWriter(false);
      setCurrentMilestoneIndex(null);
    }
  };

  const calculateTotalMilestones = () => {
    return formData.milestones.reduce(
      (sum, m) => sum + (Number.parseFloat(m.amount) || 0),
      0
    );
  };

  const validateStep = () => {
    const newErrors: typeof errors = {};
    let hasErrors = false;

    if (step === 1) {
      // Validate all required fields for step 1
      if (!formData.projectTitle || formData.projectTitle.length < 3) {
        newErrors.projectTitle = "Project title must be at least 3 characters";
        hasErrors = true;
      }

      if (
        !formData.projectDescription ||
        formData.projectDescription.length < 50
      ) {
        newErrors.projectDescription =
          "Project description must be at least 50 characters";
        hasErrors = true;
      }

      if (
        !formData.duration ||
        Number(formData.duration) < 1 ||
        Number(formData.duration) > 365
      ) {
        newErrors.duration = "Duration must be between 1 and 365 days";
        hasErrors = true;
      }

      if (!formData.totalBudget || Number(formData.totalBudget) < 0.01) {
        newErrors.totalBudget = "Total budget must be at least 0.01 tokens";
        hasErrors = true;
      }

      if (
        !formData.isOpenJob &&
        (!formData.beneficiary ||
          !/^0x[a-fA-F0-9]{40}$/.test(formData.beneficiary))
      ) {
        newErrors.beneficiary =
          "Valid beneficiary address is required for direct escrow";
        hasErrors = true;
      }

      if (
        !formData.useNativeToken &&
        (!formData.token || !/^0x[a-fA-F0-9]{40}$/.test(formData.token))
      ) {
        newErrors.tokenAddress =
          "Valid token address is required for custom ERC20 tokens";
        hasErrors = true;
      }
    } else if (step === 2) {
      const total = calculateTotalMilestones();
      const targetTotal = Number.parseFloat(formData.totalBudget) || 0;

      if (formData.milestones.some((m) => !m.description || !m.amount)) {
        newErrors.milestones = "Please fill in all milestone details";
        hasErrors = true;
      }

      if (Math.abs(total - targetTotal) > 0.01) {
        newErrors.totalMismatch = `Milestone amounts (${total}) must equal total amount (${targetTotal})`;
        hasErrors = true;
      }
    }

    setErrors(newErrors);
    return !hasErrors;
  };

  const clearErrors = () => {
    setErrors({});
  };

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  const validateForm = () => {
    const errors: string[] = [];

    // Validate project title
    if (!formData.projectTitle || formData.projectTitle.length < 3) {
      errors.push("Project title must be at least 3 characters long");
    }

    // Validate project description
    if (
      !formData.projectDescription ||
      formData.projectDescription.length < 50
    ) {
      errors.push("Project description must be at least 50 characters long");
    }

    // Validate duration
    if (
      !formData.duration ||
      Number(formData.duration) < 1 ||
      Number(formData.duration) > 365
    ) {
      errors.push("Duration must be between 1 and 365 days");
    }

    // Validate total budget
    if (!formData.totalBudget || Number(formData.totalBudget) < 0.01) {
      errors.push("Total budget must be at least 0.01 tokens");
    }

    // Validate beneficiary (only if not open job)
    if (!formData.isOpenJob) {
      if (!formData.beneficiary) {
        errors.push("Beneficiary address is required for direct escrow");
      } else if (!/^0x[a-fA-F0-9]{40}$/.test(formData.beneficiary)) {
        errors.push("Beneficiary address must be a valid Ethereum address");
      }
    }

    // Validate milestones
    if (formData.milestones.length === 0) {
      errors.push("At least one milestone is required");
    }

    for (let i = 0; i < formData.milestones.length; i++) {
      const milestone = formData.milestones[i];
      if (!milestone.description || milestone.description.length < 10) {
        errors.push(
          `Milestone ${i + 1} description must be at least 10 characters long`
        );
      }
      if (!milestone.amount || Number(milestone.amount) < 0.01) {
        errors.push(`Milestone ${i + 1} amount must be at least 0.01 tokens`);
      }
    }

    // Validate milestone amounts sum
    const totalMilestoneAmount = formData.milestones.reduce(
      (sum, milestone) => sum + Number(milestone.amount || 0),
      0
    );
    if (Math.abs(totalMilestoneAmount - Number(formData.totalBudget)) > 0.01) {
      errors.push("Total milestone amounts must equal the total budget");
    }

    return errors;
  };

  const handleSubmit = async () => {
    if (!wallet.isConnected) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create an escrow",
        variant: "destructive",
      });
      return;
    }

    // Validate form
    const validationErrors = validateForm();
    if (validationErrors.length > 0) {
      toast({
        title: "Form validation failed",
        description: validationErrors.join(", "),
        variant: "destructive",
      });
      return;
    }

    // Allow both native tokens (ZERO_ADDRESS) and ERC20 tokens
    if (!formData.token) {
      toast({
        title: "Invalid token address",
        description: "Please select a token type",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (formData.token !== ZERO_ADDRESS) {
        // First check if token is whitelisted
        const escrowContract = getContract(
          CONTRACTS.SECUREFLOW_ESCROW,
          SECUREFLOW_ABI
        );
        try {
          const isWhitelisted = await escrowContract.call(
            "whitelistedTokens",
            formData.token
          );
          if (!isWhitelisted) {
            throw new Error(
              "Token is not whitelisted. Please use a whitelisted token or contact the admin to whitelist this token."
            );
          }
        } catch (whitelistError: any) {
          if (whitelistError.message?.includes("not whitelisted")) {
            throw whitelistError;
          }
          // If check fails, continue with validation (might be network issue)
          console.warn(
            "Could not verify token whitelist status:",
            whitelistError
          );
        }

        const tokenContract = getContract(formData.token, ERC20_ABI);
        const totalAmountInWei = BigInt(
          Math.floor(Number.parseFloat(formData.totalBudget) * 10 ** 18)
        ).toString();

        // Test if token contract is working
        try {
          // First check if contract exists
          const { ethers } = await import("ethers");
          const provider = new ethers.JsonRpcProvider(
            "https://sepolia-rollup.arbitrum.io/rpc"
          );
          const code = await provider.getCode(formData.token);

          if (code === "0x" || code === "0x0") {
            throw new Error(
              "Token address does not contain a contract. Please check the token address or use native ETH (0x0000...0000) instead."
            );
          }

          // Try to call name() - if it fails, the contract might not be a valid ERC20
          let tokenName, tokenSymbol, tokenDecimals;
          try {
            tokenName = await tokenContract.call("name");
            tokenSymbol = await tokenContract.call("symbol");
            tokenDecimals = await tokenContract.call("decimals");

            // Check for empty return data (0x means function doesn't exist or returned empty)
            if (
              !tokenName ||
              tokenName === "" ||
              tokenName === "0x" ||
              !tokenSymbol ||
              tokenSymbol === "" ||
              tokenSymbol === "0x" ||
              tokenDecimals === undefined ||
              tokenDecimals === null
            ) {
              throw new Error(
                "Token contract does not implement standard ERC20 functions. The contract exists but doesn't have name(), symbol(), or decimals() functions."
              );
            }
          } catch (callError: any) {
            // Check if it's a decode error (empty return data)
            if (
              callError.message?.includes("could not decode") ||
              callError.message?.includes("BAD_DATA") ||
              callError.code === "BAD_DATA"
            ) {
              throw new Error(
                `Token contract at ${formData.token.slice(
                  0,
                  10
                )}... does not implement standard ERC20 functions (name, symbol, decimals). Please use a valid ERC20 token address or use native ETH instead.`
              );
            }

            // Contract exists but doesn't have standard ERC20 functions
            throw new Error(
              `Token contract does not implement standard ERC20 functions. Error: ${
                callError.message || "Unknown error"
              }. Please use a valid ERC20 token address or use native ETH (0x0000...0000) instead.`
            );
          }
        } catch (tokenError: any) {
          // Re-throw with better error message
          if (tokenError.message) {
            throw tokenError;
          }
          throw new Error(
            "Token contract is not working properly. Please check the token address or use native ETH instead."
          );
        }

        // Check token balance first
        try {
          const balance = await tokenContract.call("balanceOf", wallet.address);

          if (Number(balance) < Number(totalAmountInWei)) {
            throw new Error(
              `Insufficient token balance. You have ${(
                Number(balance) /
                10 ** 18
              ).toFixed(2)} tokens but need ${formData.totalBudget} tokens.`
            );
          }
        } catch (balanceError) {
          throw new Error(
            "Failed to check token balance. Please ensure you have enough tokens or try using native ETH tokens instead."
          );
        }

        const approvalTx = await tokenContract.send(
          "approve",
          "no-value", // No native value for ERC20 approval
          CONTRACTS.SECUREFLOW_ESCROW,
          totalAmountInWei
        );

        toast({
          title: "Approval submitted",
          description: "Waiting for token approval confirmation...",
        });

        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      const escrowContract = getContract(
        CONTRACTS.SECUREFLOW_ESCROW,
        SECUREFLOW_ABI
      );
      const milestoneDescriptions = formData.milestones.map(
        (m) => m.description
      );

      // For open jobs, use zero address. For regular escrows, require a beneficiary
      let beneficiaryAddress: string;
      if (formData.isOpenJob) {
        beneficiaryAddress = "0x0000000000000000000000000000000000000000"; // Zero address for open jobs
      } else {
        if (
          !formData.beneficiary ||
          formData.beneficiary === "0x0000000000000000000000000000000000000000"
        ) {
          throw new Error(
            "Beneficiary address is required for non-open job escrows"
          );
        }
        // Ensure beneficiary is not the same as the depositor (wallet address)
        if (
          formData.beneficiary.toLowerCase() === wallet.address?.toLowerCase()
        ) {
          throw new Error(
            "Beneficiary cannot be the same as the depositor (your wallet address)"
          );
        }
        beneficiaryAddress = formData.beneficiary;
      }

      console.log("👤 Beneficiary address:", {
        isOpenJob: formData.isOpenJob,
        beneficiary: beneficiaryAddress,
        depositor: wallet.address,
      });

      let txHash;
      console.log(
        "🔍 Starting escrow creation, token:",
        formData.token,
        "ZERO_ADDRESS:",
        ZERO_ADDRESS
      );

      if (formData.token === ZERO_ADDRESS) {
        console.log("✅ Using native ETH (createEscrowNative)");
        // Use createEscrowNative for native ETH tokens
        console.log(
          "💰 Calculating total amount from budget:",
          formData.totalBudget
        );
        const totalAmountInWei = BigInt(
          Math.floor(Number.parseFloat(formData.totalBudget) * 10 ** 18)
        ).toString();
        console.log("💰 Total amount in wei:", totalAmountInWei);

        // Check native token balance
        console.log("💳 Checking ETH balance...");
        try {
          const balance = await window.ethereum.request({
            method: "eth_getBalance",
            params: [wallet.address, "latest"],
          });

          const balanceInWei = BigInt(balance);
          const requiredAmount = BigInt(totalAmountInWei);
          console.log("💳 Balance check:", {
            balance: balanceInWei.toString(),
            required: requiredAmount.toString(),
            balanceInEth: Number(balanceInWei) / 1e18,
            requiredInEth: Number(requiredAmount) / 1e18,
          });

          // Also need some ETH for gas (Arbitrum gas is much cheaper)
          const gasReserve = BigInt("1000000000000000"); // 0.001 ETH for gas (should be plenty on Arbitrum)
          const totalNeeded = requiredAmount + gasReserve;
          console.log(
            "💳 Total needed (escrow + gas):",
            totalNeeded.toString()
          );

          if (balanceInWei < totalNeeded) {
            const { ethers } = await import("ethers");
            const errorMsg = `Insufficient ETH balance. You have ${ethers.formatEther(
              balanceInWei
            )} ETH but need ${ethers.formatEther(
              requiredAmount
            )} ETH for escrow + ~0.1 ETH for gas.`;
            console.error("❌ INSUFFICIENT BALANCE:", errorMsg);
            throw new Error(errorMsg);
          }
          console.log("✅ Balance check passed!");

          if (balanceInWei < requiredAmount) {
            const { ethers } = await import("ethers");
            throw new Error(
              `Insufficient ETH balance. You have ${ethers.formatEther(
                balanceInWei
              )} ETH but need ${ethers.formatEther(requiredAmount)} ETH.`
            );
          }
        } catch (balanceError: any) {
          if (balanceError.message?.includes("Insufficient")) {
            throw balanceError;
          }
          throw new Error(
            `Failed to check ETH balance: ${
              balanceError.message || "Unknown error"
            }. Please ensure you have enough ETH.`
          );
        }

        // Convert milestone amounts to wei (BigInt)
        console.log("📊 Converting milestone amounts to wei...");
        const milestoneAmountsInWei = formData.milestones.map((m) => {
          const amount = Number.parseFloat(m.amount);
          if (isNaN(amount) || amount <= 0) {
            throw new Error(`Invalid milestone amount: ${m.amount}`);
          }
          const inWei = BigInt(Math.floor(amount * 10 ** 18)).toString();
          console.log(`📊 Milestone: ${m.amount} tokens = ${inWei} wei`);
          return inWei;
        });
        console.log("📊 All milestone amounts:", milestoneAmountsInWei);

        // Calculate total from milestones to verify it matches budget
        const totalFromMilestones = milestoneAmountsInWei.reduce(
          (sum, amt) => sum + BigInt(amt),
          BigInt(0)
        );
        const totalBudgetInWei = BigInt(totalAmountInWei);

        if (totalFromMilestones !== totalBudgetInWei) {
          const { ethers } = await import("ethers");
          throw new Error(
            `Total milestone amounts (${ethers.formatEther(
              totalFromMilestones
            )} ETH) do not match project budget (${ethers.formatEther(
              totalBudgetInWei
            )} ETH). Please ensure they match exactly.`
          );
        }

        // Check if arbiter is authorized before using
        console.log("👮 Checking arbiter authorization...");
        const defaultArbiter = "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41";
        let arbiters = [defaultArbiter];
        const requiredConfirmations = 1;

        // Verify arbiter is authorized (contract requires authorized arbiters)
        try {
          const isArbiterAuthorized = await escrowContract.call(
            "authorizedArbiters",
            defaultArbiter
          );
          console.log("👮 Arbiter authorization check:", {
            arbiter: defaultArbiter,
            isAuthorized: isArbiterAuthorized,
          });

          if (!isArbiterAuthorized) {
            throw new Error(
              "Default arbiter is not authorized. Please go to the Admin page and authorize an arbiter first, or create an open job (which doesn't require arbiters initially)."
            );
          }
        } catch (arbiterError: any) {
          if (arbiterError.message?.includes("not authorized")) {
            throw arbiterError;
          }
          console.warn("Could not verify arbiter authorization:", arbiterError);
          // Continue anyway - contract will revert if arbiter not authorized
        }

        // Convert duration from days to seconds
        console.log("⏰ Converting duration:", formData.duration, "days");
        const durationInSeconds = Number(formData.duration) * 24 * 60 * 60;
        console.log("⏰ Duration in seconds:", durationInSeconds);

        // Pre-flight validation: Check all contract state before sending transaction
        console.log("🔍 Pre-flight validation: Checking contract state...");
        try {
          const { ethers: ethersLib } = await import("ethers");
          const [isPaused, isJobCreationPaused, nextEscrowId] =
            await Promise.all([
              escrowContract.call("paused"),
              escrowContract.call("jobCreationPaused"),
              escrowContract.call("nextEscrowId"),
            ]);

          console.log("🔍 Contract state check:", {
            isPaused,
            isJobCreationPaused,
            nextEscrowId: nextEscrowId.toString(),
            beneficiary: beneficiaryAddress,
            isOpenJob: formData.isOpenJob,
            arbitersCount: arbiters.length,
            requiredConfirmations,
            milestoneCount: milestoneAmountsInWei.length,
            duration: durationInSeconds,
            totalAmount: ethersLib.formatEther(totalAmountInWei),
          });

          if (isPaused) {
            throw new Error(
              "❌ Contract is paused. Please unpause from Admin page."
            );
          }
          if (isJobCreationPaused) {
            throw new Error(
              "❌ Job creation is paused. Please unpause from Admin page."
            );
          }
          if (arbiters.length === 0) {
            throw new Error("❌ At least one arbiter is required.");
          }
          if (arbiters.length > 5) {
            throw new Error("❌ Too many arbiters (max 5).");
          }
          if (
            (requiredConfirmations as number) === 0 ||
            (requiredConfirmations as number) > arbiters.length
          ) {
            throw new Error(
              `❌ Invalid required confirmations: ${requiredConfirmations} (must be 1-${arbiters.length}).`
            );
          }
          if (milestoneAmountsInWei.length === 0) {
            throw new Error("❌ At least one milestone is required.");
          }
          if (milestoneAmountsInWei.length > 20) {
            throw new Error("❌ Too many milestones (max 20).");
          }
          if (durationInSeconds < 3600 || durationInSeconds > 31536000) {
            throw new Error(
              `❌ Invalid duration: ${durationInSeconds} seconds (must be 3600-31536000).`
            );
          }
          if (
            !formData.projectTitle ||
            formData.projectTitle.trim().length === 0
          ) {
            throw new Error("❌ Project title is required.");
          }

          // Check each milestone amount
          for (let i = 0; i < milestoneAmountsInWei.length; i++) {
            if (BigInt(milestoneAmountsInWei[i]) === BigInt(0)) {
              throw new Error(`❌ Milestone ${i + 1} has zero amount.`);
            }
          }

          console.log("✅ All pre-flight validations passed!");
        } catch (validationError: any) {
          console.error("❌ Pre-flight validation failed:", validationError);
          throw validationError;
        }

        // Validate duration (contract requires 1 hour to 365 days) - already checked above but keeping for safety
        if (durationInSeconds < 3600 || durationInSeconds > 31536000) {
          throw new Error(
            "Invalid duration. Duration must be between 1 hour and 365 days."
          );
        }

        // Log transaction parameters for debugging
        const { ethers: ethersLib } = await import("ethers");
        console.log("📝 Escrow creation parameters:", {
          beneficiary: beneficiaryAddress,
          arbiters,
          requiredConfirmations,
          milestoneAmounts: milestoneAmountsInWei,
          milestoneDescriptions: milestoneDescriptions.length,
          duration: durationInSeconds,
          totalAmount: ethersLib.formatEther(totalAmountInWei),
          isOpenJob: formData.isOpenJob,
        });

        // Retry transaction with exponential backoff
        let txAttempts = 0;
        const maxTxAttempts = 3;

        while (txAttempts < maxTxAttempts) {
          console.log(
            "🚀 About to attempt transaction, attempt:",
            txAttempts + 1
          );
          try {
            // Check if we should use Smart Account for gasless transaction
            if (isSmartAccountReady) {
              // Use Smart Account for gasless escrow creation
              const { ethers } = await import("ethers");
              const iface = new ethers.Interface(SECUREFLOW_ABI);
              const data = iface.encodeFunctionData("createEscrowNative", [
                beneficiaryAddress, // beneficiary parameter
                arbiters, // arbiters parameter
                requiredConfirmations, // requiredConfirmations parameter
                milestoneAmountsInWei, // milestoneAmounts parameter (in wei)
                milestoneDescriptions, // milestoneDescriptions parameter
                durationInSeconds, // duration parameter (in seconds)
                formData.projectTitle, // projectTitle parameter
                formData.projectDescription, // projectDescription parameter
              ]);

              txHash = await executeTransaction(
                CONTRACTS.SECUREFLOW_ESCROW,
                data,
                (Number(totalAmountInWei) / 1e18).toString() // Convert wei to ETH for value
              );

              toast({
                title: "🚀 Gasless Escrow Created!",
                description:
                  "Escrow created with no gas fees using Smart Account delegation",
              });
            } else {
              // Use regular transaction - convert wei to hex string for value
              const valueInHex = `0x${BigInt(totalAmountInWei).toString(16)}`;

              const { ethers: ethersLib } = await import("ethers");
              console.log("🚀 Sending createEscrowNative transaction:", {
                value: valueInHex,
                valueInEth: ethersLib.formatEther(totalAmountInWei),
                beneficiary: beneficiaryAddress,
                arbiters,
                requiredConfirmations,
                milestoneCount: milestoneAmountsInWei.length,
                duration: durationInSeconds,
              });

              // Ensure all parameters are in the correct format
              const params = [
                beneficiaryAddress, // beneficiary parameter
                arbiters, // arbiters parameter
                requiredConfirmations, // requiredConfirmations parameter (uint8)
                milestoneAmountsInWei, // milestoneAmounts parameter (uint256[])
                milestoneDescriptions, // milestoneDescriptions parameter (string[])
                durationInSeconds, // duration parameter (uint256)
                formData.projectTitle, // projectTitle parameter (string)
                formData.projectDescription, // projectDescription parameter (string)
              ];

              // Calculate total from milestone amounts to verify it matches value
              const totalFromMilestones = milestoneAmountsInWei.reduce(
                (sum, amt) => sum + BigInt(amt),
                BigInt(0)
              );
              const valueInWei = BigInt(totalAmountInWei);

              console.log("📤 Calling createEscrowNative with params:", {
                value: valueInHex,
                valueInWei: valueInWei.toString(),
                totalFromMilestones: totalFromMilestones.toString(),
                valueMatches: valueInWei === totalFromMilestones,
                beneficiary: params[0],
                arbiters: params[1],
                requiredConfirmations: params[2],
                milestoneAmounts: params[3],
                milestoneAmountsSum: totalFromMilestones.toString(),
                milestoneDescriptions: params[4],
                duration: params[5],
                title: params[6],
                description: params[7],
              });

              if (valueInWei !== totalFromMilestones) {
                const { ethers } = await import("ethers");
                throw new Error(
                  `Value mismatch! msg.value (${ethers.formatEther(
                    valueInWei
                  )} ETH) must exactly equal total milestone amounts (${ethers.formatEther(
                    totalFromMilestones
                  )} ETH)`
                );
              }

              txHash = await escrowContract.send(
                "createEscrowNative",
                valueInHex, // msg.value in hex (native ETH amount) - this is the FIRST parameter to send()
                ...params // Spread the rest of the parameters
              );

              toast({
                title: "Escrow Created!",
                description: "Your escrow has been created successfully",
              });
            }
            break;
          } catch (txError: any) {
            txAttempts++;

            // Try to extract revert reason
            let revertReason = "Unknown error";
            try {
              const { ethers } = await import("ethers");
              if (txError.data) {
                const errorData = txError.data;
                if (
                  typeof errorData === "string" &&
                  errorData.startsWith("0x")
                ) {
                  try {
                    const decoded = ethers.toUtf8String(
                      "0x" + errorData.slice(-64)
                    );
                    if (decoded && decoded.trim().length > 0) {
                      revertReason = decoded.trim();
                    }
                  } catch (_) {
                    if (errorData.length > 10) {
                      revertReason = `Error data: ${errorData.slice(0, 20)}...`;
                    }
                  }
                }
              }
              if (txError.reason) {
                revertReason = txError.reason;
              }
              if (txError.message) {
                const dataMatch = txError.message.match(/data[=:]"?([^"]+)"?/);
                if (
                  dataMatch &&
                  dataMatch[1] &&
                  dataMatch[1] !== "0x" &&
                  dataMatch[1] !== ""
                ) {
                  try {
                    const decoded = ethers.toUtf8String(
                      "0x" + dataMatch[1].slice(-64)
                    );
                    if (decoded && decoded.trim().length > 0) {
                      revertReason = decoded.trim();
                    }
                  } catch (_) {}
                }
              }
            } catch (decodeError) {
              console.warn("Could not decode revert reason:", decodeError);
            }

            if (txAttempts >= maxTxAttempts) {
              // Provide better error message
              const errorMessage =
                txError.message || String(txError) || "Unknown error";
              console.error("❌ Final transaction error:", {
                message: errorMessage,
                revertReason: revertReason,
                errorData: txError.data,
                error: txError,
                beneficiary: beneficiaryAddress,
                isOpenJob: formData.isOpenJob,
                totalAmount: totalAmountInWei,
                arbiters,
                fullError: JSON.stringify(
                  txError,
                  Object.getOwnPropertyNames(txError)
                ),
              });

              if (
                errorMessage.includes("execution reverted") ||
                errorMessage.includes("revert")
              ) {
                // Check common revert reasons
                let specificError =
                  revertReason !== "Unknown error"
                    ? `Transaction failed: ${revertReason}`
                    : "Transaction failed. The contract reverted.";

                if (
                  errorMessage.includes("ArbiterNotAuthorized") ||
                  errorMessage.includes("arbiter") ||
                  errorMessage.includes("ARBITER")
                ) {
                  specificError =
                    "❌ Arbiter is not authorized. Please go to Admin page and authorize an arbiter first.";
                } else if (
                  errorMessage.includes("TokenNotWhitelisted") ||
                  errorMessage.includes("token") ||
                  errorMessage.includes("TOKEN")
                ) {
                  specificError =
                    "❌ Token is not whitelisted. Please whitelist the token from the Admin page.";
                } else if (
                  errorMessage.includes("paused") ||
                  errorMessage.includes("PAUSED")
                ) {
                  specificError =
                    "❌ Contract is paused. Please unpause from Admin page.";
                } else if (
                  errorMessage.includes("INV_AMT") ||
                  revertReason.includes("INV_AMT") ||
                  errorMessage.includes("InvalidAmount") ||
                  (errorMessage.includes("amount") &&
                    !errorMessage.includes("milestone"))
                ) {
                  // Check if this is for ERC20 token escrow
                  if (formData.token !== ZERO_ADDRESS) {
                    specificError =
                      "❌ Token transfer failed (INV_AMT). This usually means:\n1. Insufficient token balance - You don't have enough tokens\n2. Insufficient allowance - You need to approve the contract to spend your tokens\n\nPlease check:\n- Your token balance is sufficient\n- You've approved the contract to spend tokens (check token contract on Arbiscan)";
                  } else {
                    specificError =
                      "❌ Invalid amount. The contract checks: 1) Total milestone amounts must exactly match project budget, 2) Amounts must be greater than 0, 3) msg.value must exactly match total milestone amounts. Check console logs for exact values.";
                  }
                } else if (
                  errorMessage.includes("InvalidDuration") ||
                  errorMessage.includes("duration") ||
                  errorMessage.includes("DURATION")
                ) {
                  specificError =
                    "❌ Invalid duration. Duration must be between 1 hour (3600 seconds) and 365 days (31536000 seconds).";
                } else if (
                  errorMessage.includes("beneficiary") ||
                  errorMessage.includes("depositor") ||
                  (beneficiaryAddress &&
                    beneficiaryAddress.toLowerCase() ===
                      wallet.address?.toLowerCase())
                ) {
                  specificError =
                    "❌ Beneficiary cannot be the same as depositor. For open jobs, use the 'Open Job' checkbox. For regular escrows, use a different beneficiary address.";
                } else if (
                  errorMessage.includes("TooManyArbiters") ||
                  errorMessage.includes("arbiters")
                ) {
                  specificError =
                    "❌ Invalid arbiters. Check: 1) At least one arbiter is provided, 2) All arbiters are authorized, 3) Required confirmations is valid.";
                }

                throw new Error(
                  `${specificError}\n\nDebug: Check browser console for parameter logs. Common issues:\n1. Contract paused? Check Admin page\n2. Arbiter authorized? Check Admin → Arbiter Management\n3. Amounts match? Total milestones must = project budget exactly\n4. Beneficiary valid? Cannot be your wallet for non-open jobs`
                );
              }

              // If it's an encoding error
              if (
                errorMessage.includes("encode") ||
                errorMessage.includes("ABI") ||
                errorMessage.includes("data")
              ) {
                throw new Error(
                  `Transaction encoding failed: ${errorMessage}\n\nThis usually means there's a parameter type mismatch. Check console logs for exact parameters.`
                );
              }

              throw txError;
            }

            // Wait before retry with exponential backoff
            const waitTime = Math.pow(2, txAttempts) * 1000; // 2s, 4s, 8s
            await new Promise((resolve) => setTimeout(resolve, waitTime));
          }
        }
      } else {
        // Use createEscrow for ERC20 tokens
        // Check if arbiter is authorized before using
        const defaultArbiter = "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41";
        let arbiters = [defaultArbiter];
        const requiredConfirmations = 1;

        // Verify arbiter is authorized
        try {
          const isArbiterAuthorized = await escrowContract.call(
            "authorizedArbiters",
            defaultArbiter
          );
          if (!isArbiterAuthorized) {
            if (!isOpenJob) {
              throw new Error(
                "Default arbiter is not authorized. Please authorize an arbiter from the admin page first, or create an open job."
              );
            }
            arbiters = [];
          }
        } catch (arbiterError) {
          console.warn("Could not verify arbiter authorization:", arbiterError);
        }

        // Convert milestone amounts to wei for ERC20 tokens
        const milestoneAmountsInWei = formData.milestones.map((m) =>
          BigInt(Math.floor(Number.parseFloat(m.amount) * 10 ** 18)).toString()
        );

        // Convert duration from days to seconds
        const durationInSeconds = Number(formData.duration) * 24 * 60 * 60;

        // Check if we should use Smart Account for gasless transaction
        if (isSmartAccountReady) {
          // Use Smart Account for gasless ERC20 escrow creation
          const { ethers } = await import("ethers");
          const iface = new ethers.Interface(SECUREFLOW_ABI);
          const data = iface.encodeFunctionData("createEscrow", [
            beneficiaryAddress, // beneficiary parameter
            arbiters, // arbiters parameter
            requiredConfirmations, // requiredConfirmations parameter
            milestoneAmountsInWei, // milestoneAmounts parameter (in wei)
            milestoneDescriptions, // milestoneDescriptions parameter
            formData.token, // token parameter
            durationInSeconds, // duration parameter (in seconds)
            formData.projectTitle, // projectTitle parameter
            formData.projectDescription, // projectDescription parameter
          ]);

          txHash = await executeTransaction(
            CONTRACTS.SECUREFLOW_ESCROW,
            data,
            "0" // No ETH value for ERC20
          );

          toast({
            title: "🚀 Gasless ERC20 Escrow Created!",
            description:
              "ERC20 escrow created with no gas fees using Smart Account delegation",
          });
        } else {
          // Use regular transaction
          txHash = await escrowContract.send(
            "createEscrow",
            "no-value", // No msg.value for ERC20
            beneficiaryAddress, // beneficiary parameter
            arbiters, // arbiters parameter
            requiredConfirmations, // requiredConfirmations parameter
            milestoneAmountsInWei, // milestoneAmounts parameter (in wei)
            milestoneDescriptions, // milestoneDescriptions parameter
            formData.token, // token parameter
            durationInSeconds, // duration parameter (in seconds)
            formData.projectTitle, // projectTitle parameter
            formData.projectDescription // projectDescription parameter
          );

          toast({
            title: "ERC20 Escrow Created!",
            description: "Your ERC20 escrow has been created successfully",
          });
        }
      }

      // Wait for transaction confirmation
      // Note: Success toast is already shown in Smart Account/regular transaction logic above

      // For Smart Account transactions, we still need to wait for confirmation
      // but the Smart Account pays the gas fees
      if (isSmartAccountReady) {
        // Smart Account transactions are real but gasless for the user

        // Wait for real blockchain confirmation
        let receipt;
        let attempts = 0;
        const maxAttempts = 30; // 30 attempts * 2 seconds = 1 minute timeout

        while (attempts < maxAttempts) {
          try {
            receipt = await window.ethereum.request({
              method: "eth_getTransactionReceipt",
              params: [txHash],
            });

            if (receipt) {
              break;
            }
          } catch (error) {}

          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
          attempts++;
        }

        if (!receipt) {
          throw new Error(
            "Transaction timeout - please check the blockchain explorer"
          );
        }

        if (receipt.status === "0x1") {
          // Transaction successful
          toast({
            title: isOpenJob
              ? "🚀 Gasless Job Posted!"
              : "🚀 Gasless Escrow Created!",
            description: isOpenJob
              ? "Your job is now live with no gas fees! Freelancers can apply on the Browse Jobs page."
              : "Your escrow has been created successfully with no gas fees! The freelancer can now start working.",
          });

          setTimeout(() => {
            router.push(isOpenJob ? "/jobs" : "/dashboard");
          }, 2000);
        } else {
          throw new Error("Transaction failed on blockchain");
        }
      } else {
        // For regular transactions, wait for blockchain confirmation
        let receipt;
        let attempts = 0;
        const maxAttempts = 30; // 30 attempts * 2 seconds = 1 minute timeout

        while (attempts < maxAttempts) {
          try {
            receipt = await window.ethereum.request({
              method: "eth_getTransactionReceipt",
              params: [txHash],
            });

            if (receipt) {
              break;
            }
          } catch (error) {}

          await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
          attempts++;
        }

        if (!receipt) {
          throw new Error(
            "Transaction timeout - please check the blockchain explorer"
          );
        }

        if (receipt.status === "0x1") {
          // Transaction successful
          toast({
            title: isOpenJob ? "Job posted!" : "Escrow created!",
            description: isOpenJob
              ? "Your job is now live. Freelancers can apply on the Browse Jobs page."
              : "Your escrow has been successfully created",
          });

          setTimeout(() => {
            router.push(isOpenJob ? "/jobs" : "/dashboard");
          }, 2000);
        } else {
          // Transaction failed - try to get revert reason by simulating the call
          let revertReason = "Unknown error";
          try {
            const { ethers } = await import("ethers");
            const provider = new ethers.JsonRpcProvider(
              "https://sepolia-rollup.arbitrum.io/rpc"
            );
            const contractAddress = CONTRACTS.SECUREFLOW_ESCROW;
            const iface = new ethers.Interface(SECUREFLOW_ABI);

            // Reconstruct parameters from formData
            const totalAmountInWei = BigInt(
              Math.floor(Number.parseFloat(formData.totalBudget) * 10 ** 18)
            );
            const milestoneAmountsInWei = formData.milestones.map((m) => {
              const amount = Number.parseFloat(m.amount);
              return BigInt(Math.floor(amount * 10 ** 18)).toString();
            });
            const milestoneDescriptions = formData.milestones.map(
              (m) => m.description
            );
            const durationInSeconds = Number(formData.duration) * 24 * 60 * 60;
            const defaultArbiter = "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41";
            const arbiters = [defaultArbiter];
            const requiredConfirmations = 1;
            const valueInHex = `0x${totalAmountInWei.toString(16)}`;

            const functionName =
              formData.token === ZERO_ADDRESS
                ? "createEscrowNative"
                : "createEscrow";
            const params =
              formData.token === ZERO_ADDRESS
                ? [
                    beneficiaryAddress,
                    arbiters,
                    requiredConfirmations,
                    milestoneAmountsInWei,
                    milestoneDescriptions,
                    durationInSeconds,
                    formData.projectTitle,
                    formData.projectDescription,
                  ]
                : [
                    beneficiaryAddress,
                    arbiters,
                    requiredConfirmations,
                    milestoneAmountsInWei,
                    milestoneDescriptions,
                    formData.token,
                    durationInSeconds,
                    formData.projectTitle,
                    formData.projectDescription,
                  ];

            const data = iface.encodeFunctionData(functionName, params);
            const value = formData.token === ZERO_ADDRESS ? valueInHex : "0x0";

            // Simulate the call to get revert reason
            try {
              await provider.call({
                to: contractAddress,
                data,
                value,
                from: wallet.address,
              });
            } catch (simError: any) {
              // Extract revert reason from simulation error
              if (simError.data) {
                const errorData = simError.data;
                if (
                  typeof errorData === "string" &&
                  errorData.startsWith("0x") &&
                  errorData.length > 10
                ) {
                  try {
                    // Try to decode as UTF-8 (Stylus error codes like "UNAUTH", "PAUSED", etc.)
                    // The error data might be padded, so try different slice positions
                    let decoded = "";
                    for (let offset = 0; offset < 32; offset += 2) {
                      try {
                        const slice = errorData.slice(2 + offset); // Skip '0x' and try different offsets
                        if (slice.length >= 2) {
                          decoded = ethers.toUtf8String("0x" + slice);
                          if (
                            decoded &&
                            decoded.trim().length > 0 &&
                            /^[A-Z_]+$/.test(decoded.trim())
                          ) {
                            revertReason = decoded.trim();
                            break;
                          }
                        }
                      } catch (_) {}
                    }

                    // If UTF-8 decode didn't work, try direct hex to ASCII
                    if (!revertReason || revertReason === "Unknown error") {
                      try {
                        const hexStr = errorData.slice(2); // Remove '0x'
                        let asciiStr = "";
                        for (let i = 0; i < hexStr.length; i += 2) {
                          const hex = hexStr.substr(i, 2);
                          const charCode = parseInt(hex, 16);
                          if (charCode >= 32 && charCode <= 126) {
                            asciiStr += String.fromCharCode(charCode);
                          } else {
                            break;
                          }
                        }
                        if (asciiStr.length > 0) {
                          revertReason = asciiStr;
                        } else {
                          revertReason = `Error hex: ${errorData.slice(
                            0,
                            42
                          )}...`;
                        }
                      } catch (_) {
                        revertReason = `Error hex: ${errorData.slice(
                          0,
                          42
                        )}...`;
                      }
                    }
                  } catch (_) {
                    revertReason = `Error hex: ${errorData.slice(0, 42)}...`;
                  }
                }
              }
              if (simError.reason) {
                revertReason = simError.reason;
              }
              if (simError.message) {
                const dataMatch = simError.message.match(/data[=:]"?([^"]+)"?/);
                if (
                  dataMatch &&
                  dataMatch[1] &&
                  dataMatch[1] !== "0x" &&
                  dataMatch[1] !== ""
                ) {
                  try {
                    const decoded = ethers.toUtf8String(
                      "0x" + dataMatch[1].slice(-64)
                    );
                    if (decoded && decoded.trim().length > 0) {
                      revertReason = decoded.trim();
                    }
                  } catch (_) {}
                }
              }
              // Map error codes to user-friendly messages
              const errorMessages: { [key: string]: string } = {
                INV_AMT:
                  formData.token !== ZERO_ADDRESS
                    ? "Token transfer failed. You need to:\n1. Have sufficient token balance\n2. Approve the contract to spend your tokens (call approve() on the token contract)"
                    : "Invalid amount - check that milestone amounts match the total budget exactly",
                UNAUTH:
                  "Unauthorized - you don't have permission for this action",
                PAUSED: "Contract is paused - please unpause from Admin page",
                JOB_PAUSED:
                  "Job creation is paused - please unpause from Admin page",
                ARB_NW:
                  "Arbiter not authorized - please authorize arbiter from Admin page",
                TOKEN_NW:
                  "Token not whitelisted - please whitelist token from Admin page",
                VALUE_MIS:
                  "Value mismatch - ETH sent doesn't match total milestone amounts",
                BENEF_EQ_DEP: "Beneficiary cannot be the same as depositor",
                EMPTY_MS:
                  "Empty milestones - at least one milestone is required",
                ZERO_MS_AMT:
                  "Zero milestone amount - all milestone amounts must be greater than 0",
                MS_COUNT_MIS:
                  "Milestone count mismatch - amounts and descriptions must match",
                EMPTY_TITLE: "Empty project title - project title is required",
              };

              const friendlyMessage =
                errorMessages[revertReason] || revertReason;

              console.error(
                "❌ Transaction simulation error (this shows why it failed):",
                {
                  revertReason,
                  friendlyMessage,
                  errorCode: revertReason,
                  errorData: simError.data,
                  errorDataString:
                    typeof simError.data === "string"
                      ? simError.data
                      : JSON.stringify(simError.data),
                  message: simError.message,
                  fullError: simError,
                  errorKeys: Object.keys(simError),
                }
              );

              // Update revertReason with friendly message
              revertReason = friendlyMessage;
            }
          } catch (decodeError) {
            console.warn(
              "Could not decode revert reason from receipt:",
              decodeError
            );
          }

          console.error("❌ Transaction failed on blockchain:", {
            txHash,
            receipt,
            revertReason,
          });

          throw new Error(`Transaction failed on blockchain: ${revertReason}`);
        }
      }
    } catch (error: any) {
      let errorMessage = "Failed to create escrow";
      let revertReason = "Unknown error";

      // Try to extract revert reason
      try {
        const { ethers } = await import("ethers");
        if (error.data) {
          const errorData = error.data;
          if (typeof errorData === "string" && errorData.startsWith("0x")) {
            try {
              const decoded = ethers.toUtf8String("0x" + errorData.slice(-64));
              if (decoded && decoded.trim().length > 0) {
                revertReason = decoded.trim();
              }
            } catch (_) {
              if (errorData.length > 10) {
                revertReason = `Error data: ${errorData.slice(0, 20)}...`;
              }
            }
          }
        }
        if (error.reason) {
          revertReason = error.reason;
        }
        if (error.message) {
          const dataMatch = error.message.match(/data[=:]"?([^"]+)"?/);
          if (
            dataMatch &&
            dataMatch[1] &&
            dataMatch[1] !== "0x" &&
            dataMatch[1] !== ""
          ) {
            try {
              const decoded = ethers.toUtf8String(
                "0x" + dataMatch[1].slice(-64)
              );
              if (decoded && decoded.trim().length > 0) {
                revertReason = decoded.trim();
              }
            } catch (_) {}
          }
        }
      } catch (decodeError) {
        console.warn(
          "Could not decode revert reason in outer catch:",
          decodeError
        );
      }

      if (
        error.message?.includes("insufficient") ||
        error.message?.includes("Insufficient")
      ) {
        // Use the original error message if it's about insufficient balance
        errorMessage =
          error.message.includes("ETH balance") ||
          error.message.includes("token balance")
            ? error.message
            : "Insufficient funds. Please check your balance.";
      } else if (
        error.message?.includes("gas") ||
        error.message?.includes("estimateGas")
      ) {
        errorMessage =
          revertReason !== "Unknown error"
            ? `Gas estimation failed: ${revertReason}`
            : "Gas estimation failed. The contract may be reverting. Common causes:\n1. Contract is paused (check Admin page)\n2. Arbiter not authorized (check Admin → Arbiter Management)\n3. Invalid parameters (check console logs)\n4. Contract not initialized\n\nThe transaction will still be attempted with a fallback gas limit, but it may fail if the contract is reverting.";
      } else if (error.message?.includes("revert")) {
        errorMessage =
          revertReason !== "Unknown error"
            ? `Transaction reverted: ${revertReason}`
            : "Transaction reverted. Please check your parameters.";
      } else if (error.message?.includes("user rejected")) {
        errorMessage = "Transaction was rejected by user.";
      } else if (error.message?.includes("timeout")) {
        errorMessage = "Transaction timeout. Please try again.";
      } else if (error.message?.includes("Internal JSON-RPC error")) {
        errorMessage =
          revertReason !== "Unknown error"
            ? `Network error: ${revertReason}`
            : "Network error occurred. Please try again - this usually works on the second attempt.";
      } else if (error.code === -32603) {
        errorMessage =
          revertReason !== "Unknown error"
            ? `RPC error: ${revertReason}`
            : "RPC error occurred. Please try again - this usually works on the second attempt.";
      } else {
        errorMessage =
          revertReason !== "Unknown error"
            ? `${error.message || "Failed to create escrow"}: ${revertReason}`
            : error.message || "Failed to create escrow";
      }

      console.error("❌ Escrow creation error with revert reason:", {
        errorMessage,
        revertReason,
        errorData: error.data,
        fullError: error,
      });

      toast({
        title: "Creation failed",
        description: errorMessage,
        variant: "destructive",
      });

      // If it's an RPC error, show an additional helpful message
      if (
        error.message?.includes("Internal JSON-RPC error") ||
        error.code === -32603
      ) {
        setTimeout(() => {
          toast({
            title: "💡 Tip",
            description:
              "This is a common network issue. Please try creating the escrow again - it usually works on the second attempt!",
            variant: "default",
          });
        }, 2000);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen py-12 gradient-mesh">
      {/* Network Switch Banner */}
      {!isOnCorrectNetwork && wallet.isConnected && (
        <div className="container mx-auto px-4 max-w-4xl mb-6">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <div>
                  <h3 className="font-semibold text-destructive">
                    Wrong Network
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Please switch to Arbitrum Sepolia Testnet to create escrows
                  </p>
                </div>
              </div>
              <Button
                onClick={switchToArbitrumSepolia}
                variant="destructive"
                size="sm"
              >
                Switch to Arbitrum Sepolia
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 max-w-4xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold mb-4 text-center">
            Create New Escrow
          </h1>
          <p className="text-xl text-muted-foreground text-center mb-12">
            Set up a secure escrow with milestone-based payments
          </p>

          <div className="flex items-center justify-center mb-12">
            <div className="flex items-center gap-4">
              {[1, 2, 3].map((s) => (
                <div key={s} className="flex items-center gap-4">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      s === step
                        ? "border-primary bg-primary text-primary-foreground"
                        : s < step
                        ? "border-primary bg-primary/20 text-primary"
                        : "border-muted-foreground/30 text-muted-foreground"
                    }`}
                  >
                    {s < step ? <CheckCircle2 className="h-5 w-5" /> : s}
                  </div>
                  {s < 3 && (
                    <div
                      className={`w-16 h-0.5 ${
                        s < step ? "bg-primary" : "bg-muted-foreground/30"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ProjectDetailsStep
                  formData={formData}
                  onUpdate={(data) => {
                    // If useNativeToken is checked, automatically set token to ZERO_ADDRESS
                    if (data.useNativeToken) {
                      setFormData({
                        ...formData,
                        ...data,
                        token: ZERO_ADDRESS,
                      });
                    } else {
                      setFormData({ ...formData, ...data });
                    }
                    clearErrors();
                  }}
                  isContractPaused={isContractPaused}
                  errors={{
                    projectTitle: errors.projectTitle,
                    projectDescription: errors.projectDescription,
                    duration: errors.duration,
                    totalBudget: errors.totalBudget,
                    beneficiary: errors.beneficiary,
                    tokenAddress: errors.tokenAddress,
                  }}
                />
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <MilestonesStep
                  milestones={formData.milestones}
                  onUpdate={(milestones) => {
                    setFormData({ ...formData, milestones });
                    clearErrors();
                  }}
                  showAIWriter={showAIWriter}
                  onToggleAIWriter={setShowAIWriter}
                  currentMilestoneIndex={currentMilestoneIndex}
                  onSetCurrentMilestoneIndex={setCurrentMilestoneIndex}
                  totalBudget={formData.totalBudget}
                  errors={{
                    milestones: errors.milestones,
                    totalMismatch: errors.totalMismatch,
                  }}
                />
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <ReviewStep
                  formData={formData}
                  onConfirm={handleSubmit}
                  isSubmitting={isSubmitting}
                  isContractPaused={isContractPaused}
                  isOnCorrectNetwork={isOnCorrectNetwork}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-between mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={prevStep}
              disabled={step === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>

            <Button
              type="button"
              onClick={nextStep}
              disabled={step === 3}
              className="flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
