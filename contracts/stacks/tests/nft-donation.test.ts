import { describe, it, expect, beforeEach } from "vitest";
import { Cl } from "@stacks/transactions";

// Tests for the nft-donation Clarity contract

describe("nft-donation contract", () => {
  const accounts = simnet.getAccounts();
  const deployer = accounts.get("deployer")!;
  const wallet1 = accounts.get("wallet_1")!;
  const wallet2 = accounts.get("wallet_2")!;

  it("should start with zero total supply", () => {
    const result = simnet.callReadOnlyFn(
      "nft-donation",
      "get-total-supply",
      [],
      deployer
    );
    expect(result.result).toBeOk(Cl.uint(0));
  });

  it("should mint an NFT successfully", () => {
    const tokenUri = "https://gateway.pinata.cloud/ipfs/QmTest123";
    const result = simnet.callPublicFn(
      "nft-donation",
      "mint-nft",
      [Cl.stringAscii(tokenUri)],
      wallet1
    );
    expect(result.result).toBeOk(Cl.uint(1));

    // Verify total supply incremented
    const supply = simnet.callReadOnlyFn(
      "nft-donation",
      "get-total-supply",
      [],
      deployer
    );
    expect(supply.result).toBeOk(Cl.uint(1));
  });

  it("should store token URI correctly", () => {
    const tokenUri = "https://gateway.pinata.cloud/ipfs/QmTest456";
    simnet.callPublicFn(
      "nft-donation",
      "mint-nft",
      [Cl.stringAscii(tokenUri)],
      wallet1
    );

    const result = simnet.callReadOnlyFn(
      "nft-donation",
      "get-token-uri",
      [Cl.uint(1)],
      deployer
    );
    expect(result.result).toBeOk(Cl.some(Cl.stringAscii(tokenUri)));
  });

  it("should track creator correctly", () => {
    simnet.callPublicFn(
      "nft-donation",
      "mint-nft",
      [Cl.stringAscii("https://example.com/meta")],
      wallet1
    );

    const result = simnet.callReadOnlyFn(
      "nft-donation",
      "get-creator",
      [Cl.uint(1)],
      deployer
    );
    expect(result.result).toBeOk(Cl.some(Cl.principal(wallet1)));
  });

  it("should accept donations and update totals", () => {
    // Mint an NFT first
    simnet.callPublicFn(
      "nft-donation",
      "mint-nft",
      [Cl.stringAscii("https://example.com/meta")],
      wallet1
    );

    // Donate from wallet2 to token #1
    const donationAmount = 1_000_000; // 1 STX in microSTX
    const result = simnet.callPublicFn(
      "nft-donation",
      "donate",
      [Cl.uint(1), Cl.uint(donationAmount)],
      wallet2
    );
    expect(result.result).toBeOk(Cl.bool(true));

    // Check total donations
    const total = simnet.callReadOnlyFn(
      "nft-donation",
      "get-total-donations",
      [Cl.uint(1)],
      deployer
    );
    expect(total.result).toBeOk(Cl.uint(donationAmount));
  });

  it("should reject zero donations", () => {
    simnet.callPublicFn(
      "nft-donation",
      "mint-nft",
      [Cl.stringAscii("https://example.com/meta")],
      wallet1
    );

    const result = simnet.callPublicFn(
      "nft-donation",
      "donate",
      [Cl.uint(1), Cl.uint(0)],
      wallet2
    );
    expect(result.result).toBeErr(Cl.uint(101));
  });

  it("should reject donations to non-existent tokens", () => {
    const result = simnet.callPublicFn(
      "nft-donation",
      "donate",
      [Cl.uint(999), Cl.uint(1_000_000)],
      wallet2
    );
    expect(result.result).toBeErr(Cl.uint(100));
  });

  it("should accumulate multiple donations", () => {
    simnet.callPublicFn(
      "nft-donation",
      "mint-nft",
      [Cl.stringAscii("https://example.com/meta")],
      wallet1
    );

    simnet.callPublicFn(
      "nft-donation",
      "donate",
      [Cl.uint(1), Cl.uint(1_000_000)],
      wallet2
    );
    simnet.callPublicFn(
      "nft-donation",
      "donate",
      [Cl.uint(1), Cl.uint(2_000_000)],
      wallet2
    );

    const total = simnet.callReadOnlyFn(
      "nft-donation",
      "get-total-donations",
      [Cl.uint(1)],
      deployer
    );
    expect(total.result).toBeOk(Cl.uint(3_000_000));
  });
});
