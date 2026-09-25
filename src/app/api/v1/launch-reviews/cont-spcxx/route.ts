import { readServerEnvironment } from "@/config/server-environment";
import { CompositeMarketReferenceAdapter } from "@/integrations/composite-market-reference";
import { integrationErrorResponse } from "@/integrations/integration-error";
import { JupiterQuoteAdapter } from "@/integrations/jupiter-quote";
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
    const marketReference = new CompositeMarketReferenceAdapter({
      jupiter: new JupiterQuoteAdapter(environment.jupiter),
      pyth,
    });
    const observation = await marketReference.getSpcxxUsdReference();
    const review = await buildContSpcxxLaunchReview({
      mode: "LIVE_COMPOSITE",
      observation,
    });

    return Response.json(review, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
