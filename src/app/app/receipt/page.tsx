import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Mainnet decision receipt",
  description: "Inspect portable proof for the current quote-rail decision.",
};

export default function MainnetReceiptPage() {
  return <DashboardShell experience="mainnet" view="receipt" />;
}
