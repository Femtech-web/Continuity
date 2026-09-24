"use client";

import { ClientProvider } from "@solana/react";
import type { ReactNode } from "react";
import { WalletAccessProvider } from "@/features/wallet/wallet-access";
import { solanaClient } from "@/features/wallet/solana-client";

export function Providers({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ClientProvider client={solanaClient}>
      <WalletAccessProvider>{children}</WalletAccessProvider>
    </ClientProvider>
  );
}
