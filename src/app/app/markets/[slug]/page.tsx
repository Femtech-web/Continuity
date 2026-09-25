import type { Metadata } from "next";
import { DashboardShell } from "@/features/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Instrument lifecycle",
  description: "Inspect a stock token's lifecycle state and protection evidence.",
};

export default async function MainnetAssetPage({
  params,
}: {
  readonly params: Promise<{ readonly slug: string }>;
}) {
  const { slug } = await params;
  const normalizedSlug = slug.toLowerCase();
  return (
    <DashboardShell
      experience="mainnet"
      selectedAsset={normalizedSlug}
      view="asset"
    />
  );
}
