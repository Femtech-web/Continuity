import { buildDemoLaunchReview } from "@/integrations/meteora-launch-config";

export const dynamic = "force-dynamic";

export async function GET() {
  const review = await buildDemoLaunchReview();
  return Response.json(review, {
    headers: { "Cache-Control": "no-store" },
  });
}
