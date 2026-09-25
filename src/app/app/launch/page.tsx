import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "CONT / SPCXx launch candidate",
  description:
    "Review the first-party Continuity token and SPCXx-quoted Meteora DBC market before any wallet approval.",
};

export default function MainnetLaunchPage() {
  return <DashboardShell experience="mainnet" view="market" />;
}
