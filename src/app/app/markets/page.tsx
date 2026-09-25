import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Market lifecycle registry",
  description:
    "Scan current and historical PreStocks instruments for lifecycle risk.",
};

export default function MainnetMarketsPage() {
  return <DashboardShell experience="mainnet" view="markets" />;
}

