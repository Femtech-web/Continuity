import { DashboardShell } from "@/features/dashboard/dashboard-shell";

interface PageProps { readonly params: Promise<{ readonly slug: string }>; }

export default async function AssetEvidencePage({ params }: PageProps) {
  const { slug } = await params;
  return <DashboardShell experience="demo" selectedAsset={slug} view="assetEvidence" />;
}
