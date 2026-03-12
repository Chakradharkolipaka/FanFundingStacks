// ─── Stacks Configuration ──────────────────────────────────────

/** Contract deployer address on Stacks — set via NEXT_PUBLIC_CONTRACT_ADDRESS env var */
export const CONTRACT_ADDRESS: string =
  process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

/** Contract name as deployed on Stacks */
export const CONTRACT_NAME: string =
  process.env.NEXT_PUBLIC_CONTRACT_NAME || "nft-donation";

/** Full contract identifier: <address>.<name> */
export const CONTRACT_ID = `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;

/** Stacks API base URL (testnet) */
export const STACKS_API_URL: string =
  process.env.NEXT_PUBLIC_STACKS_API_URL || "https://api.testnet.hiro.so";

/** Stacks explorer base URL (testnet) */
export const EXPLORER_BASE_URL = "https://explorer.hiro.so";

/** Shorthand used in the UI */
export const DONATION_TOKEN_SYMBOL = "STX";

/** Number of decimals for STX (microSTX → STX = 10^6) */
export const STX_DECIMALS = 6;

/** Network label shown in the UI */
export const NETWORK_NAME = "Stacks Testnet";

/** Stacks network for @stacks/connect: "testnet" | "mainnet" | "devnet" */
export const STACKS_NETWORK: "testnet" | "mainnet" | "devnet" =
  (process.env.NEXT_PUBLIC_STACKS_NETWORK as any) || "testnet";
