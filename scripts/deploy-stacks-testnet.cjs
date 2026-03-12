/**
 * deploy-stacks-testnet.js
 * Deploys the nft-donation.clar contract to Stacks testnet.
 *
 * Usage:
 *   node scripts/deploy-stacks-testnet.js <YOUR_STACKS_PRIVATE_KEY_HEX>
 *
 * How to get your private key from Leather wallet:
 *   1. Open Leather -> Settings -> Show Secret Key (12/24 words)
 *   2. Then use: https://stacks-key-gen.vercel.app/ or stx CLI to derive hex key
 *   OR use `stx make_keychain` from @stacks/cli
 */

const fs = require("fs");
const path = require("path");
const {
  makeContractDeploy,
  broadcastTransaction,
  AnchorMode,
  ClarityVersion,
} = require("@stacks/transactions");
const { StacksTestnet } = require("@stacks/network");

const PRIVATE_KEY = process.argv[2];
if (!PRIVATE_KEY) {
  console.log(`
==========================================================
  Missing private key!

  Usage:
    node scripts/deploy-stacks-testnet.js <PRIVATE_KEY_HEX>

  To get your private key hex:
    npm install -g @stacks/cli
    stx make_keychain -t
    (copy the "privateKey" field)

  OR derive from your Leather wallet mnemonic.
==========================================================
`);
  process.exit(1);
}

async function deploy() {
  const contractPath = path.join(
    __dirname,
    "..",
    "contracts",
    "stacks",
    "contracts",
    "nft-donation.clar"
  );
  const codeBody = fs.readFileSync(contractPath, "utf-8");
  console.log("Contract loaded:", codeBody.length, "bytes");

  const network = new StacksTestnet();

  console.log("Building deploy transaction...");
  const txOptions = {
    codeBody,
    contractName: "nft-donation",
    senderKey: PRIVATE_KEY,
    network,
    anchorMode: AnchorMode.Any,
    clarityVersion: ClarityVersion.Clarity3,
    fee: 500000, // 0.5 STX (generous for deploy)
  };

  const transaction = await makeContractDeploy(txOptions);
  console.log("Broadcasting to Stacks testnet...");

  const result = await broadcastTransaction({ transaction, network });

  if (typeof result === "string") {
    // Success - txid returned
    console.log(`
==========================================================
  Transaction broadcast!
  TX ID: ${result}
  Explorer: https://explorer.hiro.so/txid/${result}?chain=testnet

  Waiting for confirmation (10-30 min on testnet)...
==========================================================
`);
    await pollForConfirmation(result);
  } else if (result.txid) {
    console.log(`
==========================================================
  Transaction broadcast!
  TX ID: ${result.txid}
  Explorer: https://explorer.hiro.so/txid/${result.txid}?chain=testnet

  Waiting for confirmation (10-30 min on testnet)...
==========================================================
`);
    await pollForConfirmation(result.txid);
  } else {
    console.error("Broadcast failed:");
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  }
}

async function pollForConfirmation(txId) {
  for (let i = 0; i < 120; i++) {
    await new Promise((r) => setTimeout(r, 15000));
    try {
      const resp = await fetch(
        `https://api.testnet.hiro.so/extended/v1/tx/${txId}`
      );
      const data = await resp.json();
      console.log(`  [${i + 1}] Status: ${data.tx_status}`);

      if (data.tx_status === "success") {
        const contractId =
          data.smart_contract?.contract_id ||
          `${data.sender_address}.nft-donation`;
        console.log(`
==========================================================
  CONTRACT DEPLOYED SUCCESSFULLY!

  Contract ID: ${contractId}
  Sender: ${data.sender_address}

  Now update your .env.local:
    NEXT_PUBLIC_CONTRACT_ADDRESS=${data.sender_address}
==========================================================
`);
        return;
      } else if (
        data.tx_status === "abort_by_response" ||
        data.tx_status === "abort_by_post_condition"
      ) {
        console.error("Transaction failed:", data.tx_status);
        console.error("Result:", JSON.stringify(data.tx_result, null, 2));
        process.exit(1);
      }
    } catch (e) {
      console.log(`  [${i + 1}] Checking... (${e.message})`);
    }
  }
  console.log("Timed out. Check the explorer manually.");
}

deploy().catch((err) => {
  console.error("Deploy error:", err.message || err);
  process.exit(1);
});
