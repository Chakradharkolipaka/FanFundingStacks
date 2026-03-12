"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/lib/wallet";
import {
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  DONATION_TOKEN_SYMBOL,
  STACKS_API_URL,
  STACKS_NETWORK,
} from "@/constants";
import { useToast } from "@/components/ui/use-toast";
import { openContractCall } from "@stacks/connect";
import {
  uintCV,
  PostConditionMode,
  makeStandardSTXPostCondition,
  FungibleConditionCode,
} from "@stacks/transactions";

/**
 * Hook for donating STX to an NFT creator on Stacks.
 * Uses the connected Stacks wallet to call the Clarity `donate` function.
 */
export function useDonate() {
  const { connected, address } = useWallet();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isConfirmed, setIsConfirmed] = useState(false);

  /**
   * @param tokenId - The token ID (uint) of the NFT to donate to
   * @param amountMicroStx - Amount in microSTX (1 STX = 10^6 microSTX)
   */
  const donate = useCallback(
    async (tokenId: string, amountMicroStx: bigint) => {
      if (!connected || !address) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your Stacks wallet.",
          variant: "destructive",
        });
        return;
      }
      if (!CONTRACT_ADDRESS) {
        toast({
          title: "Configuration Error",
          description:
            "Contract address is not set. Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local.",
          variant: "destructive",
        });
        return;
      }

      try {
        setIsLoading(true);
        setIsConfirmed(false);
        setTxHash(null);

        toast({
          title: "🔐 Step 1/2: Confirm in Wallet",
          description: `Please approve the ${DONATION_TOKEN_SYMBOL} donation in your Stacks wallet.`,
        });
        console.log("[Donate] Building transaction...");
        console.log("[Donate] Token ID:", tokenId);
        console.log("[Donate] Amount (microSTX):", amountMicroStx.toString());

        const tokenIdNum = parseInt(tokenId, 10);
        const amountNum = Number(amountMicroStx);

        // Create a post condition to ensure the STX transfer
        const postConditions = [
          makeStandardSTXPostCondition(
            address,
            FungibleConditionCode.LessEqual,
            amountNum
          ),
        ];

        await new Promise<void>((resolve, reject) => {
          openContractCall({
            contractAddress: CONTRACT_ADDRESS,
            contractName: CONTRACT_NAME,
            functionName: "donate",
            functionArgs: [uintCV(tokenIdNum), uintCV(amountNum)],
            postConditions,
            postConditionMode: PostConditionMode.Deny,
            network: STACKS_NETWORK,
            onFinish: async (data) => {
              const txId = data.txId;
              setTxHash(txId);
              console.log("[Donate] Transaction submitted. Tx ID:", txId);

              toast({
                title: "⏳ Step 2/2: Transaction Submitted",
                description: `Tx: ${txId.slice(0, 12)}... Waiting for confirmation.`,
              });

              // Wait for confirmation
              let confirmed = false;
              for (let i = 0; i < 60; i++) {
                try {
                  const txRes = await fetch(
                    `${STACKS_API_URL}/extended/v1/tx/${txId}`
                  );
                  if (txRes.ok) {
                    const txData = await txRes.json();
                    if (txData.tx_status === "success") {
                      confirmed = true;
                      break;
                    } else if (
                      txData.tx_status === "abort_by_response" ||
                      txData.tx_status === "abort_by_post_condition"
                    ) {
                      const repr = txData.tx_result?.repr || "";
                      let errorDetail = txData.tx_status;
                      if (repr.includes("u2") || repr.includes("u105")) {
                        errorDetail = "Cannot donate to yourself (sender = creator). Use a different wallet.";
                      } else if (repr.includes("u100")) {
                        errorDetail = "Invalid token ID — this NFT does not exist.";
                      } else if (repr.includes("u101")) {
                        errorDetail = "Donation amount must be greater than 0.";
                      } else if (repr.includes("u102")) {
                        errorDetail = "STX transfer failed — check your balance.";
                      }
                      console.error("[Donate] Transaction failed:", txData.tx_status, repr);
                      toast({
                        title: "❌ Donation Failed",
                        description: errorDetail,
                        variant: "destructive",
                      });
                      break;
                    }
                  }
                } catch {
                  // retry
                }
                await new Promise((r) => setTimeout(r, 3000));
              }

              setIsConfirmed(confirmed);
              toast({
                title: confirmed
                  ? "✅ Donation Successful!"
                  : "⚠️ Transaction may still be pending",
                description: confirmed
                  ? "Thank you for supporting this creator on Stacks!"
                  : "Check the explorer for final status.",
              });
              console.log(
                "[Donate] Final status:",
                confirmed ? "CONFIRMED" : "PENDING"
              );
              resolve();
            },
            onCancel: () => {
              toast({
                title: "Transaction Rejected",
                description: "You rejected the transaction in your wallet.",
                variant: "destructive",
              });
              reject(new Error("User rejected"));
            },
          });
        });
      } catch (err: any) {
        console.error("[Donate] Error:", err);
        const msg = err?.message || String(err);
        if (
          msg.includes("User") ||
          msg.includes("rejected") ||
          msg.includes("Rejected") ||
          msg.includes("cancel")
        ) {
          // Already handled
        } else {
          toast({
            title: "Donation Failed",
            description: msg.slice(0, 200),
            variant: "destructive",
          });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [connected, address, toast]
  );

  return { donate, isLoading, txHash, isConfirmed };
}
