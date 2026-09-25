import { readServerEnvironment } from "@/config/server-environment";
import { ClawPumpAdapter } from "@/integrations/clawpump";
import { CompositeMarketReferenceAdapter } from "@/integrations/composite-market-reference";
import {
  IntegrationError,
  integrationErrorResponse,
} from "@/integrations/integration-error";
import { buildContSpcxxLaunchReview } from "@/integrations/meteora-launch-config";
import { JupiterQuoteAdapter } from "@/integrations/jupiter-quote";
import { PythProAdapter } from "@/integrations/pyth-pro";
import { buildMeteoraLaunchPlan } from "@/transactions/meteora-launch-plan";

export const dynamic = "force-dynamic";

function parseAuthority(payload: unknown): string {
  if (
    typeof payload !== "object" ||
    payload === null ||
    !("authority" in payload) ||
    typeof payload.authority !== "string"
  ) {
    throw new IntegrationError(
      "INVALID_ADDRESS",
      "A connected operator wallet is required to prepare the launch transaction.",
      { retryable: false, status: 400 },
    );
  }
  return payload.authority;
}

export async function POST(request: Request) {
  try {
    const authority = parseAuthority(await request.json());
    const environment = readServerEnvironment();
    if (!environment.cont.metadataUri) {
      throw new IntegrationError(
        "CONFIG_REQUIRED",
        "CONT_TOKEN_METADATA_URI is required before a mainnet launch transaction can be built.",
        { retryable: false, status: 503 },
      );
    }

    const clawpump = new ClawPumpAdapter({
      agentId: environment.clawpump.agentId,
      apiKey: environment.clawpump.apiKey,
      baseUrl: environment.clawpump.baseUrl,
      timeoutMs: environment.clawpump.timeoutMs,
    });
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
    const [clawPumpAuthority, observation] = await Promise.all([
      clawpump.resolveLaunchAuthority(),
      marketReference.getSpcxxUsdReference(),
    ]);
    const review = await buildContSpcxxLaunchReview({
      mode: "LIVE_COMPOSITE",
      observation,
    });
    const plan = await buildMeteoraLaunchPlan({
      authority,
      clawpump: clawPumpAuthority,
      metadataUri: environment.cont.metadataUri,
      review,
      rpcUrl: environment.solana.rpcUrl,
      timeoutMs: environment.solana.timeoutMs,
    });

    return Response.json(plan, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
