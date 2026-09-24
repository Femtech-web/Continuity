import { readServerEnvironment } from "@/config/server-environment";
import { integrationErrorResponse } from "@/integrations/integration-error";
import { SolanaRpcAdapter } from "@/integrations/solana-rpc";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ mint: string }> },
) {
  try {
    const { mint } = await params;
    const environment = readServerEnvironment();
    const rpc = new SolanaRpcAdapter({
      cluster: environment.solana.cluster,
      rpcUrl: environment.solana.rpcUrl,
      timeoutMs: environment.solana.timeoutMs,
    });
    const observation = await rpc.getMint(mint);

    return Response.json(observation, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return integrationErrorResponse(error);
  }
}
