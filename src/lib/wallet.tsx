"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import { AppConfig, UserSession, showConnect } from "@stacks/connect";
import { STACKS_NETWORK } from "@/constants";

// ─── Context Types ─────────────────────────────────────────────────

interface WalletContextType {
  address: string | null;
  connected: boolean;
  userSession: UserSession;
  connect: () => void;
  disconnect: () => void;
}

const appConfig = new AppConfig(["store_write", "publish_data"]);
const userSession = new UserSession({ appConfig });

const WalletContext = createContext<WalletContextType>({
  address: null,
  connected: false,
  userSession,
  connect: () => {},
  disconnect: () => {},
});

// ─── Provider ──────────────────────────────────────────────────────

export function StacksWalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  // Check session on mount
  useEffect(() => {
    if (userSession.isUserSignedIn()) {
      const userData = userSession.loadUserData();
      const addr =
        STACKS_NETWORK === "mainnet"
          ? userData.profile?.stxAddress?.mainnet
          : userData.profile?.stxAddress?.testnet;
      setAddress(addr || null);
      setConnected(true);
    }
  }, []);

  const connect = useCallback(() => {
    showConnect({
      appDetails: {
        name: "Fan Funding",
        icon: "/favicon.ico",
      },
      redirectTo: "/",
      onFinish: () => {
        if (userSession.isUserSignedIn()) {
          const userData = userSession.loadUserData();
          const addr =
            STACKS_NETWORK === "mainnet"
              ? userData.profile?.stxAddress?.mainnet
              : userData.profile?.stxAddress?.testnet;
          setAddress(addr || null);
          setConnected(true);
        }
      },
      userSession,
    });
  }, []);

  const disconnect = useCallback(() => {
    userSession.signUserOut("/");
    setAddress(null);
    setConnected(false);
  }, []);

  return (
    <WalletContext.Provider
      value={{
        address,
        connected,
        userSession,
        connect,
        disconnect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useWallet() {
  return useContext(WalletContext);
}
