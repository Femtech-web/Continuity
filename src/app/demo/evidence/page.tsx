import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Lifecycle evidence",
  description: "Inspect the source-backed lifecycle manifest and exact mint identities.",
};

export default function DemoEvidencePage() {
  return <DashboardShell experience="demo" view="evidence" />;
}
