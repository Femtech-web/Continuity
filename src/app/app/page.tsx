import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Mainnet console",
  description:
    "Inspect lifecycle manifests and stock-quoted market controls on Solana mainnet.",
};

export default function AppPage() {
  return <DashboardShell experience="mainnet" view="overview" />;
}
