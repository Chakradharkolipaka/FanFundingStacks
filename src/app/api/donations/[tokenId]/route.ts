import { NextResponse } from "next/server";

const STACKS_API_URL =
  process.env.NEXT_PUBLIC_STACKS_API_URL || "https://api.testnet.hiro.so";
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";
const CONTRACT_NAME = process.env.NEXT_PUBLIC_CONTRACT_NAME || "nft-donation";

export const dynamic = "force-dynamic";

/**
 * GET /api/donations/[tokenId]
 * Fetches donation events for a specific NFT from the Stacks contract events.
 *
 * On Stacks, we query contract log events (print statements) from the Hiro API
 * and filter for donation events matching the requested tokenId.
 */
export async function GET(
  request: Request,
  { params }: { params: { tokenId: string } }
) {
  try {
    const tokenId = parseInt(params.tokenId);
    if (isNaN(tokenId)) {
      return NextResponse.json({ error: "Invalid token ID" }, { status: 400 });
    }

    if (!CONTRACT_ADDRESS) {
      return NextResponse.json({ error: "Contract address not configured" }, { status: 500 });
    }

    // Query contract events from the Hiro Stacks API
    const eventsUrl = `${STACKS_API_URL}/extended/v1/contract/${CONTRACT_ADDRESS}.${CONTRACT_NAME}/events?limit=200`;

    const eventsRes = await fetch(eventsUrl);

    if (!eventsRes.ok) {
      const txt = await eventsRes.text();
      console.error("Failed to fetch events:", eventsRes.status, txt);
      return NextResponse.json({ error: "Failed to fetch events" }, { status: 502 });
    }

    const eventsData = await eventsRes.json();
    const events = eventsData.results || [];

    // Filter for donation events matching the tokenId
    const donations: Array<{
      donor: string;
      amount: string;
      creator: string;
      txId: string;
    }> = [];

    for (const event of events) {
      if (!event.contract_log?.value?.repr) continue;

      const repr = event.contract_log.value.repr;

      // Check if this is a donation event for the requested tokenId
      if (
        repr.includes('"donation"') &&
        repr.includes(`token-id: u${tokenId}`)
      ) {
        // Parse fields from the repr string
        // Example repr: (tuple (event "donation") (token-id u1) (donor ST...) (amount u1000000) (creator ST...))
        const donorMatch = repr.match(/donor:\s*(S[A-Z0-9]+)/);
        const amountMatch = repr.match(/amount:\s*u(\d+)/);
        const creatorMatch = repr.match(/creator:\s*(S[A-Z0-9]+)/);

        donations.push({
          donor: donorMatch?.[1] || "unknown",
          amount: amountMatch?.[1] || "0",
          creator: creatorMatch?.[1] || "unknown",
          txId: event.tx_id || "",
        });
      }
    }

    return NextResponse.json(donations);
  } catch (error) {
    console.error("Error fetching donations:", error);
    return NextResponse.json(
      { error: "Failed to fetch donations" },
      { status: 500 }
    );
  }
}
