"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useWhitelistedTokens } from "@/hooks/use-whitelisted-tokens";
import { CONTRACTS, ZERO_ADDRESS } from "@/lib/web3/config";
import { useState, useEffect } from "react";

interface ProjectDetailsStepProps {
  formData: {
    projectTitle: string;
    projectDescription: string;
    duration: string;
    totalBudget: string;
    beneficiary: string;
    token: string;
    useNativeToken: boolean;
    isOpenJob: boolean;
  };
  onUpdate: (data: Partial<ProjectDetailsStepProps["formData"]>) => void;
  isContractPaused: boolean;
  errors?: {
    projectTitle?: string;
    projectDescription?: string;
    duration?: string;
    totalBudget?: string;
    beneficiary?: string;
    tokenAddress?: string;
  };
}

export function ProjectDetailsStep({
  formData,
  onUpdate,
  isContractPaused,
  errors = {},
}: ProjectDetailsStepProps) {
  const {
    whitelistedTokens,
    loading: tokensLoading,
    checkTokenWhitelisted,
  } = useWhitelistedTokens();
  const [tokenWhitelisted, setTokenWhitelisted] = useState<boolean | null>(
    null
  );
  const [checkingToken, setCheckingToken] = useState(false);

  // Check if current token is whitelisted when it changes (with debouncing)
  useEffect(() => {
    if (formData.token && !formData.useNativeToken) {
      // Debounce the check to avoid too frequent API calls
      const timeoutId = setTimeout(() => {
        setCheckingToken(true);
        checkTokenWhitelisted(formData.token)
          .then((isWhitelisted) => {
            setTokenWhitelisted(isWhitelisted);
          })
          .catch(() => {
            setTokenWhitelisted(null);
          })
          .finally(() => {
            setCheckingToken(false);
          });
      }, 800); // Wait 800ms after user stops typing

      return () => clearTimeout(timeoutId);
    } else {
      setTokenWhitelisted(null);
      setCheckingToken(false);
    }
  }, [formData.token, formData.useNativeToken, checkTokenWhitelisted]);

  return (
    <Card className="glass border-primary/20 p-6">
      <CardHeader>
        <CardTitle>Project Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isContractPaused && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Contract is currently paused. Escrow creation is temporarily
              disabled.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="projectTitle">Project Title *</Label>
            <Input
              id="projectTitle"
              value={formData.projectTitle}
              onChange={(e) => onUpdate({ projectTitle: e.target.value })}
              placeholder="Enter project title"
              required
              minLength={3}
              className={
                errors.projectTitle ? "border-red-500 focus:border-red-500" : ""
              }
            />
            {errors.projectTitle && (
              <p className="text-red-500 text-sm mt-1">{errors.projectTitle}</p>
            )}
          </div>

          <div>
            <Label htmlFor="duration">Duration (days) *</Label>
            <Input
              id="duration"
              type="number"
              value={formData.duration}
              onChange={(e) => onUpdate({ duration: e.target.value })}
              placeholder="e.g., 30"
              min="1"
              max="365"
              required
              className={
                errors.duration ? "border-red-500 focus:border-red-500" : ""
              }
            />
            {errors.duration && (
              <p className="text-red-500 text-sm mt-1">{errors.duration}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor="projectDescription">Project Description *</Label>
          <Textarea
            id="projectDescription"
            value={formData.projectDescription}
            onChange={(e) => onUpdate({ projectDescription: e.target.value })}
            placeholder="Describe the project requirements and deliverables..."
            className={`min-h-[120px] ${
              errors.projectDescription
                ? "border-red-500 focus:border-red-500"
                : ""
            }`}
            required
            minLength={50}
          />
          {errors.projectDescription ? (
            <p className="text-red-500 text-sm mt-1">
              {errors.projectDescription}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1">
              Minimum 50 characters required
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="totalBudget">Total Budget (tokens) *</Label>
            <Input
              id="totalBudget"
              type="number"
              value={formData.totalBudget}
              onChange={(e) => onUpdate({ totalBudget: e.target.value })}
              placeholder="e.g., 1000"
              min="0.01"
              step="0.01"
              required
              className={
                errors.totalBudget ? "border-red-500 focus:border-red-500" : ""
              }
            />
            {errors.totalBudget ? (
              <p className="text-red-500 text-sm mt-1">{errors.totalBudget}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                Minimum 0.01 tokens required
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="beneficiary">
              Beneficiary Address {!formData.isOpenJob && "*"}
            </Label>
            <Input
              id="beneficiary"
              value={formData.beneficiary}
              onChange={(e) => onUpdate({ beneficiary: e.target.value })}
              placeholder="0x..."
              disabled={formData.isOpenJob}
              required={!formData.isOpenJob}
              pattern="^0x[a-fA-F0-9]{40}$"
              className={
                errors.beneficiary ? "border-red-500 focus:border-red-500" : ""
              }
            />
            {errors.beneficiary ? (
              <p className="text-red-500 text-sm mt-1">{errors.beneficiary}</p>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                {formData.isOpenJob
                  ? "Leave empty for open job applications"
                  : "Valid Ethereum address required for direct escrow"}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="useNativeToken"
              checked={formData.useNativeToken}
              onChange={(e) => onUpdate({ useNativeToken: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="useNativeToken">Use Native Token (ETH)</Label>
          </div>

          {!formData.useNativeToken && (
            <div className="space-y-2">
              <Label htmlFor="tokenAddress">Token Address *</Label>

              {/* Whitelisted tokens dropdown */}
              {whitelistedTokens.length > 0 && (
                <div className="mb-3">
                  <Label className="text-xs text-muted-foreground mb-2 block">
                    Whitelisted Tokens:
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {whitelistedTokens.map((token) => (
                      <Button
                        key={token.address}
                        type="button"
                        variant={
                          formData.token === token.address
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => onUpdate({ token: token.address })}
                        className="text-xs"
                      >
                        {token.symbol || token.name}
                        <span className="ml-1 text-[10px] opacity-70">
                          ({token.address.slice(0, 6)}...
                          {token.address.slice(-4)})
                        </span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Input
                id="tokenAddress"
                value={formData.token}
                onChange={(e) => onUpdate({ token: e.target.value })}
                placeholder="0x..."
                required={!formData.useNativeToken}
                pattern="^0x[a-fA-F0-9]{40}$"
                className={
                  errors.tokenAddress
                    ? "border-red-500 focus:border-red-500"
                    : tokenWhitelisted === false
                    ? "border-yellow-500 focus:border-yellow-500"
                    : tokenWhitelisted === true
                    ? "border-green-500 focus:border-green-500"
                    : ""
                }
              />

              {/* Token whitelist status */}
              {formData.token &&
                formData.token !== ZERO_ADDRESS &&
                !checkingToken && (
                  <div className="flex items-center gap-2 text-sm">
                    {tokenWhitelisted === true ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-green-500">
                          Token is whitelisted
                        </span>
                      </>
                    ) : tokenWhitelisted === false ? (
                      <>
                        <XCircle className="h-4 w-4 text-yellow-500" />
                        <span className="text-yellow-500">
                          Token is not whitelisted. Only whitelisted tokens can
                          be used.
                        </span>
                      </>
                    ) : null}
                  </div>
                )}

              {checkingToken && (
                <p className="text-xs text-muted-foreground">
                  Checking token status...
                </p>
              )}

              {errors.tokenAddress ? (
                <p className="text-red-500 text-sm mt-1">
                  {errors.tokenAddress}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground mt-1">
                  {whitelistedTokens.length > 0
                    ? "Select a whitelisted token above or enter a custom token address. Only whitelisted tokens are accepted."
                    : "Enter the contract address of your ERC20 token. The token must be whitelisted by the platform admin."}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isOpenJob"
              checked={formData.isOpenJob}
              onChange={(e) => onUpdate({ isOpenJob: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="isOpenJob">Open Job (Allow Applications)</Label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
