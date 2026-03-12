"use client";

import * as React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StacksWalletProvider } from "@/lib/wallet";

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <StacksWalletProvider>
        {children}
      </StacksWalletProvider>
    </QueryClientProvider>
  );
}
