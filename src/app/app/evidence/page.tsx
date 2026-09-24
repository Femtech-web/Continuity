import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Mainnet lifecycle evidence",
  description: "Inspect source proof and exact mint identities before market action.",
};

export default function MainnetEvidencePage() {
  return <DashboardShell experience="mainnet" view="evidence" />;
}
