import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Sentinel activity",
  description: "Inspect Continuity agent access, decisions, and persisted evidence.",
};

export default function MainnetActivityPage() {
  return <DashboardShell experience="mainnet" view="receipt" />;
}
