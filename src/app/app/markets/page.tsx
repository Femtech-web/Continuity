import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Markets",
  description:
    "Follow stock coverage, protected launches, and past lifecycle changes.",
};

export default function MainnetMarketsPage() {
  return <DashboardShell experience="mainnet" view="markets" />;
}
