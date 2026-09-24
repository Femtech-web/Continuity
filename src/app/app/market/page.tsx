import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Mainnet market",
  description: "Inspect a quote rail with live, read-only Solana mint provenance.",
};

export default function MainnetMarketPage() {
  return <DashboardShell experience="mainnet" view="market" />;
}
