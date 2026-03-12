import { STX_DECIMALS, EXPLORER_BASE_URL, CONTRACT_ADDRESS, CONTRACT_NAME, STACKS_NETWORK } from "@/constants";

// ─── Stacks Utility Helpers ─────────────────────────────────────

/**
 * Shorten a Stacks address for display.
 * e.g. "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM" → "ST1PQH...PGZGM"
 */
export function shortenAddress(address: string): string {
  if (!address) return "";
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-5)}`;
}

/**
 * Format microSTX to a human-readable STX string.
 * Works with both bigint and number.
 */
export function formatEth(microStx: bigint | number): string {
  const val = BigInt(microStx);
  const divisor = BigInt(10 ** STX_DECIMALS);
  const whole = val / divisor;
  const frac = val % divisor;
  const fracStr = frac
    .toString()
    .padStart(STX_DECIMALS, "0")
    .slice(0, 6)
    .replace(/0+$/, "");
  return fracStr ? `${whole}.${fracStr}` : whole.toString();
}

/**
 * Parse a STX string to microSTX (bigint).
 * e.g. "1.5" → 1500000n
 */
export function parseEth(stx: string): bigint {
  const parts = stx.split(".");
  const whole = BigInt(parts[0] || "0") * BigInt(10 ** STX_DECIMALS);
  if (!parts[1]) return whole;
  const fracStr = parts[1].padEnd(STX_DECIMALS, "0").slice(0, STX_DECIMALS);
  return whole + BigInt(fracStr);
}

/**
 * Build an explorer URL for a transaction on Stacks.
 */
export function explorerTxUrl(txId: string): string {
  const networkParam = STACKS_NETWORK === "mainnet" ? "" : `?chain=${STACKS_NETWORK}`;
  return `${EXPLORER_BASE_URL}/txid/${txId}${networkParam}`;
}

/**
 * Build an explorer URL for an account/address on Stacks.
 */
export function explorerAccountUrl(address: string): string {
  const networkParam = STACKS_NETWORK === "mainnet" ? "" : `?chain=${STACKS_NETWORK}`;
  return `${EXPLORER_BASE_URL}/address/${address}${networkParam}`;
}

/**
 * Build an explorer URL for a contract on Stacks.
 */
export function explorerContractUrl(contractId?: string): string {
  const id = contractId || `${CONTRACT_ADDRESS}.${CONTRACT_NAME}`;
  const networkParam = STACKS_NETWORK === "mainnet" ? "" : `?chain=${STACKS_NETWORK}`;
  return `${EXPLORER_BASE_URL}/txid/${id}${networkParam}`;
}
