"use client";

import { useState, useCallback } from "react";
import { useWallet } from "@/lib/wallet";
import {
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  STACKS_API_URL,
  STACKS_NETWORK,
} from "@/constants";
import { useToast } from "@/components/ui/use-toast";
import {
  openContractCall,
} from "@stacks/connect";
import {
  stringAsciiCV,
  PostConditionMode,
} from "@stacks/transactions";

/**
 * Hook for minting an NFT on Stacks.
 * 1. Uploads image + metadata to IPFS via API route
 * 2. Calls the Clarity `mint-nft` function via Stacks wallet
 * 3. Waits for transaction confirmation via Hiro API polling
 */
export function useMintNFT() {
  const { connected, address } = useWallet();
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);

  const mint = useCallback(
    async (file: File, name: string, description: string) => {
      if (!connected || !address) {
        toast({
          title: "Wallet Not Connected",
          description: "Please connect your Stacks wallet first.",
          variant: "destructive",
        });
        return;
      }

      if (!CONTRACT_ADDRESS) {
        toast({
          title: "Configuration Error",
          description:
            "Contract address is not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS in .env.local.",
          variant: "destructive",
        });
        return;
      }

      try {
        setIsConfirmed(false);
        setTxHash(null);

        // ── Step 1: Upload to IPFS ──
        setIsUploading(true);
        toast({
          title: "📤 Step 1/3: Uploading to IPFS...",
          description:
            "Uploading your image and metadata to decentralized storage.",
        });
        console.log("[Mint] Step 1: Starting IPFS upload...");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("name", name);
        formData.append("description", description);

        const uploadRes = await fetch("/api/pinata/upload", {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes
            .json()
            .catch(() => ({ error: "Upload failed" }));
          throw new Error(
            errData.error || `Upload failed (${uploadRes.status})`
          );
        }

        const { tokenURI } = await uploadRes.json();
        if (!tokenURI)
          throw new Error("No token URI returned from IPFS upload");

        setIsUploading(false);
        console.log("[Mint] Step 1 complete. Token URI:", tokenURI);
        toast({
          title: "✅ Step 1/3: Upload Complete",
          description: `Metadata stored on IPFS. Token URI: ${tokenURI.slice(0, 40)}...`,
        });

        // ── Step 2: Call Clarity contract via Stacks wallet ──
        setIsMinting(true);
        toast({
          title: "🔐 Step 2/3: Confirm in Wallet",
          description:
            "Please approve the mint transaction in your Stacks wallet.",
        });
        console.log("[Mint] Step 2: Calling Clarity contract...");
        console.log("[Mint] Contract:", `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`);

        // Stacks contract call returns via callback
        await new Promise<void>((resolve, reject) => {
          openContractCall({
            contractAddress: CONTRACT_ADDRESS,
            contractName: CONTRACT_NAME,
            functionName: "mint-nft",
            functionArgs: [stringAsciiCV(tokenURI)],
            postConditionMode: PostConditionMode.Allow,
            network: STACKS_NETWORK,
            onFinish: async (data) => {
              const txId = data.txId;
              setTxHash(txId);
              setIsMinting(false);
              console.log("[Mint] Step 2 complete. Tx ID:", txId);

              // ── Step 3: Wait for confirmation ──
              setIsConfirming(true);
              toast({
                title: "⏳ Step 3/3: Waiting for Confirmation...",
                description: `Tx: ${txId.slice(0, 12)}... Confirming on Stacks.`,
              });
              console.log("[Mint] Step 3: Waiting for confirmation...");

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
                    } else if (txData.tx_status === "abort_by_response" || txData.tx_status === "abort_by_post_condition") {
                      console.error("[Mint] Transaction failed:", txData.tx_status);
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
                  ? "🎉 NFT Minted Successfully!"
                  : "⚠️ Transaction may still be pending",
                description: confirmed
                  ? "Your NFT is now live on Stacks. View it on the home page!"
                  : "Check the explorer for final status.",
              });
              console.log(
                "[Mint] Final status:",
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
              reject(new Error("User rejected transaction"));
            },
          });
        });
      } catch (err: any) {
        console.error("[Mint] Error:", err);
        const msg = err?.message || String(err);
        if (
          msg.includes("User") ||
          msg.includes("rejected") ||
          msg.includes("Rejected") ||
          msg.includes("cancel")
        ) {
          // Already handled by onCancel
        } else {
          toast({
            title: "Minting Failed",
            description: msg.slice(0, 200),
            variant: "destructive",
          });
        }
      } finally {
        setIsUploading(false);
        setIsMinting(false);
        setIsConfirming(false);
      }
    },
    [connected, address, toast]
  );

  const isProcessing = isUploading || isMinting || isConfirming;

  return {
    mint,
    isUploading,
    isMinting,
    isConfirming,
    isConfirmed,
    isProcessing,
    txHash,
  };
}
