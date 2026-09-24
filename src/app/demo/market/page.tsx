import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Market replay",
  description: "Inspect the affected DBC quote rail and successor configuration.",
};

export default function DemoMarketPage() {
  return <DashboardShell experience="demo" view="market" />;
}
