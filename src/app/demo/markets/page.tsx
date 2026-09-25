import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Market registry replay",
  description:
    "Explore the deterministic market lifecycle registry without a wallet.",
};

export default function DemoMarketsPage() {
  return <DashboardShell experience="demo" view="markets" />;
}

