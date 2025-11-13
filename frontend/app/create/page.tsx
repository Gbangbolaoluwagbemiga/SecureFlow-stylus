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

      const beneficiaryAddress = formData.isOpenJob
        ? "0x0000000000000000000000000000000000000000" // Zero address for open jobs
        : formData.beneficiary || "0x0000000000000000000000000000000000000000";

      let txHash;

      if (formData.token === ZERO_ADDRESS) {
        // Use createEscrowNative for native ETH tokens
        const totalAmountInWei = BigInt(
          Math.floor(Number.parseFloat(formData.totalBudget) * 10 ** 18)
        ).toString();

        // Check native token balance
        try {
          const balance = await window.ethereum.request({
            method: "eth_getBalance",
            params: [wallet.address],
          });

          const balanceInWei = BigInt(balance);
          const requiredAmount = BigInt(totalAmountInWei);

          if (balanceInWei < requiredAmount) {
            throw new Error(
              `Insufficient MON balance. You have ${(
                Number(balanceInWei) /
                10 ** 18
              ).toFixed(4)} MON but need ${formData.totalBudget} MON.`
            );
          }
        } catch (balanceError) {
          throw new Error(
            "Failed to check MON balance. Please ensure you have enough MON tokens."
          );
        }

        // Convert milestone amounts to wei (BigInt)
        const milestoneAmountsInWei = formData.milestones.map((m) =>
          BigInt(Math.floor(Number.parseFloat(m.amount) * 10 ** 18)).toString()
        );

        // Check if arbiter is authorized before using
        const defaultArbiter = "0x3be7fbbdbc73fc4731d60ef09c4ba1a94dc58e41";
        let arbiters = [defaultArbiter];
        const requiredConfirmations = 1;

        // Verify arbiter is authorized (contract requires authorized arbiters)
        try {
          const isArbiterAuthorized = await escrowContract.call(
            "authorizedArbiters",
            defaultArbiter
          );
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
        const durationInSeconds = Number(formData.duration) * 24 * 60 * 60;

        // Retry transaction with exponential backoff
        let txAttempts = 0;
        const maxTxAttempts = 3;

        while (txAttempts < maxTxAttempts) {
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

              txHash = await escrowContract.send(
                "createEscrowNative",
                valueInHex, // msg.value in hex (native ETH amount)
                beneficiaryAddress, // beneficiary parameter
                arbiters, // arbiters parameter
                requiredConfirmations, // requiredConfirmations parameter
                milestoneAmountsInWei, // milestoneAmounts parameter (in wei)
                milestoneDescriptions, // milestoneDescriptions parameter
                durationInSeconds, // duration parameter (in seconds)
                formData.projectTitle, // projectTitle parameter
                formData.projectDescription // projectDescription parameter
              );

              toast({
                title: "Escrow Created!",
                description: "Your escrow has been created successfully",
              });
            }
            break;
          } catch (txError: any) {
            txAttempts++;

            if (txAttempts >= maxTxAttempts) {
              // Provide better error message
              const errorMessage = txError.message || "Unknown error";
              if (errorMessage.includes("execution reverted")) {
                // Check common revert reasons
                let specificError =
                  "Transaction failed. The contract reverted.";

                if (
                  errorMessage.includes("ArbiterNotAuthorized") ||
                  errorMessage.includes("arbiter")
                ) {
                  specificError =
                    "Arbiter is not authorized. Please go to Admin page and authorize an arbiter first.";
                } else if (
                  errorMessage.includes("TokenNotWhitelisted") ||
                  errorMessage.includes("token")
                ) {
                  specificError =
                    "Token is not whitelisted. Please whitelist the token from the Admin page.";
                } else if (errorMessage.includes("paused")) {
                  specificError =
                    "Contract is paused. Please unpause from Admin page.";
                } else if (
                  errorMessage.includes("InvalidAmount") ||
                  errorMessage.includes("amount")
                ) {
                  specificError =
                    "Invalid amount. Check: 1) Total milestone amounts match project budget, 2) Amounts are greater than 0, 3) You sent the correct ETH value.";
                } else if (errorMessage.includes("InvalidDuration")) {
                  specificError =
                    "Invalid duration. Duration must be between 1 hour and 365 days.";
                }

                throw new Error(
                  `${specificError} Common checks: 1) Contract is not paused, 2) Arbiter is authorized, 3) Token is whitelisted (if using ERC20), 4) You have sufficient balance, 5) All parameters are valid.`
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
          // Transaction failed
          throw new Error("Transaction failed on blockchain");
        }
      }
    } catch (error: any) {
      let errorMessage = "Failed to create escrow";

      if (error.message?.includes("insufficient funds")) {
        errorMessage = "Insufficient funds. Please check your balance.";
      } else if (error.message?.includes("gas")) {
        errorMessage = "Gas estimation failed. Please try again.";
      } else if (error.message?.includes("revert")) {
        errorMessage = "Transaction reverted. Please check your parameters.";
      } else if (error.message?.includes("user rejected")) {
        errorMessage = "Transaction was rejected by user.";
      } else if (error.message?.includes("timeout")) {
        errorMessage = "Transaction timeout. Please try again.";
      } else if (error.message?.includes("Internal JSON-RPC error")) {
        errorMessage =
          "Network error occurred. Please try again - this usually works on the second attempt.";
      } else if (error.code === -32603) {
        errorMessage =
          "RPC error occurred. Please try again - this usually works on the second attempt.";
      } else {
        errorMessage = error.message || "Failed to create escrow";
      }

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
