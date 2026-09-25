import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Agent treasury",
  description: "Track claimable market fees and agent operating reserves.",
};

export default function MainnetTreasuryPage() {
  return <DashboardShell experience="mainnet" view="treasury" />;
}
