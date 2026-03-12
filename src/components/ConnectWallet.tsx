"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Wallet, LogOut, ExternalLink, Copy, Check } from "lucide-react";
import { shortenAddress, explorerAccountUrl } from "@/lib/stacks-utils";

export default function ConnectWallet() {
  const { address, connected, connect, disconnect } = useWallet();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleConnect = () => {
    try {
      toast({
        title: "🔐 Connecting Wallet...",
        description: "Opening Leather / Xverse wallet popup. Please approve.",
      });
      connect();
    } catch (err: any) {
      toast({
        title: "Connection Failed",
        description: err?.message || "Failed to connect wallet.",
        variant: "destructive",
      });
    }
  };

  const handleDisconnect = () => {
    disconnect();
    toast({
      title: "Wallet Disconnected",
      description: "Your Stacks wallet has been disconnected.",
    });
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast({
        title: "Address Copied",
        description: "Wallet address copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (connected && address) {
    return (
      <div className="flex items-center gap-2">
        <a
          href={explorerAccountUrl(address)}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-muted-foreground hover:text-primary transition-colors"
        >
          <ExternalLink className="h-3 w-3" />
        </a>
        <Button
          variant="outline"
          size="sm"
          onClick={handleCopyAddress}
          className="font-mono text-xs transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md"
        >
          {copied ? (
            <Check className="h-3 w-3 mr-1" />
          ) : (
            <Copy className="h-3 w-3 mr-1" />
          )}
          {shortenAddress(address)}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDisconnect}
          className="transition-all duration-200 ease-in-out hover:scale-105 hover:bg-destructive/10 hover:text-destructive"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          className="transition-all duration-300 ease-in-out hover:scale-105 hover:shadow-lg"
          size="sm"
          onClick={handleConnect}
        >
          <Wallet className="h-4 w-4 mr-2" />
          Connect Wallet
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Connect Stacks Wallet</DialogTitle>
          <DialogDescription>
            This app uses <strong>Leather</strong> or <strong>Xverse</strong> wallet
            to connect to the Stacks blockchain. MetaMask is <strong>not supported</strong>.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14 text-left transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-md hover:border-primary/50"
            onClick={handleConnect}
          >
            <span className="text-2xl">🔗</span>
            <div className="flex flex-col">
              <span className="font-medium">Connect with Leather / Xverse</span>
              <span className="text-xs text-muted-foreground">
                Opens wallet popup automatically
              </span>
            </div>
          </Button>
        </div>

        <div className="mt-6 rounded-lg border bg-muted/50 p-4 space-y-2">
          <h4 className="text-sm font-semibold">Supported Wallets</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Leather Wallet (recommended)</span>
              <a
                href="https://leather.io/install-extension"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                Install <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span>Xverse Wallet</span>
              <a
                href="https://www.xverse.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                Install <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <h4 className="text-sm font-semibold pt-2">⚠️ MetaMask NOT supported</h4>
          <p className="text-xs text-muted-foreground">
            Stacks uses its own wallet ecosystem. MetaMask (EVM) does not work here.
          </p>

          <h4 className="text-sm font-semibold pt-2">Stacks Testnet Faucet</h4>
          <div className="space-y-1 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Hiro Faucet</span>
              <a
                href="https://explorer.hiro.so/sandbox/faucet?chain=testnet"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                Get STX <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex items-center justify-between">
              <span>Stacks Faucet API</span>
              <a
                href="https://api.testnet.hiro.so/extended/v1/faucets/stx?address=YOUR_ADDRESS"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline flex items-center gap-1"
              >
                API ↗ <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
