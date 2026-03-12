"use client";

import { useState, useEffect, useCallback } from "react";
import {
  CONTRACT_ADDRESS,
  CONTRACT_NAME,
  STACKS_API_URL,
} from "@/constants";

export interface NftData {
  tokenId: number;
  objectId: string; // on Stacks, this is the token-id as a string (for compatibility)
  metadata: Record<string, any>;
  owner: string;
  totalDonations: bigint;
}

/**
 * Hook to fetch all NFTs from the Stacks Clarity contract.
 *
 * Uses the Hiro Stacks API to:
 * 1. Read `get-total-supply` to know how many tokens exist.
 * 2. For each token-id, read `get-token-uri`, `get-creator`, `get-total-donations`.
 * 3. Fetch IPFS metadata from each token URI.
 */
export function useNFTs() {
  const [nfts, setNfts] = useState<NftData[]>([]);
  const [totalSupply, setTotalSupply] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const callReadOnly = useCallback(
    async (functionName: string, args: string[] = []) => {
      const url = `${STACKS_API_URL}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/${functionName}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: CONTRACT_ADDRESS,
          arguments: args,
        }),
      });
      if (!res.ok) {
        throw new Error(`Read-only call failed: ${res.status}`);
      }
      return res.json();
    },
    []
  );

  /**
   * Decode a Clarity value from hex representation.
   * Handles common types: uint, optional, string-ascii.
   * Simplified parser for the Stacks API response.
   */
  const decodeClarityValue = useCallback((hex: string): any => {
    if (!hex || hex === "0x09") return null; // none

    // Remove 0x prefix
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;

    // Type byte
    const typeByte = parseInt(clean.slice(0, 2), 16);

    // 0x01 = int, 0x00 = int (negative)
    // response ok = 0x07, response err = 0x08
    // optional some = 0x0a, optional none = 0x09
    // uint = 0x01
    // string-ascii = 0x0d
    // principal = 0x05

    if (typeByte === 0x07) {
      // (ok value) — recurse into the inner value
      return decodeClarityValue("0x" + clean.slice(2));
    }

    if (typeByte === 0x09) {
      // none
      return null;
    }

    if (typeByte === 0x0a) {
      // (some value) — recurse
      return decodeClarityValue("0x" + clean.slice(2));
    }

    if (typeByte === 0x01) {
      // uint — next 16 bytes (128-bit big-endian)
      const numHex = clean.slice(2, 34);
      return BigInt("0x" + numHex);
    }

    if (typeByte === 0x0d) {
      // string-ascii — 4-byte length prefix then ASCII bytes
      const len = parseInt(clean.slice(2, 10), 16);
      const strBytes = clean.slice(10, 10 + len * 2);
      let str = "";
      for (let i = 0; i < strBytes.length; i += 2) {
        str += String.fromCharCode(parseInt(strBytes.slice(i, i + 2), 16));
      }
      return str;
    }

    if (typeByte === 0x05 || typeByte === 0x06) {
      // standard principal (0x05) or contract principal (0x06)
      // For simplicity, return the hex — we'll handle principal display differently
      return clean;
    }

    // Fallback
    return hex;
  }, []);

  const fetchNFTs = useCallback(async () => {
    if (!CONTRACT_ADDRESS || !CONTRACT_NAME) {
      console.warn("[useNFTs] CONTRACT_ADDRESS or CONTRACT_NAME not set — skipping NFT fetch");
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      console.log("[useNFTs] Fetching NFTs from Stacks...");
      console.log("[useNFTs] Contract:", `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`);

      // 1. Get total supply
      const supplyRes = await callReadOnly("get-total-supply");
      if (!supplyRes.okay || !supplyRes.result) {
        throw new Error("Failed to read total supply");
      }

      const supply = Number(decodeClarityValue(supplyRes.result));
      setTotalSupply(supply);
      console.log("[useNFTs] Total supply:", supply);

      if (supply === 0) {
        setNfts([]);
        setIsLoading(false);
        return;
      }

      // 2. Fetch each NFT's data
      const nftPromises = Array.from({ length: supply }, (_, i) => i + 1).map(
        async (tokenId) => {
          try {
            // Encode uint argument as Clarity hex: 0x01 + 16-byte big-endian
            const tokenIdHex =
              "0x01" + tokenId.toString(16).padStart(32, "0");

            const [uriRes, creatorRes, donationsRes] = await Promise.all([
              callReadOnly("get-token-uri", [tokenIdHex]),
              callReadOnly("get-creator", [tokenIdHex]),
              callReadOnly("get-total-donations", [tokenIdHex]),
            ]);

            // Parse token URI
            let tokenUri = "";
            if (uriRes.okay && uriRes.result) {
              const decoded = decodeClarityValue(uriRes.result);
              if (typeof decoded === "string") tokenUri = decoded;
            }

            // Parse creator address — use the Stacks API events approach as fallback
            let creator = "";
            if (creatorRes.okay && creatorRes.result) {
              // For principals, we'll fetch from events instead for reliability
              // The hex decoding of principals is complex; use events API
            }

            // Parse total donations
            let totalDonations = 0n;
            if (donationsRes.okay && donationsRes.result) {
              const decoded = decodeClarityValue(donationsRes.result);
              if (typeof decoded === "bigint") totalDonations = decoded;
              else if (typeof decoded === "number") totalDonations = BigInt(decoded);
            }

            // Fetch creator from contract events for reliability
            if (!creator) {
              try {
                const eventsUrl = `${STACKS_API_URL}/extended/v1/contract/${CONTRACT_ADDRESS}.${CONTRACT_NAME}/events?limit=200`;
                const eventsRes = await fetch(eventsUrl);
                if (eventsRes.ok) {
                  const eventsData = await eventsRes.json();
                  const mintEvent = eventsData.results?.find(
                    (e: any) =>
                      e.contract_log?.value?.repr?.includes(`token-id: u${tokenId}`) &&
                      e.contract_log?.value?.repr?.includes('"mint"')
                  );
                  if (mintEvent) {
                    // Extract creator from the print event repr
                    const repr = mintEvent.contract_log.value.repr;
                    const creatorMatch = repr.match(/creator:\s*(S[A-Z0-9]+)/);
                    if (creatorMatch) creator = creatorMatch[1];
                  }
                }
              } catch {
                console.warn(`[useNFTs] Could not fetch creator for token ${tokenId} from events`);
              }
            }

            // Fetch IPFS metadata
            let metadata: Record<string, any> = {};
            if (tokenUri) {
              try {
                const res = await fetch(tokenUri);
                if (res.ok) {
                  metadata = await res.json();
                }
              } catch {
                console.warn(`[useNFTs] Failed to fetch metadata for token ${tokenId}`);
              }
            }

            return {
              tokenId,
              objectId: String(tokenId),
              metadata,
              owner: creator,
              totalDonations,
            } as NftData;
          } catch (err) {
            console.error(`[useNFTs] Error fetching NFT #${tokenId}:`, err);
            return null;
          }
        }
      );

      const results = (await Promise.all(nftPromises)).filter(Boolean) as NftData[];
      console.log("[useNFTs] Loaded", results.length, "NFTs");
      setNfts(results);
    } catch (err) {
      console.error("[useNFTs] Failed to fetch NFTs:", err);
      setError(err instanceof Error ? err.message : "Failed to load NFTs");
    } finally {
      setIsLoading(false);
    }
  }, [callReadOnly, decodeClarityValue]);

  useEffect(() => {
    fetchNFTs();
  }, [fetchNFTs]);

  return { nfts, totalSupply, isLoading, error, refetch: fetchNFTs };
}
