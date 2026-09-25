import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Treasury preview",
  description: "Preview the protected-market treasury boundary without moving funds.",
};

export default function DemoTreasuryPage() {
  return <DashboardShell experience="demo" view="treasury" />;
}
