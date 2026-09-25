import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Decision activity",
  description: "Inspect the captured Continuity decision and portable receipt.",
};

export default function DemoActivityPage() {
  return <DashboardShell experience="demo" view="receipt" />;
}
