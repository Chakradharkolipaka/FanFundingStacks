#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# Deploy the FanFunding Move module to Aptos Testnet
# ─────────────────────────────────────────────────────────────
#
# Prerequisites:
#   1. Install the Aptos CLI: https://aptos.dev/tools/aptos-cli/install
#   2. Fund your account with test APT:
#        aptos account fund-with-faucet --account default --url https://fullnode.testnet.aptoslabs.com/v1
#
# Usage:
#   cd contracts/aptos
#   bash ../../scripts/deploy-aptos.sh
#
# Or from the project root:
#   bash scripts/deploy-aptos.sh
# ─────────────────────────────────────────────────────────────

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MOVE_DIR="$PROJECT_ROOT/contracts/aptos"

echo "═══════════════════════════════════════════════════════"
echo "  FanFunding Aptos Deployment"
echo "═══════════════════════════════════════════════════════"
echo ""

# ── Step 0: Check that the Aptos CLI is installed ──
if ! command -v aptos &>/dev/null; then
  echo "❌ 'aptos' CLI not found."
  echo "   Install it: https://aptos.dev/tools/aptos-cli/install"
  echo ""
  echo "   Quick install (Linux/macOS):"
  echo "     curl -fsSL https://aptos.dev/scripts/install_cli.py | python3"
  exit 1
fi

echo "✅ Aptos CLI found: $(aptos --version)"
echo ""

# ── Step 1: Initialize account if needed ──
if [ ! -f "$MOVE_DIR/.aptos/config.yaml" ]; then
  echo "⚙️  No .aptos/config.yaml found — initializing a new profile..."
  echo "   Network: testnet"
  echo ""
  (cd "$MOVE_DIR" && aptos init --network testnet)
  echo ""
fi

# ── Step 2: Show account info ──
echo "📋 Account info:"
(cd "$MOVE_DIR" && aptos account lookup-address) || true
echo ""

# ── Step 3: Fund account (optional, will skip if already funded) ──
read -rp "💧 Fund account from testnet faucet? [y/N]: " FUND
if [[ "$FUND" =~ ^[Yy]$ ]]; then
  (cd "$MOVE_DIR" && aptos account fund-with-faucet --account default)
  echo ""
fi

# ── Step 4: Compile ──
echo "🔨 Compiling Move module..."
(cd "$MOVE_DIR" && aptos move compile)
echo ""

# ── Step 5: Run unit tests (optional) ──
read -rp "🧪 Run Move unit tests? [y/N]: " TEST
if [[ "$TEST" =~ ^[Yy]$ ]]; then
  (cd "$MOVE_DIR" && aptos move test)
  echo ""
fi

# ── Step 6: Publish ──
echo "🚀 Publishing module to testnet..."
(cd "$MOVE_DIR" && aptos move publish --assume-yes)
echo ""

# ── Step 7: Initialize the collection ──
read -rp "📦 Call init_collection now? [Y/n]: " INIT
if [[ ! "$INIT" =~ ^[Nn]$ ]]; then
  echo "Calling init_collection..."
  (cd "$MOVE_DIR" && aptos move run \
    --function-id "default::nft_donation::init_collection" \
    --assume-yes)
  echo ""
fi

echo "═══════════════════════════════════════════════════════"
echo "  ✅ Deployment complete!"
echo ""
echo "  Next steps:"
echo "  1. Copy your account address"
echo "  2. Paste it into .env.local as NEXT_PUBLIC_MODULE_ADDRESS"
echo "  3. Run: npm run dev"
echo "═══════════════════════════════════════════════════════"
