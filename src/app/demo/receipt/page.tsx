import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Decision receipt",
  description: "Inspect and export the deterministic quote-rail decision receipt.",
};

export default function DemoReceiptPage() {
  return <DashboardShell experience="demo" view="receipt" />;
}
