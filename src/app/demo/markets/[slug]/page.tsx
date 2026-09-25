import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Instrument lifecycle replay",
  description: "Inspect deterministic lifecycle evidence for one instrument.",
};

export default async function DemoAssetPage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();
  return (
    <DashboardShell
      experience="demo"
      selectedAsset={normalizedSlug}
      view="asset"
    />
  );
}
