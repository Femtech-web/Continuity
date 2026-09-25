import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Quote-rail rollover replay",
  description:
    "Replay why a CONT/SPACEX market is refused and how a CONT/SPCXx successor is prepared.",
};

export default function DemoLaunchPage() {
  return <DashboardShell experience="demo" view="market" />;
}
