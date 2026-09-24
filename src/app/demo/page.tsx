import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Wallet-free lifecycle replay",
  description:
    "Replay a deterministic quote-asset lifecycle event without connecting a wallet.",
};

export default function DemoPage() {
  return <DashboardShell experience="demo" view="overview" />;
}
