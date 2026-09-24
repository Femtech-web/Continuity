import { readServerEnvironment } from "@/config/server-environment";
import { integrationErrorResponse } from "@/integrations/integration-error";
import { MeteoraDbcAdapter } from "@/integrations/meteora-dbc";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const environment = readServerEnvironment();
    const meteora = new MeteoraDbcAdapter({
      cluster: environment.solana.cluster,
      configAddress: environment.meteora.configAddress,
      poolAddress: environment.meteora.poolAddress,
      rpcUrl: environment.solana.rpcUrl,
      timeoutMs: environment.solana.timeoutMs,
    });
    const observation = await meteora.attestSpcxxQuoteRail();

    return Response.json(observation, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
