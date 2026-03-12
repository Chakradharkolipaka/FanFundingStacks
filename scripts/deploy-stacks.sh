#!/usr/bin/env bash
# ─── deploy-stacks.sh ───────────────────────────────────────────
# Deploy the FanFunding Clarity contract to Stacks testnet.
#
# Prerequisites:
#   1. Install Clarinet: https://docs.hiro.so/clarinet/getting-started
#   2. Install Stacks CLI (optional): npm install -g @stacks/cli
#   3. Have a funded Stacks testnet account
#
# Usage:
#   cd contracts/stacks
#   clarinet check          # Validate the contract
#   clarinet test           # Run unit tests
#   clarinet console        # Interactive REPL
#
# To deploy to testnet, use the Hiro Platform or Stacks CLI:
#   https://platform.hiro.so/
#
# After deploying, update your .env.local:
#   NEXT_PUBLIC_CONTRACT_ADDRESS=<your-deployer-STX-address>
#   NEXT_PUBLIC_CONTRACT_NAME=nft-donation
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONTRACT_DIR="$SCRIPT_DIR/../contracts/stacks"

echo "═══════════════════════════════════════════════════════"
echo "  FanFunding — Stacks / Clarity Deployment Helper"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if Clarinet is installed
if ! command -v clarinet &> /dev/null; then
  echo "❌ Clarinet is not installed."
  echo ""
  echo "Install Clarinet:"
  echo "  brew install hirosystems/tap/clarinet   # macOS"
  echo "  # Or download from: https://github.com/hirosystems/clarinet/releases"
  echo ""
  exit 1
fi

echo "✅ Clarinet found: $(clarinet --version)"
echo ""

cd "$CONTRACT_DIR"

echo "── Step 1: Checking contract syntax ──"
clarinet check
echo "✅ Contract syntax OK"
echo ""

echo "── Step 2: Running unit tests ──"
clarinet test
echo "✅ All tests passed"
echo ""

echo "═══════════════════════════════════════════════════════"
echo "  Contract is ready for deployment!"
echo ""
echo "  To deploy to Stacks testnet:"
echo ""
echo "  Option A — Hiro Platform (recommended):"
echo "    1. Go to https://platform.hiro.so/"
echo "    2. Create a project & upload contracts/nft-donation.clar"
echo "    3. Deploy to testnet"
echo ""
echo "  Option B — Stacks CLI:"
echo "    stx deploy_contract nft-donation \\"
echo "      contracts/nft-donation.clar \\"
echo "      0 0 <your-private-key> -t"
echo ""
echo "  After deploying, set these in .env.local:"
echo "    NEXT_PUBLIC_CONTRACT_ADDRESS=<your-deployer-STX-address>"
echo "    NEXT_PUBLIC_CONTRACT_NAME=nft-donation"
echo "═══════════════════════════════════════════════════════"
