import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Create a protected market",
  description:
    "Launch an agent token against a verified stock token and keep it under Sentinel protection.",
};

export default function MainnetLaunchPage() {
  return <DashboardShell experience="mainnet" view="market" />;
}
