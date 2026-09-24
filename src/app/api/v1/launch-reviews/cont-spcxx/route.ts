import { readServerEnvironment } from "@/config/server-environment";
import { integrationErrorResponse } from "@/integrations/integration-error";
import { buildContSpcxxLaunchReview } from "@/integrations/meteora-launch-config";
import { PythProAdapter } from "@/integrations/pyth-pro";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const environment = readServerEnvironment();
    const pyth = new PythProAdapter({
      apiKey: environment.pyth.apiKey,
      baseUrl: environment.pyth.baseUrl,
      channel: environment.pyth.channel,
      feedId: environment.pyth.feedId,
      timeoutMs: environment.pyth.timeoutMs,
    });
    const observation = await pyth.getSpcxxUsdReference();
    const review = await buildContSpcxxLaunchReview({
      evaluatedAt: observation.provenance.retrievedAt,
      mode: "LIVE_PYTH_PRO",
      observation,
    });

    return Response.json(review, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
